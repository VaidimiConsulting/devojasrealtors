/** Ledger / payout / counts / booking referral tests (test DB only). */
process.env.DB_NAME = process.env.DB_NAME || 'devojas_test';
if (!/test/i.test(process.env.DB_NAME)) { console.error('Refusing to run on non-test DB'); process.exit(1); }
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const { User, Plot, Transaction, Commission, CommissionPayment, PayoutStatement, Slab, BookingForm } = require('../models');
const { processCommissionForAssociate } = require('../services/commissionEngine');
const ledger = require('../controllers/commissionLedgerController');
const ps = require('../controllers/payoutStatementController');
const bf = require('../controllers/bookingFormController');
const assocCtl = require('../controllers/associateController');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  PASS ' : '  FAIL ') + m); };
const call = async (fn, req) => {
  let out = { status: 200, body: null };
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  await fn({ ip: '127.0.0.1', query: {}, params: {}, body: {}, ...req }, res, (e) => { out = { status: 500, body: { message: e.message } }; });
  return out;
};
let n = 0;
const sell = async (seller, amount, code) => {
  const plot = await Plot.create({ plot_code: code, title: code, plot_number: code, location: 'T', size_sqft: 1000, price: amount, basic_price: 1, status: 'sold' });
  const t = await Transaction.create({ transaction_ref: `DEAL-${++n}`, plot_id: plot.id, buyer_id: 1, seller_id: 1, seller_associate_id: seller.id, amount, paid_amount: 0, status: 'completed', payment_status: 'unpaid' });
  await sequelize.transaction(tx => processCommissionForAssociate(seller.id, amount, t.id, 'seller_side', true, tx, 'pending', {}));
  return t;
};
const near = (a, b) => Math.abs(a - b) < 0.005;

