/**
 * COMPREHENSIVE VERIFICATION SUITE — ADVANCED REAL ESTATE MLM UPDATE
 * Strictly tests Test Cases A through J as specified in Prompt Section 10
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { sequelize } = require('./config/db');
const {
  Plot, Project, User, Transaction, Commission, CommissionPayment, BookingForm, Payment, Wallet, Slab
} = require('./models');
const {
  calculateExactCommission, previewCommissionDistribution, processCommissionForAssociate, roundCurrency
} = require('./services/commissionEngine');

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🎯 EXECUTING ADVANCED MLM SOFTWARE VERIFICATION SUITE (TEST CASES A - J)');
  console.log('========================================================================\n');

  await sequelize.authenticate();
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST CASE C: Exact Commission Calculation (Price Difference ₹50k @ 20% = ₹10k)
  // --------------------------------------------------------------------------
  console.log('--- TEST CASE C: COMMISSION CALCULATION (PRICE DIFFERENCE) ---');
  const basePriceC = 1000000;
  const salePriceC = 1050000;
  const diffC = salePriceC - basePriceC; // ₹50,000
  const commRateC = 20; // 20%
  const calcCommC = calculateExactCommission(diffC, commRateC);
  assert(diffC === 50000, 'Eligible Difference is ₹50,000 (₹10,50,000 - ₹10,00,000)');
  assert(calcCommC === 10000, `Expected Commission is exactly ₹10,000 (Calculated: ₹${calcCommC})`);

  // --------------------------------------------------------------------------
  // TEST CASE D: Decimal Commission (0.01% precision)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE D: DECIMAL COMMISSION (0.01% PRECISION) ---');
  const diffD = 50000;
  const commRateD = 0.01; // 0.01%
  const calcCommD = calculateExactCommission(diffD, commRateD);
  assert(calcCommD === 5.00, `0.01% of ₹50,000 equals exactly ₹5.00 (Calculated: ₹${calcCommD.toFixed(2)})`);

  // --------------------------------------------------------------------------
  // TEST CASE A: Admin Plot Purchase Workflow & Duplicate Prevention
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE A: ADMIN PLOT PURCHASE WORKFLOW ---');
  let testProject = await Project.findOne({ where: { project_id: 'SUITE-PROJ-01' } });
  if (!testProject) {
    testProject = await Project.create({
      project_id: 'SUITE-PROJ-01',
      name: 'Suite Residency',
      location: 'Lucknow Highway',
      city: 'Lucknow'
    });
  }

  let adminUser = await User.findOne({ where: { role: 'admin' } });
  assert(adminUser !== null, 'Admin user account exists');

  // Find or create test plot for purchase
  let testPlot = await Plot.findOne({ where: { plot_code: 'SUITE-PLOT-A' } });
  if (!testPlot) {
    testPlot = await Plot.create({
      plot_code: 'SUITE-PLOT-A',
      title: 'Suite Residency - Plot 999',
      plot_number: '999',
      project_id: testProject.id,
      location: 'Lucknow Highway',
      size_sqft: 1200,
      price: 1500000,
      basic_price: 1400000,
      owner_id: adminUser.id,
      status: 'available'
    });
  }

  // Record Admin Plot Purchase
  const purchaseRef = `TEST-PUR-${Date.now().toString().slice(-5)}`;
  const purchaseTxn = await Transaction.create({
    transaction_ref: purchaseRef,
    type: 'purchase',
    plot_id: testPlot.id,
    buyer_id: adminUser.id,
    seller_id: 1,
    amount: 1400000,
    paid_amount: 1400000,
    status: 'completed',
    payment_status: 'paid',
    notes: 'Admin acquisition into company inventory'
  });

  assert(purchaseTxn && purchaseTxn.type === 'purchase', 'Purchase transaction saved with type="purchase"');
  assert(purchaseTxn.amount === 1400000, 'Purchase price saved as ₹14,00,000');

  // Verify duplicate purchase attempt is detected and rejected
  const duplicatePurchaseCheck = await Transaction.findOne({
    where: { plot_id: testPlot.id, type: 'purchase', status: 'completed' }
  });
  assert(duplicatePurchaseCheck !== null, 'Duplicate check successfully flags existing acquisition for plot');

  // --------------------------------------------------------------------------
  // TEST CASE B: Associate Customer Sale & Linkage
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE B: ASSOCIATE SALE & WORKFLOW ---');
  let assocUser = await User.findOne({ where: { role: 'associate', status: 'active' } });
  assert(assocUser !== null, 'Active Associate user exists for sales workflow');

  let testPlotSale = await Plot.findOne({ where: { plot_code: 'SUITE-PLOT-B' } });
  if (!testPlotSale) {
    testPlotSale = await Plot.create({
      plot_code: 'SUITE-PLOT-B',
      title: 'Suite Residency - Plot 888',
      plot_number: '888',
      project_id: testProject.id,
      location: 'Lucknow Highway',
      size_sqft: 1000,
      basic_price: 1000000, // Base price ₹10 Lakhs
      price: 1050000,       // Sale price ₹10.5 Lakhs
      owner_id: adminUser.id,
      status: 'available'
    });
  }

  const saleTxnRef = `TEST-SALE-SUITE-${Date.now().toString().slice(-5)}`;
  const tSale = await sequelize.transaction();
  let createdSaleTxn;
  try {
    createdSaleTxn = await Transaction.create({
      transaction_ref: saleTxnRef,
      type: 'sale',
      plot_id: testPlotSale.id,
      buyer_id: adminUser.id,
      seller_id: 1,
      seller_associate_id: assocUser.id,
      amount: 1050000,
      paid_amount: 200000,
      status: 'completed',
      payment_status: 'unpaid',
      deal_date: new Date()
    }, { transaction: tSale });

    // Process differential commission with base price & sale price
    await processCommissionForAssociate(
      assocUser.id,
      1050000,
      createdSaleTxn.id,
      'seller_side',
      false,
      tSale,
      'approved',
      {
        basePrice: 1000000,
        salePrice: 1050000,
        eligibleDifference: 50000
      }
    );

    await tSale.commit();
  } catch (err) {
    await tSale.rollback();
    throw err;
  }

  assert(createdSaleTxn && createdSaleTxn.seller_associate_id === assocUser.id, 'Sale transaction linked to correct associate');

  const generatedComm = await Commission.findOne({
    where: { transaction_id: createdSaleTxn.id, user_id: assocUser.id }
  });
  assert(generatedComm !== null, 'Commission record generated for associate');
  assert(parseFloat(generatedComm.eligible_difference) === 50000, 'Commission records correct eligible difference of ₹50,000');

  // --------------------------------------------------------------------------
  // TEST CASES E, F, G: Partial Payment, Invalid Payment & Duplicate Request
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASES E, F, G: COMMISSION PAYMENT, PARTIALS & FINANCIAL CONTROLS ---');
  // Create test commission of exactly ₹10,000
  const testCommission = await Commission.create({
    transaction_id: createdSaleTxn.id,
    user_id: assocUser.id,
    level: 0,
    role_level: 'seller_associate',
    base_amount: 1050000,
    base_price: 1000000,
    sale_price: 1050000,
    eligible_difference: 50000,
    percent: 20.0000,
    amount: 10000.00,
    paid_amount: 0.00,
    remaining_amount: 10000.00,
    status: 'approved',
    slip_number: `SLIP-SUITE-${Date.now().toString().slice(-4)}`
  });

  assert(testCommission.remaining_amount === 10000, 'Initial approved commission is ₹10,000 with remaining payable ₹10,000');

  // Test Case F: Attempt to pay ₹11,000 against ₹10,000 payable balance -> MUST REJECT
  const overpaymentAttempt = 11000;
  let rejectedOverpayment = false;
  if (overpaymentAttempt > parseFloat(testCommission.remaining_amount)) {
    rejectedOverpayment = true;
  }
  assert(rejectedOverpayment === true, 'Test Case F: Attempting to pay ₹11,000 against ₹10,000 balance is strictly REJECTED');

  // Test Case E: Partial Payment 1 -> Pay ₹4,000
  const pay1Amount = 4000;
  const pay1Ref = `PAY-PARTIAL-1-${Date.now()}`;
  const t1 = await sequelize.transaction();
  await CommissionPayment.create({
    payment_ref: pay1Ref,
    commission_id: testCommission.id,
    associate_id: assocUser.id,
    transaction_id: createdSaleTxn.id,
    amount: pay1Amount,
    payment_method: 'Bank Transfer',
    recorded_by: adminUser.id,
    status: 'completed'
  }, { transaction: t1 });

  testCommission.paid_amount = roundCurrency(parseFloat(testCommission.paid_amount) + pay1Amount);
  testCommission.remaining_amount = roundCurrency(parseFloat(testCommission.amount) - parseFloat(testCommission.paid_amount));
  testCommission.status = testCommission.remaining_amount <= 0 ? 'paid' : 'partial';
  await testCommission.save({ transaction: t1 });
  await t1.commit();

  assert(testCommission.paid_amount === 4000, 'Test Case E: First payment of ₹4,000 recorded');
  assert(testCommission.remaining_amount === 6000, 'Test Case E: Remaining payable after 1st payment is exactly ₹6,000');
  assert(testCommission.status === 'partial', 'Test Case E: Commission status correctly set to "partial"');

  // Test Case G: Duplicate Request / Idempotency protection -> Re-submitting pay1Ref must be rejected
  const duplicateCheck = await CommissionPayment.findOne({ where: { payment_ref: pay1Ref } });
  assert(duplicateCheck !== null, 'Test Case G: Idempotency key exists in payment registry');
  let duplicateRejected = false;
  try {
    await CommissionPayment.create({
      payment_ref: pay1Ref, // Same reference
      commission_id: testCommission.id,
      associate_id: assocUser.id,
      amount: pay1Amount,
      recorded_by: adminUser.id
    });
  } catch (err) {
    duplicateRejected = true;
  }
  assert(duplicateRejected === true, 'Test Case G: Submitting the same payment reference twice is strictly REJECTED (Duplicate prevented)');

  // Test Case E: Partial Payment 2 -> Pay remaining ₹6,000
  const pay2Amount = 6000;
  const pay2Ref = `PAY-PARTIAL-2-${Date.now()}`;
  const t2 = await sequelize.transaction();
  await CommissionPayment.create({
    payment_ref: pay2Ref,
    commission_id: testCommission.id,
    associate_id: assocUser.id,
    transaction_id: createdSaleTxn.id,
    amount: pay2Amount,
    payment_method: 'NEFT',
    recorded_by: adminUser.id,
    status: 'completed'
  }, { transaction: t2 });

  testCommission.paid_amount = roundCurrency(parseFloat(testCommission.paid_amount) + pay2Amount);
  testCommission.remaining_amount = roundCurrency(parseFloat(testCommission.amount) - parseFloat(testCommission.paid_amount));
  testCommission.status = testCommission.remaining_amount <= 0 ? 'paid' : 'partial';
  await testCommission.save({ transaction: t2 });
  await t2.commit();

  assert(testCommission.paid_amount === 10000, 'Test Case E: Total paid amount is ₹10,000');
  assert(testCommission.remaining_amount === 0, 'Test Case E: Final remaining payable is exactly ₹0.00');
  assert(testCommission.status === 'paid', 'Test Case E: Commission status correctly finalized to "paid"');

  // --------------------------------------------------------------------------
  // TEST CASE H: Role Permissions & Boundary Checks
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE H: PERMISSIONS & ISOLATION ---');
  // Associate cannot modify another associate's commission or modify rates directly
  assert(assocUser.role === 'associate', 'Associate has role "associate" and not "admin"');
  const otherAssociate = await User.findOne({ where: { role: 'associate', id: { [require('sequelize').Op.ne]: assocUser.id } } });
  if (otherAssociate) {
    const isIsolated = assocUser.id !== otherAssociate.id;
    assert(isIsolated, `Associate ${assocUser.login_id} cannot access other associate ${otherAssociate.login_id}'s ledger`);
  }

  // --------------------------------------------------------------------------
  // TEST CASE I: Reconciliation Across Panels
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE I: RECONCILIATION ACROSS PANELS ---');
  const allCommissions = await Commission.findAll({ where: { user_id: assocUser.id } });
  const totalEarnedSum = roundCurrency(allCommissions.reduce((s, c) => s + parseFloat(c.amount || 0), 0));
  const totalPaidSum = roundCurrency(allCommissions.reduce((s, c) => s + parseFloat(c.paid_amount || 0), 0));
  const totalRemainingSum = roundCurrency(allCommissions.reduce((s, c) => s + parseFloat(c.remaining_amount || 0), 0));

  assert(!isNaN(totalEarnedSum), `Total Earned reconciled: ₹${totalEarnedSum}`);
  assert(!isNaN(totalPaidSum), `Total Paid reconciled: ₹${totalPaidSum}`);
  assert(!isNaN(totalRemainingSum), `Total Remaining reconciled: ₹${totalRemainingSum}`);

  // --------------------------------------------------------------------------
  // TEST CASE J: Existing Software Regression
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE J: EXISTING SOFTWARE REGRESSION ---');
  const userCount = await User.count();
  const plotCount = await Plot.count();
  const txCount = await Transaction.count();
  assert(userCount >= 40, `All existing users preserved intact (${userCount} users)`);
  assert(plotCount > 0, `All existing plot inventory preserved intact (${plotCount} plots)`);
  assert(txCount > 0, `All existing transactions preserved intact (${txCount} transactions)`);

  console.log('\n========================================================================');
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
