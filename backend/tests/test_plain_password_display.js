/**
 * Test script to verify:
 * 1. Associate Saurabh Rai (DEV-0012) has plain_password = 'saurabh@1234' and hash matches.
 * 2. GET /api/users returns plain_password for associates.
 * 3. GET /api/users/fixed-associates returns plain_password.
 * 4. Registering a new associate saves plain_password and is returned in user management.
 * 5. Admin updating an associate password keeps plain_password updated.
 * 6. Admin resetting password keeps plain_password updated.
 */
const { ok, strictEqual } = require('assert');
const bcrypt = require('bcryptjs');
const http = require('http');
const { User, Wallet, CommissionHistory } = require('../models');
const generateToken = require('../utils/generateToken');

const ADMIN_TOKEN = generateToken(1); // Super Admin

function request(method, path, body = null, token = ADMIN_TOKEN) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  let passed = 0;
  let testUser = null;

  try {
    console.log('=== TEST 1: Verify Saurabh Rai in DB & API ===');
    const saurabhDb = await User.findOne({ where: { login_id: 'DEV-0012' } });
    ok(saurabhDb, 'Saurabh Rai (DEV-0012) must exist in DB');
    passed++;

    strictEqual(saurabhDb.plain_password, 'saurabh@1234', 'Saurabh plain_password must be saurabh@1234');
    passed++;

    const matchesHash = await bcrypt.compare('saurabh@1234', saurabhDb.password);
    ok(matchesHash, 'Saurabh password hash must match saurabh@1234');
    passed++;

    // Test GET /api/users
    const usersRes = await request('GET', '/api/users?role=associate');
    strictEqual(usersRes.status, 200, 'GET /api/users should return 200');
    passed++;

    const saurabhApi = (usersRes.body.data || []).find(u => u.login_id === 'DEV-0012');
    ok(saurabhApi, 'Saurabh Rai returned in GET /api/users');
    passed++;

    strictEqual(saurabhApi.plain_password, 'saurabh@1234', 'Saurabh plain_password must be returned by GET /api/users');
    passed++;

    console.log('=== TEST 2: Verify Fixed Associates plain_password ===');
    const fixedRes = await request('GET', '/api/users/fixed-associates');
    strictEqual(fixedRes.status, 200, 'GET /api/users/fixed-associates should return 200');
    passed++;

    const fa1 = (fixedRes.body.data || []).find(u => u.login_id === 'DEV-0006');
    ok(fa1, 'Fixed Associate 1 (DEV-0006) found');
    passed++;
    strictEqual(fa1.plain_password, 'password', 'Fixed Associate 1 plain_password must be "password"');
    passed++;

    console.log('=== TEST 3: Register New Associate & Verify Plain Password Retention ===');
    const unique = Date.now().toString().slice(-4);
    const regPayload = {
      name: `Test Pwd Assoc ${unique}`,
      phone: `9182${unique.padStart(6, '0')}`,
      email: `pwdtest${unique}@example.com`,
      pan_number: `ABCP${unique}F`,
      aadhar_number: `66778899${unique}`,
      address: 'Test Address Colony',
      password: 'MySecretPass@99',
      confirm_password: 'MySecretPass@99',
      sponsor_code: 'DEV-0001'
    };

    const regRes = await request('POST', '/api/auth/register-associate', regPayload, null);
    strictEqual(regRes.status, 201, 'Associate registration should succeed with 201');
    passed++;

    testUser = await User.findOne({ where: { phone: regPayload.phone } });
    ok(testUser, 'New associate user created in DB');
    passed++;

    strictEqual(testUser.plain_password, 'MySecretPass@99', 'New associate plain_password must be stored');
    passed++;

    const isMatch = await bcrypt.compare('MySecretPass@99', testUser.password);
    ok(isMatch, 'New associate password hash must match plain_password');
    passed++;

    // Check GET /api/users includes new user's plain_password
    const freshUsersRes = await request('GET', '/api/users?search=' + testUser.login_id);
    const foundNew = (freshUsersRes.body.data || []).find(u => u.id === testUser.id);
    ok(foundNew, 'New associate found in GET /api/users');
    passed++;
    strictEqual(foundNew.plain_password, 'MySecretPass@99', 'New associate plain_password returned in GET /api/users');
    passed++;

    console.log('=== TEST 4: Admin Edit Associate Password Updates plain_password ===');
    const updateRes = await request('PUT', `/api/users/${testUser.id}`, {
      password: 'UpdatedSecretPass@88',
      confirm_password: 'UpdatedSecretPass@88'
    });
    strictEqual(updateRes.status, 200, 'Admin update password should succeed');
    passed++;

    await testUser.reload();
    strictEqual(testUser.plain_password, 'UpdatedSecretPass@88', 'plain_password updated in DB');
    passed++;

    const matchUpdated = await bcrypt.compare('UpdatedSecretPass@88', testUser.password);
    ok(matchUpdated, 'Updated password hash matches');
    passed++;

    console.log('=== TEST 5: Admin Quick Reset Password Updates plain_password ===');
    const resetRes = await request('POST', `/api/users/${testUser.id}/admin-reset-password`, {
      new_password: 'DirectResetPass@77'
    });
    strictEqual(resetRes.status, 200, 'Admin reset password should succeed');
    passed++;

    await testUser.reload();
    strictEqual(testUser.plain_password, 'DirectResetPass@77', 'plain_password updated via admin reset');
    passed++;

    console.log(`\n🎉 ALL ${passed}/${passed} TESTS PASSED SUCCESSFULLY!`);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    if (testUser) {
      await Wallet.destroy({ where: { user_id: testUser.id } }).catch(() => {});
      await CommissionHistory.destroy({ where: { user_id: testUser.id } }).catch(() => {});
      await User.destroy({ where: { id: testUser.id } }).catch(() => {});
      console.log('🧹 Cleaned up test user');
    }
    process.exit(process.exitCode || 0);
  }
})();
