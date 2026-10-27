const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { User, Wallet, sequelize } = require('../models');
const bcrypt = require('bcryptjs');
const generateNextAccountsId = require('../utils/generateNextAccountsId');

async function runAccountsTest() {
  console.log('--- Testing Accounts User Generation & Auth ---');
  try {
    // 1. Test generateNextAccountsId
    const nextId1 = await generateNextAccountsId();
    console.log('Generated Next Accounts ID:', nextId1);
    if (!/^ACCOUNTS-\d{4}$/.test(nextId1)) {
      throw new Error(`Invalid format for Accounts ID: ${nextId1}`);
    }

    // 2. Check existing accounts users
    const existingAccounts = await User.findAll({
      where: { role: 'accounts' },
      attributes: ['id', 'name', 'email', 'phone', 'login_id', 'role', 'plain_password', 'commission_percent']
    });
    console.log(`Found ${existingAccounts.length} existing accounts user(s).`);
    existingAccounts.forEach(u => {
      console.log(`- ${u.name} | ID: ${u.login_id} | Phone: ${u.phone} | plain_password: ${u.plain_password} | comm: ${u.commission_percent}`);
      if (u.plain_password !== null) {
        console.warn(`WARNING: plain_password should be null for accounts user ${u.login_id}`);
      }
    });

    // 3. Test creating a mock accounts user safely (or test ID format increment)
    const testPhone = '9998887711';
    let testUser = await User.findOne({ where: { phone: testPhone } });
    if (testUser) {
      await testUser.destroy();
    }

    const testPassword = 'Password@123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const newLoginId = await generateNextAccountsId();

    testUser = await User.create({
      name: 'Test Accounts Officer',
      email: 'test_accounts_auto@devojas.com',
      phone: testPhone,
      password: hashedPassword,
      plain_password: null,
      role: 'accounts',
      login_id: newLoginId,
      kyc_status: 'approved',
      status: 'active',
      commission_percent: 0,
      referral_code: 'TESTACC' + Math.floor(1000 + Math.random() * 9000)
    });

    console.log('Created test accounts user successfully:', testUser.login_id);

    // 4. Verify login credentials check
    const match = await bcrypt.compare(testPassword, testUser.password);
    if (!match) {
      throw new Error('Password bcrypt verification failed!');
    }
    console.log('Password match test: SUCCESS');

    // 5. Verify plain_password is NULL
    if (testUser.plain_password !== null) {
      throw new Error(`plain_password must be null, but got: ${testUser.plain_password}`);
    }
    console.log('Security check (plain_password is null): SUCCESS');

    // 6. Test next ID increments
    const nextIdAfter = await generateNextAccountsId();
    console.log('Next ID after creation:', nextIdAfter);
    const currentNum = parseInt(newLoginId.split('-')[1], 10);
    const nextNum = parseInt(nextIdAfter.split('-')[1], 10);
    if (nextNum !== currentNum + 1) {
      throw new Error(`Expected next ID number ${currentNum + 1}, but got ${nextNum}`);
    }
    console.log('Sequential ID Increment check: SUCCESS');

    // Clean up test user
    await testUser.destroy();
    console.log('Cleaned up test accounts user.');

    console.log('--- ALL ACCOUNTS USER TESTS PASSED ---');
    process.exit(0);
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
}

runAccountsTest();
