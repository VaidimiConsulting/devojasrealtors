/**
 * Isolated end-to-end test: full-sale-value differential commission distribution,
 * Referral ID validation, approval flow, payout duplicate protection.
 * Runs ONLY against a database named "devojas_test" (never production).
 * Usage: DB_HOST=127.0.0.1 DB_USER=.. DB_PASSWORD=.. DB_NAME=devojas_test node tests/test_full_distribution.js
 */
process.env.DB_NAME = process.env.DB_NAME || 'devojas_test';
if (!/test/i.test(process.env.DB_NAME)) { console.error('Refusing to run on non-test DB'); process.exit(1); }
const { sequelize } = require('../config/db');
const M = require('../models');
const { User, Plot, Transaction, Commission, BookingForm } = M;
const { processCommissionForAssociate, previewCommissionDistribution } = require('../services/commissionEngine');
const bf = require('../controllers/bookingFormController');
const acc = require('../controllers/accountsController');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  PASS ' : '  FAIL ') + m); };
const call = async (fn, req) => {
  let out = { status: 200, body: null };
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  await fn(req, res, (e) => { out = { status: 500, body: { message: e.message } }; });
  return out;
};
const mkUser = (o) => User.create({ password: 'x-test-only', status: 'active', ...o });
const amt = async (txn, uid) => {
  const rows = await Commission.findAll({ where: { transaction_id: txn, user_id: uid } });
  return rows.reduce((s, r) => s + parseFloat(r.amount), 0);
};
let n = 0;
const mkTxn = (assocId, amount, plotId) => Transaction.create({
  transaction_ref: `T-${++n}`, plot_id: plotId, buyer_id: 1, seller_id: 1, seller_associate_id: assocId,
  amount, paid_amount: 0, status: 'completed', payment_status: 'unpaid'
});