(async () => {
  await sequelize.sync({ force: true });
  const mk = (o) => User.create({ password: bcrypt.hashSync('pw', 4), status: 'active', ...o });
  const admin = await mk({ name: 'Super Admin', email: 'a@t.in', phone: '9000000001', role: 'admin', login_id: 'DEV-0001', commission_percent: 10 });
  const ram = await mk({ name: 'Ram', email: 'r@t.in', phone: '9000000002', role: 'associate', login_id: 'DEV-0002', commission_percent: 7, referral_commission_percent: 5, referred_by: admin.id, referral_code: 'RAM1' });
  const mohan = await mk({ name: 'Mohan', email: 'm@t.in', phone: '9000000003', role: 'associate', login_id: 'DEV-0003', commission_percent: 5, referred_by: ram.id, referral_code: 'MOH1' });
  const sohan = await mk({ name: 'Sohan', email: 's@t.in', phone: '9000000004', role: 'associate', login_id: 'DEV-0004', commission_percent: 4, referred_by: mohan.id, referral_code: 'SOH1' });
  const other = await mk({ name: 'Other', email: 'o@t.in', phone: '9000000005', role: 'associate', login_id: 'DEV-0005', commission_percent: 6, referred_by: admin.id, referral_code: 'OTH1' });
  const accts = await mk({ name: 'Accounts', email: 'ac@t.in', phone: '9000000006', role: 'accounts', login_id: 'ACC' });
  await Slab.create({ slab_number: 1, min_amount: 0, max_amount: 99999999, percentage: 5, reward_amount: 1000 }).catch(() => {});

  console.log('\nB/C) Mohan (5%) sells 50,000 / 1,00,000 / 2,00,000 under Ram (7%) and Super Admin (10%)');
  const t50 = await sell(mohan, 50000, 'A1'), t1 = await sell(mohan, 100000, 'A2'), t2 = await sell(mohan, 200000, 'A3');
  const amtOf = async (tx, u) => (await Commission.findAll({ where: { transaction_id: tx.id, user_id: u.id } })).reduce((s, r) => s + parseFloat(r.amount), 0);
  for (const [tx, v] of [[t50, 50000], [t1, 100000], [t2, 200000]]) {
    ok(near(await amtOf(tx, mohan), v * .05) && near(await amtOf(tx, ram), v * .02) && near(await amtOf(tx, admin), v * .03),
      `sale ${v}: Mohan ${v * .05}, Ram ${v * .02}, Admin ${v * .03}`);
  }

  console.log('\nA) Accounts selects Ram -> own rate must be 7% (not Mohan 5%)');
  await Commission.update({ status: 'approved' }, { where: {} });
  let r = await call(ps.getAssociateLedger, { user: accts, params: { associateId: ram.id }, query: {} });
  ok(r.status === 200 && r.body.data.associate.own_commission_rate === 7, `own_commission_rate = ${r.body.data.associate.own_commission_rate}`);
  ok(r.body.data.associate.rate_columns_differ === true, 'flags mismatch with legacy referral_commission_percent column (5)');
  const e = r.body.data.entries[0];
  ok(e.beneficiary.id === ram.id && e.beneficiary_rate === 7 && e.seller_rate === 5 && e.differential_rate === 2, `entry: own 7% / seller 5% / differential 2% (got ${e.beneficiary_rate}/${e.seller_rate}/${e.differential_rate})`);
  ok(e.seller.login_id === 'DEV-0003' && e.commission_type === 'differential', 'entry seller = Mohan, type differential');
  ok(r.body.data.entries.length === 3, 'Ram has exactly his 3 differential entries');
  const sm = r.body.data.summary;
  ok(near(sm.gross_payable, 7000) && near(sm.differential_commission, 7000) && sm.direct_commission === 0, 'gross payable 7,000 (1,000+2,000+4,000), all differential');
  ok(near(sm.tds_amount, 350) && near(sm.processing_amount, 140) && near(sm.net_payable, 6510), 'TDS 5% = 350, processing 2% = 140, net = 6,510');
  ok(r.body.data.slab_reward.slab && r.body.data.slab_reward.slab.reward_amount === 1000, 'slab reward shown separately (1,000) and NOT in net');

  console.log('\nD/E) Commission Management table (admin vs associate scope)');
  r = await call(ledger.getLedger, { user: admin, query: { limit: 100 } });
  ok(r.body.pagination.total === 9, 'admin sees all 9 ledger rows');
  const row = r.body.rows.find(x => x.sale_id === t1.transaction_ref && x.beneficiary.login_id === 'DEV-0002');
  ok(row && row.sale_amount === 100000 && row.seller.name === 'Mohan' && row.differential_rate === 2 && row.amount === 2000 && row.remaining_amount === 2000 && row.plot.plot_number === 'A2', 'row has sale id, plot, seller, sale amount, differential, amount, remaining');
  r = await call(ledger.getLedger, { user: mohan, query: { limit: 100 } });
  ok(r.body.rows.every(x => ['DEV-0003', 'DEV-0004'].includes(x.beneficiary.login_id)), 'Mohan sees only himself + downline beneficiaries (not Ram/Admin)');
  r = await call(ledger.getLedger, { user: other, query: { limit: 100 } });
  ok(r.body.pagination.total === 0, 'unrelated associate sees none of these records');
  r = await call(ledger.getLedger, { user: admin, query: { search: 'A3', limit: 100 } });
  ok(r.body.rows.length === 3 && r.body.totals.commission === 20000, 'search by plot works; totals follow filters (3 rows, 20,000)');
  r = await call(ledger.getLedger, { user: admin, query: { limit: 2, page: 2 } });
  ok(r.body.rows.length === 2 && r.body.pagination.pages === 5, 'pagination works');
  ok((await call(ledger.getLedger, { user: { id: 99, role: 'client' }, query: {} })).status === 403, 'client role blocked');

  console.log('\nG) Payout statement settles the saved ledger');
  r = await call(ps.createPayoutStatement, { user: accts, body: { associate_id: ram.id, payment_date: '2026-10-23', tds_percent: 5, processing_percent: 2, total_amount: 999999, net_payable: 1 } });
  ok(r.status === 201, 'statement created');
  const st = r.body.data;
  ok(near(parseFloat(st.total_amount), 7000) && near(parseFloat(st.net_payable), 6510), 'amounts from ledger (forged total/net in body ignored): gross 7,000 net 6,510');
  ok(near(parseFloat(st.team_deposit), 7000) && near(parseFloat(st.self_deposit), 0) && near(parseFloat(st.reward_amount), 1000), 'differential 7,000 / direct 0 / reward 1,000 kept separate');
  const ramRows = await Commission.findAll({ where: { user_id: ram.id } });
  ok(ramRows.every(c => c.status === 'paid' && near(parseFloat(c.paid_amount), parseFloat(c.amount)) && parseFloat(c.remaining_amount) === 0), 'all Ram entries paid, remaining 0');
  const pays = await CommissionPayment.findAll({ where: { payment_reference: r.body.payout_reference } });
  ok(pays.length === 3 && near(pays.reduce((s, p) => s + parseFloat(p.amount), 0), 7000), 'commission_payments link statement to the exact 3 entries (receipt refs)');
  const mohanRow = await Commission.findOne({ where: { user_id: mohan.id } });
  ok(mohanRow.status === 'approved', "Mohan's and Admin's entries untouched");
  r = await call(ledger.getLedger, { user: ram, query: { limit: 100 } });
  ok(r.body.rows.filter(x => x.beneficiary.login_id === 'DEV-0002').every(x => x.status === 'paid' && x.payout_refs.includes(`PS-${st.id}`)), "Ram's panel shows paid + payout reference");
  r = await call(ps.updatePayoutStatement, { user: accts, params: { id: st.id }, body: { notes: 'x' } });
  ok(r.status === 409, 'settled statement cannot be edited');
  r = await call(ps.deletePayoutStatement, { user: accts, params: { id: st.id } });
  ok(r.status === 409, 'settled statement cannot be deleted');

  console.log('\nH) Duplicate / concurrent settlement');
  r = await call(ps.createPayoutStatement, { user: accts, body: { associate_id: ram.id } });
  ok(r.status === 400, 'second payout for Ram: nothing left to pay');
  const [x, y] = await Promise.all([1, 2].map(() => call(ps.createPayoutStatement, { user: accts, body: { associate_id: mohan.id, tds_percent: 0, processing_percent: 0 } })));
  ok([x.status, y.status].sort().join() === '201,400', `concurrent Mohan payouts: exactly one succeeds (${x.status},${y.status})`);
  const mohanPaid = (await Commission.findAll({ where: { user_id: mohan.id } })).reduce((s, c) => s + parseFloat(c.paid_amount), 0);
  ok(near(mohanPaid, 17500), `Mohan paid once: 17,500 (got ${mohanPaid})`);
  ok((await PayoutStatement.count({ where: { associate_id: mohan.id } })) === 1, 'only one statement row for Mohan');

  console.log('\nF) Network counts');
  r = await call(ledger.getCounts, { user: admin, query: {} });
  const c = Object.fromEntries(r.body.data.map(u => [u.login_id, u]));
  ok(c['DEV-0002'].direct_associates === 1 && c['DEV-0002'].total_downline === 2, 'Ram: direct 1, total 2');
  ok(c['DEV-0003'].direct_associates === 1 && c['DEV-0003'].total_downline === 1, 'Mohan: direct 1, total 1');
  ok(c['DEV-0004'].total_downline === 0 && c['DEV-0005'].total_downline === 0, 'leaf associates: 0');
  r = await call(ledger.getCounts, { user: mohan, query: { associate_id: ram.id } });
  ok(r.body.data.id === mohan.id && r.body.data.total_downline === 1, 'associate always gets only their own counts');
  await sohan.update({ status: 'blocked' });
  r = await call(ledger.getCounts, { user: admin, query: { associate_id: ram.id } });
  ok(r.body.data.total_downline === 2 && r.body.data.active_associates === 1 && r.body.data.pending_associates === 1, 'active/pending split follows status');

  console.log('\nF2) Monthly target / slab rollover');
  const { monthlyBusiness } = require('../services/commissionLedgerService');
  const tg = (user, month, extra = {}) => call(ledger.getTarget, { user, query: { month, ...extra } });
  const nowMonth = new Date().toISOString().slice(0, 7);
  r = await tg(mohan, nowMonth);
  ok(r.body.data.self_business === 350000 && r.body.data.team_business === 0, `Mohan: self 3,50,000 / team 0 (got ${r.body.data.self_business}/${r.body.data.team_business})`);
  r = await tg(ram, nowMonth);
  ok(r.body.data.self_business === 0 && r.body.data.team_business === 350000 && r.body.data.total_business === 350000, 'Ram: self 0 / team 3,50,000 (tracked independently)');
  ok(r.body.data.current_slab && r.body.data.current_slab.reward_amount === 1000 && r.body.data.reward_eligible, 'slab + reward identified from Admin-configured slab');
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15).toISOString().slice(0, 7);
  r = await tg(ram, lastMonth);
  ok(r.body.data.total_business === 0 && r.body.data.reward_eligible === false, 'previous month is independent (0, no reward) - nothing carried forward');
  const cBefore = await Commission.count();
  await Transaction.update({ status: 'cancelled' }, { where: { id: t50.id } });
  r = await tg(mohan, nowMonth);
  ok(r.body.data.self_business === 300000, 'cancelling the 50,000 sale reduces monthly progress to 3,00,000 automatically');
  ok(await Commission.count() === cBefore, 'history (commission rows) not deleted by recalculation');
  await Transaction.update({ status: 'completed' }, { where: { id: t50.id } });
  r = await tg(ram, nowMonth, { associate_id: mohan.id });
  ok(r.body.data.self_business === 0 && r.body.data.team_business === 350000, 'associate cannot query another associate (own data returned)');

  console.log('\nI/J) Plot purchasing: seller, Associate ID and Referred By are separate + validated');
  await sohan.update({ status: 'active' });
  const mkPlot = (code, status = 'available') => Plot.create({ plot_code: code, title: code, plot_number: code, location: 'T', size_sqft: 1000, price: 100000, basic_price: 100000, status });
  const base = (plot) => ({ plot_id: plot.id, applicant_name: 'Client', applicant_phone: '9811111111', payment_plan_type: 'full', total_plot_price: 1, booking_amount: 100000, mark_confirmed: true });
  let p1 = await mkPlot('S1');
  r = await call(bf.createBookingForm, { user: mohan, body: { ...base(p1), associate_id: sohan.id, referral_id: 'DEV-0002' } });
  ok(r.status === 201 && r.body.data.bookingForm.associate_id === mohan.id, 'associate cannot impersonate seller: seller = logged-in Mohan');
  ok(r.body.data.bookingForm.referred_id === 'DEV-0002', 'Referred By = Ram saved separately from seller (Mohan)');
  r = await call(bf.createBookingForm, { user: mohan, body: base(await mkPlot('S2')) });
  ok(r.status === 201 && r.body.data.bookingForm.referred_id === 'DEV-0002', 'blank referral defaults to seller sponsor (Ram)');
  r = await call(bf.createBookingForm, { user: mohan, body: { ...base(await mkPlot('S3')), referral_id: 'DEV-0005' } });
  ok(r.status === 403, 'referral outside own network rejected');
  r = await call(bf.createBookingForm, { user: mohan, body: { ...base(await mkPlot('S4')), referral_id: 'NOPE' } });
  ok(r.status === 400, 'unknown referral rejected');
  r = await call(bf.createBookingForm, { user: admin, body: base(await mkPlot('S5')) });
  ok(r.status === 400, 'admin must choose a selling associate');
  r = await call(bf.createBookingForm, { user: admin, body: { ...base(await mkPlot('S6')), associate_id: sohan.id, referral_id: 'DEV-0002' } });
  ok(r.status === 201 && r.body.data.bookingForm.associate_id === sohan.id, 'admin may pick the seller (Sohan) with Ram as referral');
  r = await call(bf.createBookingForm, { user: mohan, body: base(p1) });
  ok(r.status === 400, 'sold/booked plot cannot be bought again');
  for (const st of ['pending', 'rejected', 'under_negotiation']) {
    r = await call(bf.createBookingForm, { user: mohan, body: base(await mkPlot(`U-${st}`, st)) });
    ok(r.status === 400, `plot with status "${st}" is blocked`);
  }
  const p7 = await mkPlot('S7');
  const [d1, d2] = await Promise.all([1, 2].map(() => call(bf.createBookingForm, { user: mohan, body: { ...base(p7), applicant_phone: '9822222222' } })));
  ok([d1.status, d2.status].sort().join() === '201,400', `simultaneous purchase of the same plot: one wins (${d1.status},${d2.status})`);
  ok((await Plot.findByPk(p7.id)).status !== 'available', 'plot status updated after confirm');

  console.log('\nM) Permissions');
  const dets = (user, id) => call(bf.getAssociateDetailsAndUpline, { user, params: { id } });
  ok((await dets(mohan, 'DEV-0005')).status === 403, 'associate cannot read unrelated associate details');
  ok((await dets(mohan, 'DEV-0002')).status === 200 && (await dets(mohan, 'DEV-0004')).status === 200, 'own upline and downline allowed');

  console.log('\nD2) Associate ledger scopes');
  r = await call(ledger.getLedger, { user: ram, query: { scope: 'own', limit: 100 } });
  ok(r.body.rows.length > 0 && r.body.rows.every(x => x.beneficiary.login_id === 'DEV-0002'), "'own' scope = only Ram's entries");
  r = await call(ledger.getLedger, { user: ram, query: { scope: 'downline', limit: 100 } });
  ok(r.body.rows.length > 0 && r.body.rows.every(x => x.beneficiary.login_id !== 'DEV-0002'), "'downline' scope excludes Ram's own entries");

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  await sequelize.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
