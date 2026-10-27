const bcrypt = require('bcryptjs');
const { User, Wallet } = require('../models');
const generateToken = require('../utils/generateToken');
const generateReferralCode = require('../utils/generateReferralCode');
const { Op } = require('sequelize');
const { sendCredentialsEmail } = require('../services/emailService');
const { sendCredentialsSMS, cleanPhoneNumber, maskPhone } = require('../services/smsService');
const generateNextDevId = require('../utils/generateNextDevId');
const { registerAssociateRecord, deliverCredentials, buildResponse, RegistrationError } = require('../services/associateRegistrationService');

// Helper: generate sequential login_id like DEV-0002
const generateLoginId = async () => await generateNextDevId();

// @desc Register new user (admin creates admin, or public client signup)
// @route POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, referred_by, pan_number, aadhar_number, referral_commission_percent, address } = req.body;

    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin registration is not allowed via this endpoint.' });
    }

    const validPhone = cleanPhoneNumber(phone);
    if (!validPhone) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    }

    const existingPhone = await User.findOne({ where: { phone: validPhone } });
    if (existingPhone) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }
    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const referral_code = generateReferralCode(name);

    const user = await User.create({
      name,
      email: email || null,
      phone,
      address: address || null,
      password: hashedPassword,
      plain_password: password,
      role: role || 'client',
      referred_by: referred_by || null,
      referral_commission_percent: referral_commission_percent || null,
      commission_percent: referral_commission_percent || null,
      pan_number: pan_number || null,
      aadhar_number: aadhar_number || null,
      referral_code,
      kyc_status: 'not_submitted',
      status: role === 'accounts' ? 'pending_approval' : 'active'
    });

    // Auto-generate login_id after creation
    const login_id = await generateLoginId();
    await user.update({ login_id });

    // Auto create wallet for the user
    await Wallet.create({ user_id: user.id, balance: 0 });

    // Send SMS credentials to the registered mobile number
    const smsResult = await sendCredentialsSMS(validPhone, login_id, password, user.id);
    await user.update({
      last_sms_sent_at: new Date(),
      last_sms_status: smsResult.success ? (smsResult.mock ? 'mock_delivered' : 'sent') : 'failed'
    });

    // Send email immediately if password and email are provided
    if (user.email && password) {
      await sendCredentialsEmail(user, login_id, password);
    }

    const token = role === 'accounts' ? null : generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, login_id: user.login_id, name: user.name, email: user.email, role: user.role, referral_code: user.referral_code }
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Public "Sign Up as Associate"
//        Associate fills Name/Phone/Email/PAN/Aadhar/Address/Password,
//        optionally provides sponsor's referral code.
//        Account is set to kyc_status='pending' — admin must approve before login.
// @route POST /api/auth/register-associate
const registerAssociate = async (req, res, next) => {
  try {
    const { sponsor_code } = req.body;
    if (!sponsor_code || !String(sponsor_code).trim()) {
      return res.status(400).json({ success: false, message: 'Sponsor / Referral Code is required for Associate registration' });
    }
    const raw = String(sponsor_code).trim();
    const rawUpper = raw.toUpperCase();

    const sponsorUser = await User.findOne({
      where: {
        [Op.or]: [
          { login_id: raw },
          { login_id: rawUpper },
          { referral_code: raw },
          { referral_code: rawUpper }
        ],
        role: { [Op.in]: ['associate', 'admin'] }
      }
    });

    if (!sponsorUser) {
      return res.status(400).json({ success: false, message: 'Sponsor code not found. Please check and try again.' });
    }

    if (sponsorUser.status !== 'active') {
      return res.status(400).json({ success: false, message: `Sponsor "${sponsorUser.name}" is not active.` });
    }

    const { user, sponsor, password } = await registerAssociateRecord(req.body, sponsorUser.id, null);
    const sms = await deliverCredentials(user, password);
    res.status(201).json(buildResponse(user, sponsor, sms, 'Registration successful. Your account is ready - you can log in now.'));
  } catch (error) {
    if (error instanceof RegistrationError) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
};

// @desc Login user (via email OR phone OR login_id)
// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const identifier = req.body.email || req.body.identifier || req.body.login_id || req.body.phone;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/phone/login ID and password.' });
    }

    const trimmed = String(identifier).trim();
    const upper = trimmed.toUpperCase();

    const searchConditions = [
      { email: trimmed },
      { phone: trimmed },
      { login_id: trimmed },
      { login_id: upper },
      { referral_code: trimmed },
      { referral_code: upper }
    ];

    // Support admin aliases/shorthand (e.g. 'admin' or 'admin@devojas.com') without changing DB credentials
    if (trimmed.toLowerCase() === 'admin' || trimmed.toLowerCase() === 'admin@devojas.com') {
      searchConditions.push(
        { email: 'admin@devojasrealtors.in' },
        { login_id: 'DEV-0001' }
      );
    }

    const user = await User.findOne({
      where: {
        [Op.or]: searchConditions
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your ID/email/phone and password.' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact admin.' });
    }

    // Users must be approved before they can login if they are in pending_approval state
    if (user.status === 'pending_approval') {
      return res.status(403).json({ success: false, message: 'Your account request is pending admin approval.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your password.' });
    }

    // Track last login
    user.last_login_at = new Date();
    await user.save();

    const token = generateToken(user.id);

    let sponsor = null;
    if (user.referred_by) {
      const sp = await User.findByPk(user.referred_by, {
        attributes: ['id', 'name', 'login_id', 'phone', 'email']
      });
      if (sp) sponsor = { id: sp.id, name: sp.name, login_id: sp.login_id, phone: sp.phone, email: sp.email };
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        login_id: user.login_id,
        associateId: user.login_id,
        referred_by: user.referred_by,
        referredById: sponsor ? sponsor.login_id : null,
        referredByName: sponsor ? sponsor.name : null,
        sponsor,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        commission_percent: user.commission_percent,
        referral_commission_percent: user.referral_commission_percent,
        referral_code: user.referral_code,
        last_login_at: user.last_login_at,
        kyc_status: user.kyc_status,
        profile_image: user.profile_image
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get logged in user profile
// @route GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    let sponsor = null;
    if (req.user.referred_by) {
      const sp = await User.findByPk(req.user.referred_by, {
        attributes: ['id', 'name', 'login_id', 'phone', 'email']
      });
      if (sp) sponsor = { id: sp.id, name: sp.name, login_id: sp.login_id, phone: sp.phone, email: sp.email };
    }
    const userJson = req.user.toJSON ? req.user.toJSON() : { ...req.user };
    delete userJson.password;
    delete userJson.plain_password;
    userJson.associateId = userJson.login_id;
    userJson.referredById = sponsor ? sponsor.login_id : null;
    userJson.referredByName = sponsor ? sponsor.name : null;
    userJson.sponsor = sponsor;

    res.json({ success: true, user: userJson });
  } catch (error) {
    next(error);
  }
};

// @desc  Update logged in user profile
// @route PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, email, profile_image } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.update({
      name: name !== undefined ? name : user.name,
      phone: phone !== undefined ? phone : user.phone,
      email: email !== undefined ? email : user.email,
      profile_image: profile_image !== undefined ? profile_image : user.profile_image,
    });
    const { password, ...userData } = user.toJSON();
    res.json({ success: true, message: 'Profile updated successfully', data: userData });
  } catch (error) { next(error); }
};

// @desc  Change logged in user password
// @route PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) { next(error); }
};

module.exports = { register, registerAssociate, login, getMe, updateProfile, changePassword };
