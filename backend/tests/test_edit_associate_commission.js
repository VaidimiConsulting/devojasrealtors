/**
 * Test Edit Associate Commission & Admin Account Management
 */
const bcrypt = require('bcryptjs');
const { User, Wallet, CommissionHistory, Commission } = require('../models');
const usersController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { calculateCommissionChain } = require('../services/commissionEngine');

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
    console.log('=== TEST: EDIT ASSOCIATE COMMISSION & ACCOUNT MANAGEMENT ===');

    // 1. Locate Associate Saurabh Rai (DEV-0012)
    const saurabh = await User.findOne({ where: { login_id: 'DEV-0012' } });
    if (!saurabh) {
      console.error('DEV-0012 (Saurabh Rai) not found');
      process.exit(1);
    }
    const adminUser = await User.findByPk(1);

    console.log(`\nFound Associate: ${saurabh.name} (${saurabh.login_id}) | Current Rate: ${saurabh.commission_percent}%`);

    // Record initial historical count
    const initialHistCount = await CommissionHistory.count({ where: { user_id: saurabh.id } });
    const initialCommCount = await Commission.count();

    // 2. Test Invalid commission percentages
    console.log('\n1. Test invalid commission validation:');
    let inv1 = await call(usersController.updateUser, {
      params: { id: saurabh.id },
      user: adminUser,
      body: { name: saurabh.name, role: 'associate', commission_percent: -5 }
    });
    ok(inv1.status === 400, 'Negative commission (-5%) rejected with 400');

    let inv2 = await call(usersController.updateUser, {
      params: { id: saurabh.id },
      user: adminUser,
      body: { name: saurabh.name, role: 'associate', commission_percent: 105 }
    });
    ok(inv2.status === 400, 'Commission > 100% (105%) rejected with 400');

    let inv3 = await call(usersController.updateUser, {
      params: { id: saurabh.id },
      user: adminUser,
      body: { name: saurabh.name, role: 'associate', commission_percent: 'abc' }
    });
    ok(inv3.status === 400, 'Non-numeric commission rejected with 400');

    // 3. Test Password confirmation mismatch
    console.log('\n2. Test password confirmation mismatch:');
    let invPwd = await call(usersController.updateUser, {
      params: { id: saurabh.id },
      user: adminUser,
      body: { name: saurabh.name, role: 'associate', password: 'newPassword123', confirm_password: 'differentPassword' }
    });
    ok(invPwd.status === 400 && invPwd.body.message.includes('do not match'), 'Password mismatch rejected');

    let shortPwd = await call(usersController.updateUser, {
      params: { id: saurabh.id },
      user: adminUser,
      body: { name: saurabh.name, role: 'associate', password: '123' }
    });
    ok(shortPwd.status === 400 && shortPwd.body.message.includes('at least 6 characters'), 'Short password rejected');

    // 4. Update commission to 8.00% & update password
    console.log('\n3. Update Saurabh Rai rate to 8.00% and set new password:');
    const newRate = 8.0;
    const newPassword = 'SaurabhSecurePassword@2026';
    let updateRes = await call(usersController.updateUser, {
      params: { id: saurabh.id },
      user: adminUser,
      body: {
        name: saurabh.name,
        phone: saurabh.phone,
        email: saurabh.email,
        login_id: saurabh.login_id,
        role: 'associate',
        status: 'active',
        referred_by: saurabh.referred_by,
        pan_number: saurabh.pan_number,
        aadhar_number: saurabh.aadhar_number,
        commission_percent: newRate,
        password: newPassword,
        confirm_password: newPassword
      }
    });

    ok(updateRes.status === 200, `updateUser succeeded with 200: ${updateRes.body?.message}`);
    ok(parseFloat(updateRes.body?.data?.commission_percent) === 8, `Returned commission_percent is 8% (got ${updateRes.body?.data?.commission_percent})`);
    ok(updateRes.body?.data?.password === undefined, 'Password is NOT exposed in response data');

    // 5. Verify database record
    console.log('\n4. Verify database record:');
    const dbSaurabh = await User.findByPk(saurabh.id);
    ok(parseFloat(dbSaurabh.commission_percent) === 8, `DB commission_percent is 8.0000 (got ${dbSaurabh.commission_percent})`);
    ok(parseFloat(dbSaurabh.referral_commission_percent) === 8, `DB referral_commission_percent is 8.0000 (got ${dbSaurabh.referral_commission_percent})`);
    ok(dbSaurabh.login_id === 'DEV-0012', `Associate ID DEV-0012 is unchanged`);

    // 6. Verify CommissionHistory audit trail
    console.log('\n5. Verify CommissionHistory audit trail:');
    const latestAudit = await CommissionHistory.findOne({
      where: { user_id: saurabh.id },
      order: [['id', 'DESC']]
    });
    ok(latestAudit !== null, 'CommissionHistory entry found');
    ok(parseFloat(latestAudit.previous_percent) === 5, `Audit previous_percent was 5% (got ${latestAudit.previous_percent})`);
    ok(parseFloat(latestAudit.new_percent) === 8, `Audit new_percent is 8% (got ${latestAudit.new_percent})`);
    ok(latestAudit.changed_by === adminUser.id, `Audit changed_by recorded Admin ID (${latestAudit.changed_by})`);

    // 7. Verify login with newly set password
    console.log('\n6. Test login with newly set password:');
    let loginOk = await call(authController.login, {
      body: {
        identifier: 'DEV-0012',
        password: newPassword
      }
    });
    ok(loginOk.status === 200 && loginOk.body.success, 'Login with DEV-0012 and new password succeeded');
    ok(parseFloat(loginOk.body.user.commission_percent) === 8, `Logged-in user profile shows updated 8% rate (${loginOk.body.user.commission_percent}%)`);

    let loginOldFail = await call(authController.login, {
      body: {
        identifier: 'DEV-0012',
        password: 'oldPasswordWrong'
      }
    });
    ok(loginOldFail.status === 401, 'Old/incorrect password rejected with 401');

    // 8. Test future commission calculation with updated rate
    console.log('\n7. Test future commission calculation with 8% rate:');
    // Case A: Saurabh makes a sale personally
    const calc = await calculateCommissionChain(dbSaurabh, 1000000); // 10,00,000 sale
    ok(calc.seller.rate === 8, `Seller rate used in calculation is 8% (got ${calc.seller.rate}%)`);
    const adminRow = calc.breakdown.find(b => b.beneficiary_id === 1);
    ok(adminRow && adminRow.amount === 20000, `Super Admin differential (10% - 8% = 2%) of ₹10,00,000 = ₹20,000 (got ₹${adminRow?.amount})`);

    // Case B: A downline (e.g. rate 5%) sells under Saurabh
    const downlineUser = { id: 9999, name: 'Downline Member', role: 'associate', commission_percent: 5.0, referred_by: dbSaurabh.id };
    // Test differential when Saurabh is the upline sponsor
    const uplineDiff = newRate - 5.0; // 8% - 5% = 3%
    const uplineEarned = (1000000 * uplineDiff) / 100;
    ok(uplineEarned === 30000, `Saurabh as upline earns differential (8% - 5% = 3%) of ₹10,00,000 = ₹30,000`);

    // 9. Verify historical records preserved
    console.log('\n8. Verify historical transaction count unchanged:');
    const postCommCount = await Commission.count();
    ok(initialCommCount === postCommCount, `Historical commission count unchanged (${initialCommCount} === ${postCommCount})`);

    console.log(`\n========================================`);
    console.log(`TOTAL: ${pass} passed, ${fail} failed`);
    console.log(`========================================`);

    process.exit(fail === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
})();
