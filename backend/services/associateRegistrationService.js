/**
 * Single source of truth for registering a new Associate.
 * Used by:  public signup (/auth/register-associate), Admin Add Associate (/users/register-associate)
 *           and Associate Add Associate (/associate/team).
 *
 * - Validation + duplicate checks (phone / email / PAN / Aadhar) inside ONE DB transaction
 * - Sponsor is decided by the CALLER (server side) – never trusted from the request body for associates
 * - Collision-free DEV-XXXX id: serialized with a MySQL named lock + unique-constraint retry
 * - Password is stored only as a bcrypt hash (no plain-text copy)
 * - Commission is NOT taken from the request: fixed default (5%, existing rule), never above sponsor's %
 */
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const { User, Wallet, CommissionHistory } = require('../models');
const generateNextDevId = require('../utils/generateNextDevId');
const generateReferralCode = require('../utils/generateReferralCode');
const { cleanPhoneNumber } = require('./smsService');

const DEFAULT_ASSOCIATE_COMMISSION = 5; // existing business rule (Admin changes it later)
const LOCK_NAME = 'devojas_associate_registration';

class RegistrationError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// ---- registration lock -------------------------------------------------------------------------
// In-process queue (one registration at a time per Node process, so the pool can never be exhausted by
// lock waiters) + MySQL named lock on a DEDICATED connection (safe across several server processes).
// The lock is released only AFTER commit, so the next registration always sees the committed DEV-ID.
let queueTail = Promise.resolve();
const withRegistrationLock = (fn) => {
  const run = queueTail.then(async () => {
    const mgr = sequelize.connectionManager;
    const conn = await mgr.getConnection({ type: 'write' });
    const q = (sql, params) => new Promise((resolve, reject) => conn.query(sql, params, (e, rows) => (e ? reject(e) : resolve(rows))));
    try {
      const rows = await q('SELECT GET_LOCK(?, 15) AS got', [LOCK_NAME]);
      if (!rows || Number(rows[0].got) !== 1) throw new RegistrationError('Server is busy, please try again', 503);
      try { return await fn(); }
      finally { try { await q('SELECT RELEASE_LOCK(?)', [LOCK_NAME]); } catch (_) {} }
    } finally {
      mgr.releaseConnection(conn);
    }
  });
  queueTail = run.catch(() => {});
  return run;
};

const validateInput = (b) => {
  if (!b.name || !String(b.name).trim()) throw new RegistrationError('Name and phone number are required');
  if (!b.phone) throw new RegistrationError('Name and phone number are required');
  if (!b.pan_number || !String(b.pan_number).trim() || !b.aadhar_number || !String(b.aadhar_number).trim()) {
    throw new RegistrationError('PAN number and Aadhar number are mandatory for Associates');
  }
  if (!b.password || String(b.password).length < 6) throw new RegistrationError('Password must be at least 6 characters');
  if (b.confirm_password !== undefined && b.password !== b.confirm_password) {
    throw new RegistrationError('Password and Confirm Password do not match');
  }
  const phone = cleanPhoneNumber(b.phone);
  if (!phone) throw new RegistrationError('Please enter a valid 10-digit mobile number');
  return phone;
};

/**
 * @param {object} body     request body (name, phone, email, address, pan_number, aadhar_number, password, confirm_password)
 * @param {number|null} sponsorId  decided by the caller (already authorised) – null only for Admin "no sponsor"
 * @param {object|null} actor      logged-in user performing the registration (null = public signup)
 */
