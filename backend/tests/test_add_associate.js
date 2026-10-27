/** Add Associate end-to-end test (test DB only). */
process.env.DB_NAME = process.env.DB_NAME || 'devojas_test';
if (!/test/i.test(process.env.DB_NAME)) { console.error('Refusing to run on non-test DB'); process.exit(1); }
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const { User, Wallet, CommissionHistory } = require('../models');
const auth = require('../controllers/authController');
const assoc = require('../controllers/associateController');
const users = require('../controllers/userController');
const { authorize } = require('../middleware/auth');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  PASS ' : '  FAIL ') + m); };
const call = async (fn, req) => {
  let out = { status: 200, body: null };
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  await fn(req, res, (e) => { out = { status: 500, body: { message: e.message } }; });
  return out;
};
let seq = 0;
const form = (o = {}) => { seq++; return { name: `New Person ${seq}`, phone: `98000${String(10000 + seq)}`, email: `n${seq}@t.in`, pan_number: `ABCDE${1000 + seq}F`, aadhar_number: `1234${String(10000000 + seq)}`, address: 'X', password: 'secret123', confirm_password: 'secret123', ...o }; };

(async () => {
  await sequelize.sync({ force: true });
  const mk = (o) => User.create({ password: bcrypt.hashSync('pw-existing', 4), status: 'active', ...o });
  const admin = await mk({ name: 'Super Admin', email: 'a@t.in', phone: '9000000001', role: 'admin', login_id: 'DEV-0001', commission_percent: 10 });
  const ram = await mk({ name: 'Ram', email: 'r@t.in', phone: '9000000002', role: 'associate', login_id: 'DEV-0002', commission_percent: 7, referred_by: admin.id, referral_code: 'RAM1' });
  const sohan = await mk({ name: 'Sohan', email: 's@t.in', phone: '9000000003', role: 'associate', login_id: 'DEV-0003', commission_percent: 5, referred_by: ram.id, referral_code: 'SOH1' });
  const before = await User.findAll({ where: { id: [admin.id, ram.id, sohan.id] }, raw: true });

  console.log('\n1) Admin registers an associate (sponsor = Ram)');
  let r = await call(users.registerAssociateByAdmin, { user: admin, body: form({ sponsor_code: 'DEV-0002' }) });
  ok(r.status === 201 && r.body.data.sponsor.login_id === 'DEV-0002', 'admin registration saved under chosen sponsor');
  ok(/^DEV-\d{4}$/.test(r.body.data.login_id), `auto ID generated (${r.body.data.login_id})`);
  const adminNew = await User.findByPk(r.body.data.id);
  ok(adminNew.password !== 'secret123' && adminNew.password.startsWith('$2'), 'password stored as bcrypt hash');
  ok(adminNew.plain_password == null, 'no plain-text password stored');
  ok(parseFloat(adminNew.commission_percent) === 5, 'initial commission = admin-controlled default 5%');
  ok(!!(await Wallet.findOne({ where: { user_id: adminNew.id } })), 'wallet created');

  console.log('\n2) Sohan adds associate (forged sponsor/commission in body)');
  r = await call(assoc.createTeamMember, { user: sohan, body: { ...form(), sponsor_code: 'DEV-0002', referred_by: ram.id, commission_percent: 50, role: 'admin' } });
  ok(r.status === 201, 'registration succeeded');
  const nu = await User.findByPk(r.body.data.id);
  ok(nu.referred_by === sohan.id, 'new associate is DIRECTLY under Sohan (forged sponsor ignored)');
  ok(nu.role === 'associate', 'role forced to associate');
  ok(parseFloat(nu.commission_percent) === 5, 'associate cannot set commission (forged 50% ignored)');
  ok(r.body.data.sponsor.login_id === 'DEV-0003' && r.body.data.status === 'active', 'response shows sponsor + status');
  const newLogin = nu.login_id;

  console.log('\n3) Commission cap: sponsor with 3% -> child never above 3%');
  const low = await mk({ name: 'Low', email: 'l@t.in', phone: '9000000009', role: 'associate', login_id: 'FIX-LOW', commission_percent: 3, referred_by: ram.id, referral_code: 'LOW1' });
  r = await call(assoc.createTeamMember, { user: low, body: form() });
  ok(parseFloat((await User.findByPk(r.body.data.id)).commission_percent) === 3, 'child capped at sponsor percent');

  console.log('\n4) New associate can log in');
  r = await call(auth.login, { body: { identifier: newLogin, password: 'secret123' }, ip: '127.0.0.1', headers: {} });
  ok(r.status === 200 && r.body && r.body.success, 'login with generated ID works');

  console.log('\n5) Duplicate protection');
  const f = form();
  r = await call(assoc.createTeamMember, { user: sohan, body: f });
  ok(r.status === 201, 'first submit ok');
  const before2 = await User.count();
  r = await call(assoc.createTeamMember, { user: sohan, body: f });
  ok(r.status === 400 && /already registered/.test(r.body.message), 'second identical submit rejected');
  ok(await User.count() === before2, 'no duplicate account created');
  r = await call(assoc.createTeamMember, { user: sohan, body: { ...form(), pan_number: f.pan_number } });
  ok(r.status === 400, 'duplicate PAN rejected');

  console.log('\n6) Concurrent registrations -> unique IDs, no duplicates');
  const same = form();
  const batch = await Promise.all([
    ...Array.from({ length: 8 }, () => call(assoc.createTeamMember, { user: sohan, body: form() })),
    ...Array.from({ length: 4 }, () => call(users.registerAssociateByAdmin, { user: admin, body: same }))
  ]);
  const created = batch.filter(x => x.status === 201);
  ok(created.length === 9, `8 distinct + exactly 1 of 4 identical submissions created (got ${created.length})`);
  const ids = created.map(x => x.body.data.login_id);
  ok(new Set(ids).size === ids.length, 'all generated IDs unique');

  console.log('\n7) Validation');
  ok((await call(assoc.createTeamMember, { user: sohan, body: { ...form(), password: '123' } })).status === 400, 'short password rejected');
  ok((await call(assoc.createTeamMember, { user: sohan, body: { ...form(), confirm_password: 'zzz' } })).status === 400, 'password mismatch rejected');
  ok((await call(assoc.createTeamMember, { user: sohan, body: { ...form(), pan_number: '' } })).status === 400, 'PAN required');
  ok((await call(assoc.createTeamMember, { user: sohan, body: { ...form(), phone: '123' } })).status === 400, 'bad phone rejected');
  ok((await call(users.registerAssociateByAdmin, { user: admin, body: form({ sponsor_code: 'NOPE' }) })).status === 400, 'unknown sponsor rejected (admin)');
  r = await call(auth.registerAssociate, { body: form({ sponsor_code: 'SOH1' }) });
  ok(r.status === 201 && r.body.data.sponsor.login_id === 'DEV-0003', 'public signup path still works via shared service');
  ok((await call(auth.registerAssociate, { body: form() })).status === 400, 'public signup still requires sponsor');
  const inactive = await mk({ name: 'Blocked', email: 'b@t.in', phone: '9000000010', role: 'associate', login_id: 'FIX-BLK', commission_percent: 5, referral_code: 'BLK1', status: 'blocked' });
  ok((await call(assoc.createTeamMember, { user: inactive, body: form() })).status === 400, 'blocked sponsor cannot register members');

  console.log('\n8) Role guard + existing data untouched');
  let denied = false;
  await authorize('associate')({ user: { role: 'accounts' } }, { status() { denied = true; return { json() {} }; } }, () => {});
  ok(denied, 'authorize blocks other roles on associate routes');
  const after = await User.findAll({ where: { id: [admin.id, ram.id, sohan.id] }, raw: true });
  ok(JSON.stringify(before.map(u => [u.id, u.login_id, u.password, u.role, u.referred_by, u.commission_percent])) === JSON.stringify(after.map(u => [u.id, u.login_id, u.password, u.role, u.referred_by, u.commission_percent])), 'existing users: id/login/password/role/sponsor/commission unchanged');
  const sohanTeam = await User.count({ where: { referred_by: sohan.id } });
  ok(sohanTeam === 11, `Sohan's downline count reflects registrations (${sohanTeam})`);
  ok(await CommissionHistory.count({ where: { user_id: nu.id } }) === 1, 'commission audit entry created');

  console.log('\n9) MLM tree / downline visibility');
  const net = await call(assoc.getMyNetwork, { user: sohan });
  ok(net.body && net.body.totalCount === 11, `Sohan network shows all 11 members (${net.body && net.body.totalCount})`);
  const ramNet = await call(assoc.getMyNetwork, { user: ram });
  ok(ramNet.body && ramNet.body.totalCount >= 12, `Ram (upline) also sees them (${ramNet.body && ramNet.body.totalCount})`);
  const lowNet = await call(assoc.getMyNetwork, { user: low });
  ok(lowNet.body && lowNet.body.totalCount === 1, 'unrelated associate sees only own downline (1)');
  const dl = await call(assoc.getDownlineMembers, { user: sohan, query: {} });
  ok(dl.status === 200, 'downline members endpoint works for Sohan');
  const adminTree = await call(users.getReferralTree, { user: admin, params: { id: ram.id } });
  ok(adminTree.status === 200, 'admin referral tree endpoint works');

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  await sequelize.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
