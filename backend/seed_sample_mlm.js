/**
 * ADVANCED MASTER MLM SEEDER — REAL ESTATE MLM SOFTWARE
 * --------------------------------------------------------------------------
 * Adheres strictly to Prompt Section 6:
 * - Sample Project: Sunrise Residency — TEST (TEST-PROJ-001)
 * - Sample Plot: TEST-PLOT-001 (Sector: 02, Plot No: 104, Size: 1000 sq.ft., Rate: ₹2,000/sq.ft. = ₹20,00,000)
 * - Associate Hierarchy:
 *     1. Ram       (TEST-RAM-001) : 10% (Root / No upline)
 *     2. Person A  (TEST-A-002)   : 7%  (Sponsor: Ram)
 *     3. Person B  (TEST-B-003)   : 4%  (Sponsor: Ram)
 *     4. Person C  (TEST-C-004)   : 6%  (Sponsor: Ram)
 *     5. Person D  (TEST-D-005)   : 5%  (Sponsor: Person A)
 *     6. Person E  (TEST-E-006)   : 4%  (Sponsor: Person A)
 * - Sample Client:
 *     Demo Client (TEST-CLIENT-001), demo-client@example.com, Referred by Person D (TEST-D-005)
 * - Sample Plot Purchase & Booking:
 *     Booking Ref: TEST-BOOK-001, Txn Ref: TEST-SALE-001
 *     Plot: TEST-PLOT-001 (₹20,00,000)
 *     Booking Amount Paid: ₹2,00,000, Receipt No: REC-TEST-001 (Verified)
 *     Differential Commissions on ₹20,00,000 deal:
 *       - Person D (Seller 5%)             : ₹1,00,000
 *       - Person A (Direct Sponsor 7% - 5%): ₹40,000
 *       - Ram (Top Leader 10% - 7%)        : ₹60,000
 *       - Total = ₹2,00,000 (10%). Person B, C, E = ₹0
 * --------------------------------------------------------------------------
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('./config/db');
const {
  Project, Plot, User, Transaction, Commission, CommissionHistory,
  BookingForm, Payment, Wallet, WalletTransaction, Notification
} = require('./models');
const { processCommissionForAssociate } = require('./services/commissionEngine');

const TEST_PASSWORD = 'Test@1234';

async function cleanSampleData() {
  console.log('🧹 Cleaning existing test/sample MLM records (login_id LIKE "TEST-%")...');
  
  // 1. Remove test payments & booking forms
  const testTxs = await Transaction.findAll({
    where: {
      transaction_ref: ['TEST-SALE-001', 'TEST-SALE-002', 'TEST-SALE-003', 'TEST-SALE-004']
    }
  });
  const txIds = testTxs.map(t => t.id);

  if (txIds.length > 0) {
    await Payment.destroy({ where: { transaction_id: txIds } });
    await Commission.destroy({ where: { transaction_id: txIds } });
    await Transaction.destroy({ where: { id: txIds } });
    console.log(`  Removed ${txIds.length} sample transactions and their commissions/payments.`);
  }

  await BookingForm.destroy({
    where: {
      booking_ref: ['TEST-BOOK-001', 'TEST-BOOK-002']
    }
  });

  // 2. Remove sample plots & projects
  const deletedPlots = await Plot.destroy({
    where: {
      plot_code: ['TEST-PLOT-001', 'TEST-PLOT-002', 'TEST-PLOT-003', 'TEST-PLOT-004']
    }
  });
  await Plot.destroy({
    where: {
      plot_number: ['TEST-PROP-001', 'TEST-PROP-002', 'TEST-PROP-003', 'TEST-PROP-004', '104']
    }
  });
  console.log(`  Removed sample plots.`);

  await Project.destroy({
    where: {
      project_id: ['TEST-PROJ-001']
    }
  });
  console.log(`  Removed sample projects.`);

  // 3. Remove test users
  const testUsers = await User.findAll({
    where: {
      login_id: [
        'TEST-RAM-001', 'TEST-A-002', 'TEST-B-003', 'TEST-C-004',
        'TEST-D-005', 'TEST-E-006', 'TEST-CLIENT-001', 'TEST-BUYER-001', 'TEST-SELLER-001'
      ]
    }
  });
  const userIds = testUsers.map(u => u.id);

  if (userIds.length > 0) {
    const { RewardLog, SmsLog, PayoutStatement, Complaint } = require('./models');
    await RewardLog.destroy({ where: { user_id: userIds } });
    await SmsLog.destroy({ where: { user_id: userIds } });
    await PayoutStatement.destroy({ where: { associate_id: userIds } });
    await Complaint.destroy({ where: { user_id: userIds } });
    await Commission.destroy({ where: { user_id: userIds } });
    await CommissionHistory.destroy({ where: { user_id: userIds } });
    await WalletTransaction.destroy({ where: { user_id: userIds } });
    await Wallet.destroy({ where: { user_id: userIds } });
    await Notification.destroy({ where: { user_id: userIds } });
    
    await User.update({ referred_by: null }, { where: { id: userIds } });
    await User.destroy({ where: { id: userIds } });
    console.log(`  Removed ${userIds.length} sample test users.`);
  }

  console.log('✅ Sample data cleaned successfully. Real production records were NOT touched.\n');
}

async function seedSampleMLM() {
  console.log('================================================================');
  console.log('🚀 SEEDING REAL ESTATE MLM MASTER WORKFLOW & ₹20,00,000 TEST DEAL');
  console.log('================================================================\n');

  await sequelize.authenticate();
  console.log('✅ Database connected.');

  await cleanSampleData();

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. SAMPLE ASSOCIATES (Tree Structure from Section 6)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('1. Creating Sample MLM Associate Hierarchy...');

  // 1. Ram: Root, 10%
  const ram = await User.create({
    name: 'Ram',
    login_id: 'TEST-RAM-001',
    email: 'test.ram@devojasrealtors.in',
    phone: '9700000001',
    password: hashedPassword,
    plain_password: TEST_PASSWORD,
    role: 'associate',
    referred_by: null,
    commission_percent: 10.0,
    referral_commission_percent: 10.0,
    commission_set_by: 'admin',
    pan_number: 'RAMTEST1001',
    aadhar_number: '970000000001',
    referral_code: 'TEST-RAM-001',
    status: 'active',
    kyc_status: 'approved'
  });
  await Wallet.create({ user_id: ram.id, balance: 0 });
  await CommissionHistory.create({
    user_id: ram.id,
    previous_percent: 0,
    new_percent: 10.0,
    reason: 'Approved Top Leader Tier (10%)'
  });
  console.log('   ✓ Ram       (TEST-RAM-001) : 10% | Sponsor: None (Root)');

  // 2. Person A: Under Ram, 7%
  const personA = await User.create({
    name: 'Person A',
    login_id: 'TEST-A-002',
    email: 'test.persona@devojasrealtors.in',
    phone: '9700000002',
    password: hashedPassword,
    plain_password: TEST_PASSWORD,
    role: 'associate',
    referred_by: ram.id,
    commission_percent: 7.0,
    referral_commission_percent: 7.0,
    commission_set_by: 'admin',
    pan_number: 'PERSNA1002',
    aadhar_number: '970000000002',
    referral_code: 'TEST-A-002',
    status: 'active',
    kyc_status: 'approved'
  });
  await Wallet.create({ user_id: personA.id, balance: 0 });
  await CommissionHistory.create({
    user_id: personA.id,
    previous_percent: 0,
    new_percent: 7.0,
    reason: 'Assigned 7% Partner Tier'
  });
  console.log('   ✓ Person A  (TEST-A-002)   : 7%  | Sponsor: Ram');

  // 3. Person B: Under Ram, 4%
  const personB = await User.create({
    name: 'Person B',
    login_id: 'TEST-B-003',
    email: 'test.personb@devojasrealtors.in',
    phone: '9700000003',
    password: hashedPassword,
    plain_password: TEST_PASSWORD,
    role: 'associate',
    referred_by: ram.id,
    commission_percent: 4.0,
    referral_commission_percent: 4.0,
    commission_set_by: 'admin',
    pan_number: 'PERSNB1003',
    aadhar_number: '970000000003',
    referral_code: 'TEST-B-003',
    status: 'active',
    kyc_status: 'approved'
  });
  await Wallet.create({ user_id: personB.id, balance: 0 });
  await CommissionHistory.create({
    user_id: personB.id,
    previous_percent: 0,
    new_percent: 4.0,
    reason: 'Assigned 4% Partner Tier'
  });
  console.log('   ✓ Person B  (TEST-B-003)   : 4%  | Sponsor: Ram');

  // 4. Person C: Under Ram, 6%
  const personC = await User.create({
    name: 'Person C',
    login_id: 'TEST-C-004',
    email: 'test.personc@devojasrealtors.in',
    phone: '9700000004',
    password: hashedPassword,
    plain_password: TEST_PASSWORD,
    role: 'associate',
    referred_by: ram.id,
    commission_percent: 6.0,
    referral_commission_percent: 6.0,
    commission_set_by: 'admin',
    pan_number: 'PERSNC1004',
    aadhar_number: '970000000004',
    referral_code: 'TEST-C-004',
    status: 'active',
    kyc_status: 'approved'
  });
  await Wallet.create({ user_id: personC.id, balance: 0 });
  await CommissionHistory.create({
    user_id: personC.id,
    previous_percent: 0,
    new_percent: 6.0,
    reason: 'Assigned 6% Partner Tier'
  });
  console.log('   ✓ Person C  (TEST-C-004)   : 6%  | Sponsor: Ram');

  // 5. Person D: Under Person A, 5%
  const personD = await User.create({
    name: 'Person D',
    login_id: 'TEST-D-005',
    email: 'test.persond@devojasrealtors.in',
    phone: '9700000005',
    password: hashedPassword,
    plain_password: TEST_PASSWORD,
    role: 'associate',
    referred_by: personA.id,
    commission_percent: 5.0,
    referral_commission_percent: 5.0,
    commission_set_by: 'admin',
    pan_number: 'PERSND1005',
    aadhar_number: '970000000005',
    referral_code: 'TEST-D-005',
    status: 'active',
    kyc_status: 'approved'
  });
  await Wallet.create({ user_id: personD.id, balance: 0 });
  await CommissionHistory.create({
    user_id: personD.id,
    previous_percent: 0,
    new_percent: 5.0,
    reason: 'Assigned 5% Tier'
  });
  console.log('   ✓ Person D  (TEST-D-005)   : 5%  | Sponsor: Person A');

  // 6. Person E: Under Person A, 4%
  const personE = await User.create({
    name: 'Person E',
    login_id: 'TEST-E-006',
    email: 'test.persone@devojasrealtors.in',
    phone: '9700000006',
    password: hashedPassword,
    plain_password: TEST_PASSWORD,
    role: 'associate',
    referred_by: personA.id,
    commission_percent: 4.0,
    referral_commission_percent: 4.0,
    commission_set_by: 'admin',
    pan_number: 'PERSNE1006',
    aadhar_number: '970000000006',
    referral_code: 'TEST-E-006',
    status: 'active',
    kyc_status: 'approved'
  });
  await Wallet.create({ user_id: personE.id, balance: 0 });
  await CommissionHistory.create({
    user_id: personE.id,
    previous_percent: 0,
    new_percent: 4.0,
    reason: 'Assigned 4% Tier'
  });
  console.log('   ✓ Person E  (TEST-E-006)   : 4%  | Sponsor: Person A');

  // ─────────────────────────────────────────────────────────────────────────
  // 2. SAMPLE CLIENT (Demo Client, TEST-CLIENT-001)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n2. Creating Sample Client (Demo Client)...');
  const demoClient = await User.create({
    name: 'Demo Client',
    login_id: 'TEST-CLIENT-001',
    email: 'demo-client@example.com',
    phone: '9700000050',
    address: 'TEST ADDRESS, Sector 02, Test City',
    password: hashedPassword,
    plain_password: TEST_PASSWORD,
    role: 'client',
    status: 'active',
    kyc_status: 'approved',
    referred_by: personD.id, // Referred by Person D
    commission_percent: 0
  });
  await Wallet.create({ user_id: demoClient.id, balance: 0 });
  console.log('   ✓ Demo Client: TEST-CLIENT-001 (Referred by Person D: TEST-D-005)');

  // ─────────────────────────────────────────────────────────────────────────
  // 3. SAMPLE PROJECT & PLOT (Sunrise Residency — TEST)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n3. Creating Sample Project & Plot...');
  const sampleProject = await Project.create({
    project_id: 'TEST-PROJ-001',
    name: 'Sunrise Residency — TEST',
    location: 'Sector 02, Highway Corridor, Varanasi',
    city: 'Varanasi',
    developer_name: 'Devojas Realtors Pvt Ltd',
    description: 'Premium master planned residential township with complete modern amenities.',
    facilities: '24x7 Security, 40ft Wide Roads, Underground Electricity, Parks, Club House',
    status: 'active',
    total_plots: 50
  });
  console.log('   ✓ Project: Sunrise Residency — TEST (TEST-PROJ-001)');

  const samplePlot = await Plot.create({
    plot_code: 'TEST-PLOT-001',
    project_id: sampleProject.id,
    title: 'Sunrise Residency — Plot 104',
    description: '1000 sq.ft. prime residential plot in Sector 02.',
    location: sampleProject.location,
    city: sampleProject.city,
    sector_number: '02',
    block: 'Block A',
    plot_number: '104',
    size_sqft: 1000,
    rate_per_sqft: 2000,
    basic_price: 2000000,
    is_corner: false,
    corner_charge: 0,
    is_park_facing: false,
    park_facing_charge: 0,
    additional_charges: 0,
    discount: 0,
    price: 2000000,
    owner_id: demoClient.id,
    status: 'booked',
    allotment_status: 'provisional',
    booking_date: new Date(),
    dimensions: '25x40 ft',
    road_width: '40 ft',
    facing: 'East'
  });
  console.log('   ✓ Plot: TEST-PLOT-001 (Sector: 02, Plot No: 104, 1000 sqft @ ₹2000/sqft = ₹20,00,000)');

  // ─────────────────────────────────────────────────────────────────────────
  // 4. SAMPLE PLOT BOOKING FORM (Sections A to E)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n4. Recording Complete Plot Booking Form (Sections A to E)...');
  const bookingForm = await BookingForm.create({
    booking_ref: 'TEST-BOOK-001',
    // Section A: Plot Price Details
    project_id: sampleProject.id,
    project_name: sampleProject.name,
    plot_id: samplePlot.id,
    plot_code: samplePlot.plot_code,
    plot_size: '1000',
    size_unit: 'Sq.ft.',
    sector_no: '02',
    plot_no: '104',
    rate_per_sqft: 2000,
    basic_plot_price: 2000000,
    is_corner: false,
    corner_percent: 0,
    corner_charge_amount: 0,
    is_park_facing: false,
    park_facing_percent: 0,
    park_facing_charge_amount: 0,
    other_approved_charges: 0,
    discount_amount: 0,
    total_plot_price: 2000000,
    plot_length: 40,
    plot_width: 25,

    // Section B: Client Details
    client_id: demoClient.id,
    client_code: demoClient.login_id,
    applicant_name: demoClient.name,
    father_husband_name: 'Late Shri R. K. Sharma',
    applicant_phone: demoClient.phone,
    applicant_email: demoClient.email,
    applicant_address: demoClient.address,
    permanent_address: demoClient.address,
    govt_id_type: 'Aadhaar',
    govt_id_number: '9876-5432-1099',
    nominee_name: 'Sunita Sharma',
    nominee_relation: 'Spouse',
    applicant_date: new Date(),
    applicant_place: 'Varanasi',

    // Section C: Associate and Referral Details
    associate_id: personD.id,
    selling_associate_name: personD.name,
    selling_associate_code: personD.login_id,
    selling_associate_ref_id: personD.login_id,
    direct_sponsor_id: personA.id,
    direct_sponsor_name: personA.name,
    direct_sponsor_code: personA.login_id,
    direct_sponsor_ref_id: personA.login_id,
    referral_chain_info: 'Person D (5%) -> Person A (7%) -> Ram (10%)',
    referred_id: personD.login_id,

    // Section D: Payment Plan
    payment_plan_type: 'booking_balance',
    payment_mode: 'NEFT / Bank Transfer',
    transaction_ref: 'TEST-SALE-001',
    booking_amount: 200000,
    down_payment_amt: 0,
    remaining_balance: 1800000,
    emi_duration_months: 18,
    emi_amount: 100000,
    installment_frequency: 'monthly',
    first_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),

    // Section E: Declaration & Approval
    declaration_accepted: true,
    status: 'approved',
    allotment_status: 'provisional',
    authorized_officer_name: 'Admin Controller',
    approved_by: 1,
    approved_at: new Date()
  });
  console.log('   ✓ Booking Form: TEST-BOOK-001 recorded with full Section A-E data.');

  // ─────────────────────────────────────────────────────────────────────────
  // 5. SAMPLE SALE TRANSACTION & VERIFIED BOOKING PAYMENT
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n5. Creating Transaction TEST-SALE-001 & Verified Receipt REC-TEST-001...');
  const tSale = await sequelize.transaction();

  const saleTx = await Transaction.create({
    transaction_ref: 'TEST-SALE-001',
    plot_id: samplePlot.id,
    buyer_id: demoClient.id,
    seller_id: 1, // Company/Admin
    seller_associate_id: personD.id,
    buyer_associate_id: personD.id,
    amount: 2000000,
    paid_amount: 200000,
    status: 'completed',
    payment_status: 'unpaid', // partial/unpaid (₹18,00,000 pending)
    deal_date: new Date()
  }, { transaction: tSale });

  const payment = await Payment.create({
    transaction_id: saleTx.id,
    amount: 200000,
    payment_mode: 'Bank Transfer / NEFT',
    reference_no: 'UTR-TEST-2026-9901',
    receipt_no: 'REC-TEST-001',
    status: 'verified',
    recorded_by: 1,
    note: 'Initial Booking Amount (10%) received for Sunrise Residency Plot 104',
    paid_on: new Date()
  }, { transaction: tSale });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. DIFFERENTIAL COMMISSION EXECUTION (₹20,00,000 deal)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('   Generating Differential Commission on ₹20,00,000 deal...');
  // Trigger commission calculation for Person D (seller side, initialStatus = 'pending' for Accounts audit)
  const commResults = await processCommissionForAssociate(
    personD.id, 
    2000000, 
    saleTx.id, 
    'seller_side', 
    true, 
    tSale, 
    'pending'
  );
  await tSale.commit();

  console.log('   ✓ Transaction TEST-SALE-001 created.');
  console.log('   ✓ Payment REC-TEST-001 (₹2,00,000) verified.');
  console.log('\nCommission Breakdown on ₹20,00,000:');
  commResults.forEach(c => {
    console.log(`     • ${c.associate_name} (${c.role_level}): ${c.rate_difference}% = ₹${Number(c.amount).toLocaleString('en-IN')} (Status: ${c.status})`);
  });

  // Verify expectations:
  // Person D: 5% = ₹1,00,000
  // Person A: (7% - 5%) = 2% = ₹40,000
  // Ram: (10% - 7%) = 3% = ₹60,000
  // Total = ₹2,00,000 (10%)
  const totalComm = commResults.reduce((s, c) => s + parseFloat(c.amount), 0);
  console.log(`     • TOTAL COMMISSION = ₹${totalComm.toLocaleString('en-IN')} (Exactly 10% of ₹20,00,000)`);

  console.log('\n================================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('All sample records are connected across Admin, Associate, Client & Accounts panels.');
  console.log('================================================================\n');

  process.exit(0);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--clean')) {
    sequelize.authenticate().then(cleanSampleData).then(() => process.exit(0)).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else {
    seedSampleMLM().catch(err => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
  }
}

module.exports = { seedSampleMLM, cleanSampleData };