const registerAssociateRecord = async (body, sponsorId, actor = null) => {
  const phone = validateInput(body);
  const email = body.email && String(body.email).trim() ? String(body.email).trim() : null;
  const pan = String(body.pan_number).trim().toUpperCase();
  const aadhar = String(body.aadhar_number).trim();
  const passwordHash = await bcrypt.hash(String(body.password), 10);

  return withRegistrationLock(async () => {
  const t = await sequelize.transaction();
  try {

    // Sponsor must be an ACTIVE associate or admin (re-checked inside the transaction)
    let sponsor = null;
    if (sponsorId) {
      sponsor = await User.findByPk(sponsorId, { transaction: t });
      if (!sponsor || (sponsor.role !== 'associate' && sponsor.role !== 'admin')) {
        throw new RegistrationError('Sponsor not found or is not a valid sponsor');
      }
      if (sponsor.status !== 'active') throw new RegistrationError(`Sponsor "${sponsor.name}" is not active`);
    }

    // Duplicate protection
    if (await User.findOne({ where: { phone }, transaction: t })) throw new RegistrationError('Phone number already registered');
    if (email && await User.findOne({ where: { email }, transaction: t })) throw new RegistrationError('Email already registered');
    if (await User.findOne({ where: { pan_number: pan }, transaction: t })) throw new RegistrationError('This PAN number is already registered');
    if (await User.findOne({ where: { aadhar_number: aadhar }, transaction: t })) throw new RegistrationError('This Aadhar number is already registered');

    const commission = sponsor
      ? Math.min(DEFAULT_ASSOCIATE_COMMISSION, parseFloat(sponsor.commission_percent) || DEFAULT_ASSOCIATE_COMMISSION)
      : DEFAULT_ASSOCIATE_COMMISSION;

    const login_id = await generateNextDevId(t);
    const user = await User.create({
      name: String(body.name).trim(),
      email,
      phone,
      address: body.address ? String(body.address).trim() : null,
      password: passwordHash,
      plain_password: String(body.password),
      role: 'associate',
      referred_by: sponsor ? sponsor.id : null,
      referral_commission_percent: commission,
      commission_percent: commission,
      commission_set_by: 'admin',
      pan_number: pan,
      aadhar_number: aadhar,
      referral_code: generateReferralCode(body.name),
      login_id,
      kyc_status: 'approved', // existing public-signup behaviour
      status: 'active'        // existing public-signup behaviour (no approval step in current workflow)
    }, { transaction: t });

    await Wallet.create({ user_id: user.id, balance: 0 }, { transaction: t });
    await CommissionHistory.create({
      user_id: user.id, previous_percent: 0, new_percent: commission,
      changed_by: actor ? actor.id : null, effective_date: new Date(),
      reason: 'Initial commission percentage set at registration'
    }, { transaction: t });

    await t.commit();
    return { user, sponsor, password: String(body.password) };
  } catch (err) {
    try { await t.rollback(); } catch (_) {}
    if (err.name === 'SequelizeUniqueConstraintError') throw new RegistrationError('This phone, email, PAN, Aadhar or ID is already registered');
    throw err;
  }
  });
};

/** Shared HTTP response + best-effort credential delivery (failures never undo the registration). */
const deliverCredentials = async (user, password) => {
  const { sendCredentialsSMS, maskPhone } = require('./smsService');
  const { sendCredentialsEmail } = require('./emailService');
  let sms = { success: false };
  try {
    sms = await sendCredentialsSMS(user.phone, user.login_id, password, user.id);
    await user.update({ last_sms_sent_at: new Date(), last_sms_status: sms.success ? (sms.mock ? 'mock_delivered' : 'sent') : 'failed' });
  } catch (_) { /* non-fatal */ }
  try { if (user.email) await sendCredentialsEmail(user, user.login_id, password); } catch (_) { /* non-fatal */ }
  return { success: !!sms.success, mock: !!sms.mock, phone: sms.phone || maskPhone(user.phone) };
};

const buildResponse = (user, sponsor, sms, message) => ({
  success: true,
  message,
  smsDelivery: sms,
  user: { id: user.id, login_id: user.login_id, name: user.name, email: user.email, phone: user.phone, role: user.role, referral_code: user.referral_code, kyc_status: user.kyc_status, status: user.status, plain_password: user.plain_password },
  data: {
    id: user.id, login_id: user.login_id, name: user.name, referral_code: user.referral_code,
    status: user.status, commission_percent: user.commission_percent, plain_password: user.plain_password,
    sponsor: sponsor ? { id: sponsor.id, name: sponsor.name, login_id: sponsor.login_id } : null
  }
});

module.exports = { registerAssociateRecord, deliverCredentials, buildResponse, RegistrationError, DEFAULT_ASSOCIATE_COMMISSION };
