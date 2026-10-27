/** Real HTTP route-level permission test (test DB only). */
process.env.DB_NAME = process.env.DB_NAME || 'devojas_test';
if (!/test/i.test(process.env.DB_NAME)) { console.error('Refusing to run on non-test DB'); process.exit(1); }
process.env.PORT = '5055';
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const { User, Commission, Transaction, Plot } = require('../models');
const generateToken = require('../utils/generateToken');
const { processCommissionForAssociate } = require('../services/commissionEngine');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  PASS ' : '  FAIL ') + m); };
const api = async (tok, method, path, body) => {
  const r = await fetch(`http://127.0.0.1:5055/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (_) {}
  return { status: r.status, body: j };
};
(async () => {
  await sequelize.sync({ force: true });
  const mk = (o) => User.create({ password: bcrypt.hashSync('pw', 4), status: 'active', ...o });
  const admin = await mk({ name: 'Admin', email: 'a@t.in', phone: '9000000001', role: 'admin', login_id: 'DEV-0001', commission_percent: 10 });
  const ram = await mk({ name: 'Ram', email: 'r@t.in', phone: '9000000002', role: 'associate', login_id: 'DEV-0002', commission_percent: 7, referred_by: admin.id, referral_code: 'R1' });
  const mohan = await mk({ name: 'Mohan', email: 'm@t.in', phone: '9000000003', role: 'associate', login_id: 'DEV-0003', commission_percent: 5, referred_by: ram.id, referral_code: 'M1' });
  const other = await mk({ name: 'Other', email: 'o@t.in', phone: '9000000005', role: 'associate', login_id: 'DEV-0005', commission_percent: 6, referred_by: admin.id, referral_code: 'O1' });
  const acc = await mk({ name: 'Accounts', email: 'ac@t.in', phone: '9000000006', role: 'accounts', login_id: 'ACC-0006' });
  const plot = await Plot.create({ plot_code: 'H1', title: 'H1', plot_number: 'H1', location: 'T', size_sqft: 1000, price: 100000, basic_price: 1, status: 'sold' });
  const t = await Transaction.create({ transaction_ref: 'DEAL-H1', plot_id: plot.id, buyer_id: 1, seller_id: 1, seller_associate_id: mohan.id, amount: 100000, paid_amount: 0, status: 'completed', payment_status: 'unpaid' });
  await sequelize.transaction(tx => processCommissionForAssociate(mohan.id, 100000, t.id, 'seller_side', true, tx, 'pending', {}));
  await Commission.update({ status: 'approved' }, { where: {} });

  require('../server');
  for (let i = 0; i < 40; i++) { try { await fetch('http://127.0.0.1:5055/api/commission-ledger'); break; } catch (_) { await new Promise(r => setTimeout(r, 500)); } }
  const T = { admin: generateToken(admin.id), ram: generateToken(ram.id), mohan: generateToken(mohan.id), other: generateToken(other.id), acc: generateToken(acc.id) };

  console.log('\nUnauthenticated');
  ok((await api(null, 'GET', '/commission-ledger')).status === 401, 'ledger requires login');

  console.log('\nAssociate vs Accounts-only routes');
  ok((await api(T.mohan, 'GET', `/payout-statements/ledger/${ram.id}`)).status === 403, 'associate cannot open payout preview');
  ok((await api(T.mohan, 'POST', '/payout-statements', { associate_id: mohan.id })).status === 403, 'associate cannot create payout statement');
  ok((await api(T.ram, 'POST', '/accounts/commissions/pay', { commission_id: 1, amount: 1 })).status >= 400, 'associate cannot use accounts pay route');
  ok((await api(T.mohan, 'POST', '/users/register-associate', {})).status === 403, 'associate cannot use admin registration route');

  console.log('\nRole scoping over HTTP');
  let r = await api(T.admin, 'GET', '/commission-ledger?limit=50');
  ok(r.status === 200 && r.body.pagination.total === 3, `admin sees all 3 ledger rows (got ${r.body.pagination && r.body.pagination.total}, status ${r.status})`);
  r = await api(T.ram, 'GET', '/commission-ledger?limit=50');
  ok(r.body.rows.every(x => ['DEV-0002', 'DEV-0003'].includes(x.beneficiary.login_id)) && r.body.rows.length === 2, 'Ram sees own + Mohan (downline) only');
  r = await api(T.other, 'GET', '/commission-ledger?limit=50');
  ok(r.body.pagination.total === 0, 'unrelated associate sees nothing');
  r = await api(T.acc, 'GET', `/payout-statements/ledger/${ram.id}`);
  ok(r.status === 200 && r.body.data.associate.own_commission_rate === 7 && r.body.data.entries[0].differential_rate === 2, 'Accounts preview over HTTP: Ram own 7%, differential 2%');
  r = await api(T.admin, 'GET', '/commission-ledger/network-counts');
  ok(r.status === 200 && r.body.data.find(x => x.login_id === 'DEV-0002').direct_associates === 1, 'network counts over HTTP');
  r = await api(T.other, 'GET', `/booking-forms/associate-details/${ram.id}`);
  ok(r.status === 403, 'associate-details for unrelated associate blocked over HTTP');

  console.log('\nPayout over HTTP + duplicate');
  r = await api(T.acc, 'POST', '/payout-statements', { associate_id: ram.id, tds_percent: 5, processing_percent: 2 });
  ok(r.status === 201 && Math.abs(parseFloat(r.body.data.net_payable) - 1860) < 0.01, `Ram payout: gross 2,000 net 1,860 (got ${r.body.data && r.body.data.net_payable})`);
  r = await api(T.acc, 'POST', '/payout-statements', { associate_id: ram.id });
  ok(r.status === 400, 'duplicate payout over HTTP rejected');
  r = await api(T.ram, 'GET', '/commission-ledger?scope=own');
  ok(r.body.rows.length === 1 && r.body.rows[0].status === 'paid' && r.body.rows[0].payout_refs.length === 1, 'Ram sees paid status + payout reference');
  r = await api(T.ram, 'GET', '/payout-statements');
  ok(r.status === 200 && r.body.data.length === 1 && r.body.data[0].associate_id === ram.id, 'Ram sees only his own statements');
  r = await api(T.other, 'GET', '/payout-statements');
  ok(r.body.data.length === 0, 'unrelated associate sees no statements');

  console.log('\nAdd Associate over HTTP');
  r = await api(T.mohan, 'POST', '/associate/team', { name: 'Newbie', phone: '9876500001', email: 'n@t.in', pan_number: 'ABCDE1234F', aadhar_number: '123456789012', password: 'secret123', confirm_password: 'secret123', sponsor_code: 'DEV-0005', referred_by: other.id });
  ok(r.status === 201 && r.body.data.sponsor.login_id === 'DEV-0003', 'registered directly under logged-in Mohan (forged sponsor ignored)');
  r = await api(T.mohan, 'GET', '/commission-ledger/network-counts');
  ok(r.body.data.direct_associates === 1 && r.body.data.total_downline === 1, 'Mohan counts refreshed (1/1)');

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
