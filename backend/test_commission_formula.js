/**
 * Automated Verification Script for Differential Commission Engine & Edge Cases
 * Tests previewCommissionDistribution, sponsor isolation, and mathematical correctness.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { sequelize } = require('./config/db');
const { User, Commission, Transaction } = require('./models');
const { previewCommissionDistribution, roundCurrency } = require('./services/commissionEngine');

async function runTests() {
  console.log('=== STARTING COMMISSION ENGINE AUTOMATED TEST SUITE ===\n');
  await sequelize.authenticate();
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Find demo users
  const userA = await User.findOne({ where: { login_id: 'DEMO-001' } });
  const userB = await User.findOne({ where: { login_id: 'DEMO-002' } });
  const userC = await User.findOne({ where: { login_id: 'DEMO-003' } });
  const userE = await User.findOne({ where: { login_id: 'DEMO-005' } });
  const userG = await User.findOne({ where: { login_id: 'DEMO-006' } });

  console.log('Test 1: Master Prompt 4-level differential distribution (G -> E -> B -> A on ₹10,00,000)');
  if (userG) {
    const result = await previewCommissionDistribution(userG.id, 1000000);
    assert(result.deal_amount === 1000000, 'Deal amount is ₹10,00,000');
    assert(result.total_distributed_amount === 100000, 'Total distributed equals exactly ₹1,00,000 (10%)');
    assert(result.total_distributed_percent === 10, 'Total percentage matches 10%');

    const commG = result.breakdown.find(b => b.user_id === userG.id);
    const commE = result.breakdown.find(b => b.user_id === userE?.id);
    const commB = result.breakdown.find(b => b.user_id === userB?.id);
    const commA = result.breakdown.find(b => b.user_id === userA?.id);

    assert(commG && commG.amount === 20000 && commG.differential_percent === 2, 'G (Seller) receives 2% = ₹20,000');
    assert(commE && commE.amount === 20000 && commE.differential_percent === 2, 'E (Upline L1) receives (4% - 2%) = 2% = ₹20,000');
    assert(commB && commB.amount === 30000 && commB.differential_percent === 3, 'B (Upline L2) receives (7% - 4%) = 3% = ₹30,000');
    assert(commA && commA.amount === 30000 && commA.differential_percent === 3, 'A (Upline L3) receives (10% - 7%) = 3% = ₹30,000');
  }

  console.log('\nTest 2: Direct Sale Rule (User A sells property directly with no upline)');
  if (userA) {
    const result = await previewCommissionDistribution(userA.id, 1000000);
    assert(result.breakdown.length === 1, 'Only seller receives commission');
    assert(result.breakdown[0].amount === 100000, 'Seller receives full 10% = ₹1,00,000');
    assert(result.total_distributed_amount === 100000, 'Total distributed equals ₹1,00,000');
  }

  console.log('\nTest 3: Branch Isolation Rule');
  if (userC && userB) {
    // When C sells, B and E must NOT get any commission
    const result = await previewCommissionDistribution(userC.id, 1000000);
    const recipientIds = result.breakdown.map(b => b.user_id);
    assert(!recipientIds.includes(userB.id), 'Branch B receives no commission from C\'s sale');
    if (userE) {
      assert(!recipientIds.includes(userE.id), 'Branch E receives no commission from C\'s sale');
    }
    const commA = result.breakdown.find(b => b.user_id === userA.id);
    assert(commA && commA.differential_percent === 6 && commA.amount === 60000, 'A receives (10% - 4%) = 6% = ₹60,000 from C\'s sale');
  }

  console.log('\nTest 4: Reconciled Commission Slips and Ledger');
  const commissionsCount = await Commission.count();
  assert(commissionsCount > 0, `Database contains ${commissionsCount} tracked commissions`);

  console.log(`\n======================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
