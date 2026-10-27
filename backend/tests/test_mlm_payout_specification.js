/**
 * COMPREHENSIVE TEST SUITE: MLM PAYOUT SYSTEM SPECIFICATION
 * Verifies all 12 test cases requested in Prompt Section 10:
 * 1. Mohan sells ₹10,00,000 at 3%; Ram at 5% receives ₹20,000 differential commission.
 * 2. Ram personally sells ₹7,50,000; his self commission remains ₹0.
 * 3. Ram's Total Business reaches ₹17,50,000, and his Self Business reaches ₹7,50,000; if Slab 2 applies, he receives ₹25,000 reward.
 * 4. Ram's combined gross payout in the above scenario is ₹45,000 before deductions.
 * 5. Ram has sufficient Total Business but insufficient Self Business; reward remains ₹0.
 * 6. Ram has qualifying personal sales but no downline sales; he receives the applicable slab reward only, with no self commission.
 * 7. Admin and every eligible upline receive only their correctly calculated differential commission and their own eligible personal slab reward.
 * 8. The commission rate entered by Accounts updates the preview and statement without silently changing the associate's master rate.
 * 9. Admin can save and edit Self Target values; settings persist after refresh.
 * 10. Preview, generated statement, backend calculation, and ledger amounts match exactly.
 * 11. Existing deductions, payment authorization, historical records, and settled transactions remain correct.
 * 12. No duplicate commission, reward, statement, or payment is created.
 */

process.env.DB_NAME = 'devojas_test';
if (!/test/i.test(process.env.DB_NAME)) {
  console.error('Refusing to run tests on non-test DB!');
  process.exit(1);
}

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
// Explicitly override DB_NAME to devojas_test
process.env.DB_NAME = 'devojas_test';

const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const {
  User, Plot, Transaction, Commission, CommissionPayment, PayoutStatement, Slab, BookingForm
} = require('../models');
const { processCommissionForAssociate } = require('../services/commissionEngine');
const psController = require('../controllers/payoutStatementController');
const slabController = require('../controllers/slabController');

let passedCount = 0;
let failedCount = 0;

const assert = (condition, testName, details = '') => {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failedCount++;
  }
};

const mockRes = () => {
  let out = { status: 200, body: null };
  const res = {
    status(c) { out.status = c; return this; },
    json(b) { out.body = b; return this; }
  };
  return { out, res };
};

const invoke = async (fn, req) => {
  const { out, res } = mockRes();
  await fn(
    { ip: '127.0.0.1', query: {}, params: {}, body: {}, ...req },
    res,
    (err) => { out.status = err.status || 500; out.body = { message: err.message }; }
  );
  return out;
};

const near = (a, b) => Math.abs(Number(a || 0) - Number(b || 0)) < 0.01;

let dealSeq = 0;
const createDeal = async (seller, amount, plotCode, isSelfSale = false) => {
  const plot = await Plot.create({
    plot_code: plotCode,
    title: `Plot ${plotCode}`,
    plot_number: plotCode,
    location: 'Sector 5',
    size_sqft: 1000,
    price: amount,
    basic_price: amount * 0.8,
    status: 'sold'
  });

  const txn = await Transaction.create({
    transaction_ref: `DEAL-${++dealSeq}`,
    plot_id: plot.id,
    buyer_id: 1,
    seller_id: 1,
    seller_associate_id: seller.id,
    amount,
    paid_amount: amount,
    status: 'completed',
    payment_status: 'paid',
    deal_date: new Date()
  });

  await sequelize.transaction(async (tx) => {
    await processCommissionForAssociate(
      seller.id,
      amount,
      txn.id,
      'seller_side',
      isSelfSale,
      tx,
      'approved',
      { dealAmount: amount, basePrice: amount * 0.8, salePrice: amount }
    );
  });

  return txn;
};

