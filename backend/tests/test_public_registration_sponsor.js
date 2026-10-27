/**
 * Integration test for public website associate registration & login
 */
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const { User, Wallet, CommissionHistory } = require('../models');
const auth = require('../controllers/authController');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  PASS ' : '  FAIL ') + m); };
const call = async (fn, req) => {
  let out = { status: 200, body: null };
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  await fn(req, res, (e) => { out = { status: 500, body: { message: e.message } }; });
  return out;
};

(async () => {
  try {
    console.log('--- TESTING SPONSOR VALIDATION & REGISTRATION FLOW ---');

    // 1. Invalid sponsor code should fail
    console.log('\n1. Test invalid sponsor code');
    let r = await call(auth.registerAssociate, {
      body: {
        name: 'Invalid Test',
        phone: '9900112233',
        email: 'invalid@test.com',
        pan_number: 'ABCDE9999Z',
        aadhar_number: '123499998888',
        address: 'Test Address',
        sponsor_code: 'NON_EXISTENT_SPONSOR_9999',
        password: 'password123',
        confirm_password: 'password123'
      }
    });
    ok(r.status === 400 && r.body.message.includes('Sponsor code not found'), `Invalid sponsor rejected: ${r.body?.message}`);

    // 2. Test registration with Super Admin DEV-0001 as sponsor (case-insensitive & trimmed)
    console.log('\n2. Test valid registration with DEV-0001');
    const testPhone = '9811223344';
    const testPan = 'ABCDE8888K';
    const testAadhar = '987654321099';
    // Cleanup any existing test user if present
    const oldU = await User.findOne({ where: { phone: testPhone } });
    if (oldU) {
      await Wallet.destroy({ where: { user_id: oldU.id } });
      await CommissionHistory.destroy({ where: { user_id: oldU.id } });
      await oldU.destroy();
    }

    r = await call(auth.registerAssociate, {
      body: {
        name: 'Public Test Associate',
        phone: testPhone,
        email: 'public.test@example.com',
        pan_number: testPan,
        aadhar_number: testAadhar,
        address: '123 Public Road, Lucknow',
        sponsor_code: '  dev-0001  ', // lowercase + whitespace
        password: 'testPassword123',
        confirm_password: 'testPassword123'
      }
    });

    ok(r.status === 201, `Registration with DEV-0001 succeeded (status ${r.status})`);
    const newAssoc = r.body?.data;
    ok(newAssoc && newAssoc.login_id && /^DEV-\d{4}$/.test(newAssoc.login_id), `New associate ID generated: ${newAssoc?.login_id}`);
    ok(newAssoc?.sponsor?.login_id === 'DEV-0001', `Sponsor correctly linked to DEV-0001 (${newAssoc?.sponsor?.name})`);
    ok(parseFloat(newAssoc?.commission_percent) === 5, `Commission correctly set to 5% (got ${newAssoc?.commission_percent})`);

    // 3. Verify database record
    console.log('\n3. Verify database persistence and upline mapping');
    const dbUser = await User.findByPk(newAssoc.id);
    ok(dbUser !== null, 'User saved to database');
    ok(dbUser.role === 'associate', `Role is associate (${dbUser.role})`);
    ok(dbUser.status === 'active', `Status is active (${dbUser.status})`);
    ok(dbUser.referred_by === 1, `referred_by points to Super Admin (id=1)`);
    ok(dbUser.pan_number === testPan, `PAN stored uppercase (${dbUser.pan_number})`);
    ok(dbUser.password !== 'testPassword123' && dbUser.password.startsWith('$2'), 'Password hashed with bcrypt');

    // 4. Duplicate checks
    console.log('\n4. Test duplicate prevention');
    let dup = await call(auth.registerAssociate, {
      body: {
        name: 'Duplicate Test',
        phone: testPhone,
        pan_number: 'DIFFE1234F',
        aadhar_number: '888877776666',
        sponsor_code: 'DEV-0001',
        password: 'password123'
      }
    });
    ok(dup.status === 400 && dup.body.message.includes('Phone number already registered'), `Duplicate phone rejected: ${dup.body?.message}`);

    dup = await call(auth.registerAssociate, {
      body: {
        name: 'Duplicate PAN Test',
        phone: '9811223355',
        pan_number: testPan,
        aadhar_number: '888877776666',
        sponsor_code: 'DEV-0001',
        password: 'password123'
      }
    });
    ok(dup.status === 400 && dup.body.message.includes('PAN number is already registered'), `Duplicate PAN rejected: ${dup.body?.message}`);

    // 5. Test login with newly registered credentials
    console.log('\n5. Test login with new credentials');
    // 5a. Login using Associate ID (DEV-XXXX)
    let loginRes = await call(auth.login, {
      body: {
        identifier: newAssoc.login_id.toLowerCase(), // test case-insensitivity on login
        password: 'testPassword123'
      }
    });
    ok(loginRes.status === 200 && loginRes.body.success, `Login using Associate ID (${newAssoc.login_id}) succeeded`);
    ok(loginRes.body.user.role === 'associate', `Logged in role is associate (${loginRes.body.user.role})`);
    ok(loginRes.body.user.referredById === 'DEV-0001', `Logged in user referredById is DEV-0001 (${loginRes.body.user.referredById})`);
    ok(!!loginRes.body.token, 'JWT token returned');

    // 5b. Login using Phone number
    let phoneLoginRes = await call(auth.login, {
      body: {
        identifier: testPhone,
        password: 'testPassword123'
      }
    });
    ok(phoneLoginRes.status === 200 && phoneLoginRes.body.success, `Login using Mobile Phone (${testPhone}) succeeded`);

    // 5c. Wrong password rejected
    let wrongPwd = await call(auth.login, {
      body: {
        identifier: newAssoc.login_id,
        password: 'incorrectPassword'
      }
    });
    ok(wrongPwd.status === 401, 'Invalid password rejected');

    console.log(`\n========================================`);
    console.log(`TOTAL: ${pass} passed, ${fail} failed`);
    console.log(`========================================`);

    // Clean up test user
    await Wallet.destroy({ where: { user_id: newAssoc.id } });
    await CommissionHistory.destroy({ where: { user_id: newAssoc.id } });
    await dbUser.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
})();