(async () => {
  await sequelize.sync({ force: true });
  const admin = await mkUser({ name: 'Super Admin', email: 'a@t.in', phone: '9000000001', role: 'admin', login_id: 'ADM', commission_percent: 10 });
  const mohan = await mkUser({ name: 'Mohan', email: 'm@t.in', phone: '9000000002', role: 'associate', login_id: 'MOH', commission_percent: 7, referred_by: admin.id });
  const sohan = await mkUser({ name: 'Sohan', email: 's@t.in', phone: '9000000003', role: 'associate', login_id: 'SOH', commission_percent: 5, referred_by: mohan.id });
  const rohan = await mkUser({ name: 'Rohan', email: 'r@t.in', phone: '9000000004', role: 'associate', login_id: 'ROH', commission_percent: 3, referred_by: sohan.id });
  const other = await mkUser({ name: 'Other', email: 'o@t.in', phone: '9000000005', role: 'associate', login_id: 'OTH', commission_percent: 4, referred_by: admin.id });
  const accts = await mkUser({ name: 'Accounts', email: 'ac@t.in', phone: '9000000006', role: 'accounts', login_id: 'ACC' });
  const mkPlot = (code, price) => Plot.create({ plot_code: code, title: code, plot_number: code, location: 'T', size_sqft: 1000, price, basic_price: 60000, status: 'available' });

  console.log('\n1) Mohan (7%) sells Rs 1,00,000  [Admin 10 > Mohan 7]');
  let p = await mkPlot('P1', 100000), t = await mkTxn(mohan.id, 100000, p.id);
  await sequelize.transaction(tx => processCommissionForAssociate(mohan.id, 100000, t.id, 'seller_side', true, tx, 'pending', { basePrice: 60000, salePrice: 100000 }));
  ok(await amt(t.id, mohan.id) === 7000, 'Mohan = 7,000');
  ok(await amt(t.id, admin.id) === 3000, 'Super Admin differential = 3,000');
  ok(await amt(t.id, sohan.id) === 0 && await amt(t.id, rohan.id) === 0, 'Sohan & Rohan get nothing');
  ok((await Commission.count({ where: { transaction_id: t.id } })) === 2, 'exactly 2 ledger rows');
  await sequelize.transaction(tx => processCommissionForAssociate(mohan.id, 100000, t.id, 'seller_side', true, tx, 'pending', {}));
  ok((await Commission.count({ where: { transaction_id: t.id } })) === 2, 'rerun creates no duplicates');

  console.log('\n2) Rohan (3%) sells Rs 1,00,000  [Rohan 3 < Sohan 5 < Mohan 7 < Admin 10]');
  p = await mkPlot('P2', 100000); t = await mkTxn(rohan.id, 100000, p.id);
  await sequelize.transaction(tx => processCommissionForAssociate(rohan.id, 100000, t.id, 'seller_side', true, tx, 'pending', {}));
  ok(await amt(t.id, rohan.id) === 3000, 'Rohan = 3,000');
  ok(await amt(t.id, sohan.id) === 2000, 'Sohan = 2,000');
  ok(await amt(t.id, mohan.id) === 2000, 'Mohan = 2,000');
  ok(await amt(t.id, admin.id) === 3000, 'Admin = 3,000');
  const tot = (await Commission.findAll({ where: { transaction_id: t.id } })).reduce((s, r) => s + parseFloat(r.amount), 0);
  ok(tot === 10000, 'total = 10,000 = top percent (10%) of sale, never exceeds pool');

  console.log('\n3) Different hierarchy: 4% associate under Admin 10%, sale Rs 2,50,000.50');
  p = await mkPlot('P3', 250000.5); t = await mkTxn(other.id, 250000.5, p.id);
  await sequelize.transaction(tx => processCommissionForAssociate(other.id, 250000.5, t.id, 'seller_side', true, tx, 'pending', { basePrice: 100000 }));
  ok(await amt(t.id, other.id) === 10000.02, '4% of 2,50,000.50 = 10,000.02 (full value, 2dp)');
  ok(await amt(t.id, admin.id) === 15000.03, 'Admin 6% = 15,000.03');
  const prev = await previewCommissionDistribution(other.id, 250000.5, 100000);
  ok(prev.total_distributed_amount === 25000.05, 'preview matches saved ledger');

  console.log('\n4) Referral ID validation + approval flow (booking controller)');
  p = await mkPlot('P4', 100000);
  const base = { plot_id: p.id, applicant_name: 'Client One', applicant_phone: '9811111111', payment_plan_type: 'booking_balance', booking_amount: 10000, total_plot_price: 100000 };
  let r = await call(bf.createBookingForm, { user: mohan, body: { ...base, referral_id: 'NOPE' } });
  ok(r.status === 400, 'invalid referral ID rejected');
  r = await call(bf.createBookingForm, { user: mohan, body: { ...base, referral_id: 'OTH' } });
  ok(r.status === 403, 'associate cannot use unrelated network associate as referral');
  r = await call(bf.createBookingForm, { user: mohan, body: { ...base, referral_id: 'ROH', associate_id: other.id } });
  ok(r.status === 201 && r.body.data.bookingForm.associate_id === mohan.id && r.body.data.bookingForm.referred_id === 'ROH', 'seller = logged-in Mohan (forged associate_id ignored); downline Rohan stored as Referred By');
  const form = r.body.data.bookingForm;
  ok((await Commission.count({ where: { transaction_id: r.body.data.transaction.id } })) === 0, 'pending booking: no commission yet');
  r = await call(bf.updateBookingFormStatus, { user: accts, params: { id: form.id }, body: { status: 'approved' } });
  const txnRow = await Transaction.findOne({ where: { plot_id: p.id } });
  ok(r.status === 200 && (await Commission.count({ where: { transaction_id: txnRow.id } })) === 2, 'approval creates 2 commission rows (Mohan seller, Admin differential)');
  await call(bf.updateBookingFormStatus, { user: accts, params: { id: form.id }, body: { status: 'approved' } });
  ok((await Commission.count({ where: { transaction_id: txnRow.id } })) === 2, 're-approval does not duplicate commission');
  ok(await amt(txnRow.id, mohan.id) === 7000 && await amt(txnRow.id, admin.id) === 3000, 'Mohan direct 7,000 + Admin differential 3,000 on approved Rs 1,00,000 sale');

  console.log('\n5) Payout: no double payment');
  const mc = await Commission.findOne({ where: { transaction_id: txnRow.id, user_id: mohan.id } });
  await mc.update({ status: 'approved' });
  const pay = (ref) => call(acc.payCommission, { user: accts, ip: '127.0.0.1', body: { commission_id: mc.id, amount: 7000, payment_method: 'bank', payment_reference: ref } });
  const [a, b] = await Promise.all([pay('R-1'), pay('R-2')]);
  const statuses = [a.status, b.status].sort();
  await mc.reload();
  ok(parseFloat(mc.paid_amount) === 7000 && mc.status === 'paid', `concurrent double-pay settled once (paid=${mc.paid_amount}, status=${mc.status}; responses ${statuses})`);
  const again = await pay('R-3');
  ok(again.status === 400, 'third attempt rejected (already paid)');

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  await sequelize.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