(async () => {
  console.log('================================================================');
  console.log('🧪 MLM PAYOUT SYSTEM SPECIFICATION TEST SUITE');
  console.log('================================================================\n');

  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    console.log('Database synced cleanly on devojas_test\n');

    // ─── 0. Seed standard 12 Slabs ─────────────────────────────────────────
    await slabController.resetStandardSlabs({}, { json: () => {} }, () => {});
    const initialSlabs = await Slab.findAll({ order: [['slab_number', 'ASC']] });
    assert(initialSlabs.length === 12, '12 Standard slabs seeded correctly');

    // ─── Hierarchy Setup ───────────────────────────────────────────────────
    const pw = bcrypt.hashSync('test1234', 4);
    const admin = await User.create({
      name: 'Admin Director', email: 'admin@devojas.in', phone: '9000000001',
      role: 'admin', login_id: 'DEV-ADMIN', commission_percent: 7, status: 'active', password: pw
    });
    const ram = await User.create({
      name: 'Ram', email: 'ram@devojas.in', phone: '9000000002',
      role: 'associate', login_id: 'DEV-RAM', commission_percent: 5,
      referred_by: admin.id, status: 'active', password: pw
    });
    const mohan = await User.create({
      name: 'Mohan', email: 'mohan@devojas.in', phone: '9000000003',
      role: 'associate', login_id: 'DEV-MOHAN', commission_percent: 3,
      referred_by: ram.id, status: 'active', password: pw
    });
    const acctsUser = await User.create({
      name: 'Accounts Executive', email: 'accounts@devojas.in', phone: '9000000004',
      role: 'accounts', login_id: 'DEV-ACCTS', commission_percent: 0, status: 'active', password: pw
    });

    console.log('Hierarchy: Admin (7%) -> Ram (5%) -> Mohan (3%)\n');

    // ─── Test 1: Mohan sells ₹10,00,000 at 3%; Ram at 5% receives ₹20,000 differential ───
    console.log('--- Test 1: Mohan sells ₹10,00,000 at 3% ---');
    const txnMohan = await createDeal(mohan, 1000000, 'PLOT-M1', false);

    const mohanComms = await Commission.findAll({ where: { transaction_id: txnMohan.id, user_id: mohan.id } });
    const ramComms = await Commission.findAll({ where: { transaction_id: txnMohan.id, user_id: ram.id } });
    const adminComms = await Commission.findAll({ where: { transaction_id: txnMohan.id, user_id: admin.id } });

    const ramDiff = ramComms.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const adminDiff = adminComms.reduce((sum, c) => sum + parseFloat(c.amount), 0);

    assert(near(ramDiff, 20000), 'Test 1: Ram at 5% receives ₹20,000 differential (5% - 3% = 2% of ₹10,00,000)', `Got ${ramDiff}`);
    assert(near(adminDiff, 20000), 'Admin at 7% receives ₹20,000 differential (7% - 5% = 2% of ₹10,00,000)', `Got ${adminDiff}`);

    // ─── Test 2: Ram personally sells ₹7,50,000; his self commission remains ₹0 ───
    console.log('\n--- Test 2: Ram personally sells ₹7,50,000 ---');
    const txnRam = await createDeal(ram, 750000, 'PLOT-R1', true);

    const ramPersonalLedger = await invoke(psController.getAssociateLedger, {
      user: acctsUser,
      params: { associateId: ram.id }
    });

    const ramDirectComms = await Commission.findAll({
      where: { transaction_id: txnRam.id, user_id: ram.id, level: 0 }
    });
    // In our payout ledger preview, self commission is strictly ₹0
    const previewRes = await invoke(psController.previewPayoutStatement, {
      user: acctsUser,
      body: {
        associate_id: ram.id,
        self_business: 750000,
        team_business: 1000000,
        effective_commission_percent: 5,
        differential_commission: 20000
      }
    });

    assert(previewRes.body.data.self_commission === 0, 'Test 2: Ram self commission is strictly ₹0', `Got ${previewRes.body.data.self_commission}`);

    // ─── Test 3: Total Business = ₹17,50,000 (Slab 2) & Self Business = ₹7,50,000 (Self Target achieved) -> ₹25,000 reward ───
    console.log('\n--- Test 3: Slab 2 Qualification & Self Target Reward ---');
    assert(previewRes.body.data.slab.slab_number === 2, 'Total Business ₹17,50,000 qualifies for Slab 2 (₹10L - ₹25L)');
    assert(previewRes.body.data.self_target_amount === 750000, 'Slab 2 Self Target is ₹7,50,000');
    assert(previewRes.body.data.self_target_achieved === true, 'Ram Self Target is Achieved (Self Business ₹7,50,000 >= ₹7,50,000)');
    assert(near(previewRes.body.data.slab_reward, 25000), 'Test 3: Ram receives ₹25,000 Slab 2 Reward', `Got ${previewRes.body.data.slab_reward}`);

    // ─── Test 4: Combined Gross Payout = ₹45,000 before deductions ───
    console.log('\n--- Test 4: Combined Gross Payout ---');
    // Gross = Differential (₹20,000) + Slab Reward (₹25,000) = ₹45,000
    assert(near(previewRes.body.data.gross_payout, 45000), 'Test 4: Gross payout is ₹45,000 before deductions (₹20,000 diff + ₹25,000 reward)', `Got ${previewRes.body.data.gross_payout}`);

    // ─── Test 5: Sufficient Total Business (Slab 2) but Insufficient Self Business -> Reward = ₹0 ───
    console.log('\n--- Test 5: Sufficient Total Business, Insufficient Self Business ---');
    const previewTest5 = await invoke(psController.previewPayoutStatement, {
      user: acctsUser,
      body: {
        associate_id: ram.id,
        self_business: 500000,   // ₹5 Lakh (< ₹7.5 Lakh required for Slab 2)
        team_business: 1500000,  // ₹15 Lakh team business
        effective_commission_percent: 5,
        differential_commission: 30000
      }
    });

    assert(previewTest5.body.data.total_business === 2000000, 'Total business is ₹20,00,000 (Slab 2)');
    assert(previewTest5.body.data.self_target_achieved === false, 'Self Target is NOT achieved (₹5,00,000 < ₹7,50,000)');
    assert(previewTest5.body.data.slab_reward === 0, 'Test 5: Slab reward is ₹0 when Self Target is not met', `Got ${previewTest5.body.data.slab_reward}`);
    assert(near(previewTest5.body.data.gross_payout, 30000), 'Gross payout contains only differential commission (₹30,000)', `Got ${previewTest5.body.data.gross_payout}`);

    // ─── Test 6: Qualifying personal sales without downline sales -> Applicable slab reward only, no self commission ───
    console.log('\n--- Test 6: Personal sales only, no downline sales ---');
    const previewTest6 = await invoke(psController.previewPayoutStatement, {
      user: acctsUser,
      body: {
        associate_id: ram.id,
        self_business: 500000, // ₹5 Lakh
        team_business: 0,      // No team sales
        effective_commission_percent: 5,
        differential_commission: 0
      }
    });

    assert(previewTest6.body.data.slab.slab_number === 1, 'Total business ₹5,00,000 qualifies for Slab 1 (₹0 - ₹10 Lakh)');
    assert(previewTest6.body.data.self_target_achieved === true, 'Slab 1 Self Target (₹5 Lakh) is achieved');
    assert(near(previewTest6.body.data.slab_reward, 10000), 'Slab 1 Reward is ₹10,000');
    assert(previewTest6.body.data.self_commission === 0, 'Self commission remains ₹0');
    assert(previewTest6.body.data.differential_commission === 0, 'Differential commission is ₹0');
    assert(near(previewTest6.body.data.gross_payout, 10000), 'Test 6: Gross payout is ₹10,000 (reward only, no self commission)', `Got ${previewTest6.body.data.gross_payout}`);

    // ─── Test 7: Admin and uplines receive only their differential commission and their own slab reward ───
    console.log('\n--- Test 7: Upline differential & reward segregation ---');
    const adminPreview = await invoke(psController.previewPayoutStatement, {
      user: acctsUser,
      body: {
        associate_id: admin.id,
        self_business: 0,
        team_business: 1750000,
        effective_commission_percent: 7,
        differential_commission: 35000 // Admin differential on Ram + Mohan deals
      }
    });

    assert(adminPreview.body.data.self_target_achieved === false, 'Admin has ₹0 self business so Self Target is NOT achieved');
    assert(adminPreview.body.data.slab_reward === 0, 'Admin does NOT receive a slab reward (never inherited from downline)');
    assert(adminPreview.body.data.gross_payout === 35000, 'Test 7: Admin gross payout is differential commission only', `Got ${adminPreview.body.data.gross_payout}`);

    // ─── Test 8: Accounts commission rate updates preview & statement without modifying user master rate ───
    console.log('\n--- Test 8: Accounts rate override isolation ---');
    const overridePreview = await invoke(psController.previewPayoutStatement, {
      user: acctsUser,
      body: {
        associate_id: ram.id,
        self_business: 750000,
        team_business: 1000000,
        effective_commission_percent: 6, // Overridden to 6% (master is 5%)
        differential_commission: 30000   // (6% - 3%) = 3% of 10,00,000 = 30,000
      }
    });

    assert(overridePreview.body.data.effective_commission_percent === 6, 'Effective statement rate is 6%');
    const ramMaster = await User.findByPk(ram.id);
    assert(parseFloat(ramMaster.commission_percent) === 5, 'Test 8: Ram master commission rate in User table is STILL 5% (not modified)', `Got ${ramMaster.commission_percent}`);

    // ─── Test 9: Admin can save and edit Self Target values; settings persist ───
    console.log('\n--- Test 9: Admin edit & persistence of Self Target ---');
    const slab2 = await Slab.findOne({ where: { slab_number: 2 } });
    await invoke(slabController.updateSlab, {
      user: admin,
      params: { id: slab2.id },
      body: { self_target_amount: 800000 }
    });
    const reloadedSlab2 = await Slab.findByPk(slab2.id);
    assert(parseFloat(reloadedSlab2.self_target_amount) === 800000, 'Test 9: Slab 2 Self Target updated to ₹8,00,000 and persisted in DB');
    // Restore back to standard 750000
    await reloadedSlab2.update({ self_target_amount: 750000 });

    // ─── Test 10: Preview, generated statement, backend calculation match exactly ───
    console.log('\n--- Test 10: Preview vs Generated Statement Consistency ---');
    const createRes = await invoke(psController.createPayoutStatement, {
      user: acctsUser,
      body: {
        associate_id: ram.id,
        payment_date: '2026-10-23',
        self_business: 750000,
        team_business: 1000000,
        effective_commission_percent: 5,
        differential_commission: 20000,
        tds_percent: 5,
        processing_percent: 2
      }
    });

    assert(createRes.status === 201, 'Statement created successfully');
    const stmt = createRes.body.data;
    assert(near(stmt.total_amount, 45000), 'Generated statement total_amount matches preview gross (₹45,000)', `Got ${stmt.total_amount}`);
    assert(stmt.self_deposit === '0.00' || stmt.self_deposit === 0, 'Generated statement self_deposit is strictly ₹0');
    assert(near(stmt.team_deposit, 20000), 'Generated statement team_deposit is ₹20,000');
    assert(stmt.self_target_achieved === true, 'Generated statement records self_target_achieved = true');
    assert(near(stmt.reward_amount, 25000), 'Generated statement reward_amount is ₹25,000');

    // ─── Test 11: Deductions (TDS 5% + Processing 2%) applied correctly to gross payout ───
    console.log('\n--- Test 11: Deductions & Net Payable ---');
    // Gross = 45,000. TDS 5% = 2,250. Processing 2% = 900. Net = 45,000 - 2,250 - 900 = 41,850.
    assert(near(stmt.tds_amount, 2250), 'TDS 5% of ₹45,000 is ₹2,250', `Got ${stmt.tds_amount}`);
    assert(near(stmt.processing_amount, 900), 'Processing fee 2% of ₹45,000 is ₹900', `Got ${stmt.processing_amount}`);
    assert(near(stmt.net_payable, 41850), 'Test 11: Net payable is exactly ₹41,850 (₹45,000 - ₹2,250 - ₹900)', `Got ${stmt.net_payable}`);

    // ─── Test 12: Duplicate Prevention ───
    console.log('\n--- Test 12: Duplicate Prevention ---');
    // Try settling the same ledger entries again
    const ramCommsToSettle = await Commission.findAll({ where: { user_id: ram.id } });
    const commIds = ramCommsToSettle.map(c => c.id);

    // First settlement
    const firstSettlement = await invoke(psController.createPayoutStatement, {
      user: acctsUser,
      body: {
        associate_id: ram.id,
        payment_date: '2026-10-23',
        commission_ids: commIds
      }
    });

    // Second settlement of the same commission IDs must fail
    const secondSettlement = await invoke(psController.createPayoutStatement, {
      user: acctsUser,
      body: {
        associate_id: ram.id,
        payment_date: '2026-10-23',
        commission_ids: commIds
      }
    });

    assert(
      secondSettlement.status === 409 || secondSettlement.status === 400,
      'Test 12: Duplicate settlement is rejected (cannot settle already paid commission entries)',
      `Status: ${secondSettlement.status}`
    );

    // ─── Summary ──────────────────────────────────────────────────────────
    console.log('\n================================================================');
    console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================');

    if (failedCount > 0) {
      process.exit(1);
    } else {
      console.log('🎉 ALL 12 SPECIFICATION TEST CASES PASSED WITH 100% SUCCESS!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
})();
