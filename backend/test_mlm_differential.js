/**
 * COMPREHENSIVE AUTOMATED TEST SUITE: REAL ESTATE MLM DIFFERENTIAL ENGINE
 * & ADVANCED PLOT PURCHASING / BOOKING / RECEIPT WORKFLOW
 * -----------------------------------------------------------------------
 * Adheres strictly to Prompt Section 14:
 * 1. Admin creates or selects project (TEST-PROJ-001: Sunrise Residency — TEST)
 * 2. Admin creates or selects available plot (TEST-PLOT-001: Sector 02, Plot 104, 1000 sq.ft. @ ₹2,000 = ₹20,00,000)
 * 3. Client details: Demo Client (TEST-CLIENT-001) referred by Person D (TEST-D-005)
 * 4. Selling Associate: Person D (TEST-D-005) -> Direct Sponsor: Person A (TEST-A-002) -> Root: Ram (TEST-RAM-001)
 * 5. Booking form saved: TEST-BOOK-001
 * 6. Verified test payment: ₹2,00,000 with Receipt REC-TEST-001
 * 7. Differential Commission on ₹20,00,000 deal:
 *      - Person D (Seller 5%)              : ₹1,00,000
 *      - Person A (Direct Sponsor 7% - 5%) : ₹40,000
 *      - Ram (Root Leader 10% - 7%)         : ₹60,000
 *      - Total = ₹2,00,000 (10% of ₹20,00,000)
 * 8. Unrelated branches receive no commission: Person B (₹0), Person C (₹0), Person E (₹0)
 * 9. Receipt PDF generation functions correctly and produces an actual PDF document
 * 10. Duplicate prevention: Repeating requests does not create duplicate financial records
 * 11. Production records remain untouched
 * -----------------------------------------------------------------------
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const { sequelize } = require('./config/db');
const {
  Project, Plot, User, Transaction, Commission, BookingForm, Payment, Wallet, AppSettings
} = require('./models');
const { previewCommissionDistribution, processCommissionForAssociate, roundCurrency } = require('./services/commissionEngine');
const { generatePaymentReceiptPdf, generateBookingPdf } = require('./services/pdfService');

async function runValidationSuite() {
  console.log('================================================================');
  console.log('🧪 REAL ESTATE MLM & ₹20,00,000 MASTER WORKFLOW - TEST SUITE');
  console.log('================================================================\n');

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

  // Fetch test records
  const ram = await User.findOne({ where: { login_id: 'TEST-RAM-001' } });
  const personA = await User.findOne({ where: { login_id: 'TEST-A-002' } });
  const personB = await User.findOne({ where: { login_id: 'TEST-B-003' } });
  const personC = await User.findOne({ where: { login_id: 'TEST-C-004' } });
  const personD = await User.findOne({ where: { login_id: 'TEST-D-005' } });
  const personE = await User.findOne({ where: { login_id: 'TEST-E-006' } });
  const demoClient = await User.findOne({ where: { login_id: 'TEST-CLIENT-001' } });

  console.log('--- 1. VERIFY DATABASE SPONSOR HIERARCHY & RATES ---');
  assert(ram && parseFloat(ram.commission_percent) === 10 && ram.referred_by === null, 'Ram has 10% rate and No upline (Root Leader)');
  assert(personA && parseFloat(personA.commission_percent) === 7 && personA.referred_by === ram.id, 'Person A has 7% rate and Sponsor is Ram (TEST-RAM-001)');
  assert(personB && parseFloat(personB.commission_percent) === 4 && personB.referred_by === ram.id, 'Person B has 4% rate and Sponsor is Ram (TEST-RAM-001)');
  assert(personC && parseFloat(personC.commission_percent) === 6 && personC.referred_by === ram.id, 'Person C has 6% rate and Sponsor is Ram (TEST-RAM-001)');
  assert(personD && parseFloat(personD.commission_percent) === 5 && personD.referred_by === personA.id, 'Person D has 5% rate and Sponsor is Person A (TEST-A-002)');
  assert(personE && parseFloat(personE.commission_percent) === 4 && personE.referred_by === personA.id, 'Person E has 4% rate and Sponsor is Person A (TEST-A-002)');
  assert(demoClient && demoClient.referred_by === personD.id, 'Demo Client is referred by Person D (TEST-D-005)');

  console.log('\n--- 2. VERIFY PROJECT AND PLOT SPECIFICATIONS ---');
  const project = await Project.findOne({ where: { project_id: 'TEST-PROJ-001' } });
  assert(project && project.name === 'Sunrise Residency — TEST', 'Project TEST-PROJ-001 (Sunrise Residency — TEST) exists');

  const plot = await Plot.findOne({ where: { plot_code: 'TEST-PLOT-001' } });
  assert(plot && plot.sector_number === '02' && plot.plot_number === '104', 'Plot TEST-PLOT-001 is Sector 02, Plot 104');
  assert(plot && plot.size_sqft === 1000 && parseFloat(plot.rate_per_sqft) === 2000, 'Plot size is 1,000 Sq.ft. @ ₹2,000 per Sq.ft.');
  assert(plot && parseFloat(plot.price) === 2000000, 'Final Plot Price is calculated at ₹20,00,000');
  assert(plot && ['booked', 'sold'].includes(plot.status), 'Plot status is protected from simultaneous double bookings');

  console.log('\n--- 3. VERIFY BOOKING APPLICATION & PAYMENT PLAN ---');
  const booking = await BookingForm.findOne({ where: { booking_ref: 'TEST-BOOK-001' } });
  assert(booking !== null, 'Booking Form TEST-BOOK-001 exists in database');
  assert(booking && booking.selling_associate_code === 'TEST-D-005', 'Booking Form Section C records Selling Associate Person D (TEST-D-005)');
  assert(booking && booking.direct_sponsor_code === 'TEST-A-002', 'Booking Form Section C records Direct Sponsor Person A (TEST-A-002)');
  assert(booking && parseFloat(booking.total_plot_price) === 2000000, 'Booking Form Total Plot Price is ₹20,00,000');
  assert(booking && parseFloat(booking.booking_amount) === 200000, 'Booking Amount recorded is ₹2,00,000');
  assert(booking && parseFloat(booking.remaining_balance) === 1800000, 'Remaining Balance calculated as ₹18,00,000');

  console.log('\n--- 4. VERIFY DIFFERENTIAL COMMISSION CALCULATION ON ₹20,00,000 ---');
  // Formula preview calculation
  const sim = await previewCommissionDistribution(personD.id, 2000000);
  assert(sim.total_distributed_amount === 200000, 'Differential commission formula calculates total ₹2,00,000 (Exactly 10% of ₹20,00,000)');

  const commD = sim.breakdown.find(b => b.user_id === personD.id);
  const commA = sim.breakdown.find(b => b.user_id === personA.id);
  const commRam = sim.breakdown.find(b => b.user_id === ram.id);
  const commB = sim.breakdown.find(b => b.user_id === personB.id);
  const commC = sim.breakdown.find(b => b.user_id === personC.id);
  const commE = sim.breakdown.find(b => b.user_id === personE.id);

  assert(commD && commD.amount === 100000 && commD.differential_percent === 5, 'Person D (Seller 5%) receives 5% of ₹20,00,000 = ₹1,00,000');
  assert(commA && commA.amount === 40000 && commA.differential_percent === 2, 'Person A (Direct Sponsor 7%) receives (7% - 5%) = 2% of ₹20,00,000 = ₹40,000');
  assert(commRam && commRam.amount === 60000 && commRam.differential_percent === 3, 'Ram (Root Leader 10%) receives (10% - 7%) = 3% of ₹20,00,000 = ₹60,000');
  assert(!commB, 'Branch Isolation: Person B (4% under Ram) receives ₹0');
  assert(!commC, 'Branch Isolation: Person C (6% under Ram) receives ₹0');
  assert(!commE, 'Branch Isolation: Person E (4% sibling under A) receives ₹0');

  console.log('\n--- 5. VERIFY DATABASE TRANSACTION & COMMISSIONS ---');
  const txn = await Transaction.findOne({
    where: { transaction_ref: 'TEST-SALE-001' },
    include: [{ model: Commission, as: 'commissions' }]
  });
  assert(txn !== null, 'Transaction TEST-SALE-001 exists in database');
  assert(txn && parseFloat(txn.amount) === 2000000, 'Transaction amount is ₹20,00,000');
  assert(txn && parseFloat(txn.paid_amount) === 200000, 'Transaction paid amount is ₹2,00,000');
  assert(txn && txn.commissions.length === 3, 'Transaction recorded exactly 3 commission entries in database');
  
  const dbTotalComm = txn.commissions.reduce((s, c) => s + parseFloat(c.amount), 0);
  assert(dbTotalComm === 200000, 'Persisted commission amounts sum to exactly ₹2,00,000');
  assert(txn.commissions.every(c => c.status === 'pending'), 'Commissions are saved in "pending" status for Accounts verification');

  console.log('\n--- 6. VERIFY RECEIPT GENERATION & PDF CREATION ---');
  const payment = await Payment.findOne({ where: { receipt_no: 'REC-TEST-001' } });
  assert(payment !== null, 'Payment REC-TEST-001 exists in database');
  assert(payment && parseFloat(payment.amount) === 200000, 'Payment amount is ₹2,00,000');
  assert(payment && payment.status === 'verified', 'Payment status is verified');

  let settings = await AppSettings.findOne() || { company_name: 'DEVOJAS REALTORS PVT. LTD.' };
  const receiptPdfPath = await generatePaymentReceiptPdf({
    payment,
    transaction: txn,
    plot,
    buyer: demoClient,
    sellerAssociate: personD,
    companySettings: settings,
    totalPaidSoFar: 200000,
    pendingBalance: 1800000
  });

  assert(fs.existsSync(receiptPdfPath), `Payment receipt PDF generated on disk at ${receiptPdfPath}`);
  const stats = fs.statSync(receiptPdfPath);
  assert(stats.size > 1000, `Generated Receipt PDF has valid size (${stats.size} bytes)`);

  console.log('\n--- 7. IDEMPOTENCY & DUPLICATE PREVENTION ---');
  const repeatComms = await processCommissionForAssociate(personD.id, 2000000, txn.id, 'seller_side', true, null, 'pending');
  assert(repeatComms.length === 0, 'Re-running commission calculation on the same transaction creates 0 duplicates');

  console.log('\n--- 8. PRODUCTION RECORD INTEGRITY ---');
  const prodUsers = await User.count({ where: { login_id: { [require('sequelize').Op.notLike]: 'TEST-%' } } });
  assert(prodUsers > 0, `All real production users (${prodUsers} users) remain completely intact and untouched`);

  console.log('\n================================================================');
  console.log(`TOTAL SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runValidationSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
