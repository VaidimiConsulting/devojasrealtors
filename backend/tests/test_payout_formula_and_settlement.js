require('dotenv').config();
const assert = require('assert');
const {
  calculatePayout,
  findRewardSlab,
  isRewardAlreadyPaid,
  previewPayoutStatement,
  getAssociateLedger
} = require('../controllers/payoutStatementController');
const { User, Slab, Commission } = require('../models');

async function runTests() {
  console.log('--- RUNNING PAYOUT FORMULA & REWARD SPECIFICATION TESTS ---');

  // Test 1: findRewardSlab logic
  console.log('Test 1: Self sales ₹5,00,000 qualifies for Slab 1 target (₹5,00,000) and ₹10,000 reward');
  const slab5L = await findRewardSlab(500000);
  assert.strictEqual(slab5L.selfTargetAchieved, true, 'Slab 1 self target should be achieved');
  assert.strictEqual(slab5L.selfTargetAmount, 500000, 'Slab 1 self target amount should be 500000');
  assert.strictEqual(slab5L.rewardAmount, 10000, 'Slab 1 reward amount should be 10000');
  console.log('✓ Passed Test 1');

  console.log('Test 2: Self sales ₹7,50,000 qualifies for Slab 2 target (₹7,50,000) and ₹25,000 reward');
  const slab75L = await findRewardSlab(750000);
  assert.strictEqual(slab75L.selfTargetAchieved, true, 'Slab 2 self target should be achieved');
  assert.strictEqual(slab75L.selfTargetAmount, 750000, 'Slab 2 self target amount should be 750000');
  assert.strictEqual(slab75L.rewardAmount, 25000, 'Slab 2 reward amount should be 25000');
  console.log('✓ Passed Test 2');

  console.log('Test 3: Team sales alone never unlock self reward (Self Sales = 0)');
  const slab0 = await findRewardSlab(0);
  assert.strictEqual(slab0.selfTargetAchieved, false, 'Self target should NOT be achieved when self sales = 0');
  assert.strictEqual(slab0.rewardAmount, 0, 'Reward should be 0 when self sales = 0');
  console.log('✓ Passed Test 3');

  console.log('Test 4: calculatePayout formula verification (Example A)');
  const exA = calculatePayout({
    self_business: 750000,
    team_business: 15000000,
    differential_commission: 390000,
    self_target_amount: 750000,
    reward_amount: 25000,
    tds_percent: 5
  });
  assert.strictEqual(exA.self_deposit, 0, 'Self commission must be 0');
  assert.strictEqual(exA.eligible_reward, 25000, 'Eligible reward should be 25000');
  assert.strictEqual(exA.total_amount, 415000, 'Gross payout should be 415000');
  assert.strictEqual(exA.tds_amount, 20750, 'TDS deduction at 5% should be 20750');
  assert.strictEqual(exA.processing_percent, 0, 'Processing fee percent must be 0');
  assert.strictEqual(exA.processing_amount, 0, 'Processing fee amount must be 0');
  assert.strictEqual(exA.net_payable, 394250, 'Net payable must be 394250');
  console.log('✓ Passed Test 4: Example A exact numbers match');

  console.log('Test 5: calculatePayout formula verification (Example B: team comm only, no reward)');
  const exB = calculatePayout({
    self_business: 0,
    team_business: 15000000,
    differential_commission: 390000,
    self_target_amount: 750000,
    reward_amount: 25000,
    tds_percent: 5
  });
  assert.strictEqual(exB.self_deposit, 0, 'Self commission must be 0');
  assert.strictEqual(exB.eligible_reward, 0, 'Eligible reward should be 0');
  assert.strictEqual(exB.total_amount, 390000, 'Gross payout should be 390000');
  assert.strictEqual(exB.tds_amount, 19500, 'TDS deduction at 5% should be 19500');
  assert.strictEqual(exB.processing_amount, 0, 'Processing fee amount must be 0');
  assert.strictEqual(exB.net_payable, 370500, 'Net payable must be 370500');
  console.log('✓ Passed Test 5: Example B exact numbers match');

  console.log('Test 6: Ram (DEV-0002) Ledger Preview');
  const ram = await User.findOne({ where: { login_id: 'DEV-0002' } });
  assert.ok(ram, 'Ram (DEV-0002) must exist in DB');

  let ledgerData = null;
  const mockRes = {
    json: (payload) => { ledgerData = payload.data; return mockRes; },
    status: (code) => mockRes
  };
  await getAssociateLedger({ params: { associateId: ram.id }, query: { tds_percent: 5 } }, mockRes, (err) => { if (err) throw err; });

  assert.ok(ledgerData, 'Ledger preview data returned');
  console.log('Ram ledger summary:', {
    differential_commission: ledgerData.summary.differential_commission,
    self_business: ledgerData.summary.self_business,
    team_business: ledgerData.summary.team_business,
    slab_reward: ledgerData.summary.slab_reward,
    gross_payable: ledgerData.summary.gross_payable,
    tds_amount: ledgerData.summary.tds_amount,
    processing_amount: ledgerData.summary.processing_amount,
    net_payable: ledgerData.summary.net_payable
  });
  assert.strictEqual(ledgerData.summary.processing_amount, 0, 'Processing fee must be 0 in Ram summary');
  assert.strictEqual(ledgerData.summary.self_commission, 0, 'Self commission must be 0');
  assert.strictEqual(ledgerData.summary.slab_reward, 25000, 'Ram personal sales ₹7.5L meets Slab 2 self target -> reward ₹25,000');
  assert.strictEqual(ledgerData.summary.differential_commission, 390000, 'Ram team differential commission must be 390000 (1.2L Mohan + 2.7L Sohan)');
  assert.strictEqual(ledgerData.summary.gross_payable, 415000, 'Gross payable must be 415000');
  assert.strictEqual(ledgerData.summary.tds_amount, 20750, 'TDS must be 20750');
  assert.strictEqual(ledgerData.summary.net_payable, 394250, 'Net payable must be 394250');
  console.log('✓ Passed Test 6: Ram Ledger Preview matches Section 4 Example A perfectly!');

  console.log('Test 7: Live Preview endpoint POST /api/payout-statements/preview');
  let previewData = null;
  const mockPreviewRes = {
    json: (payload) => { previewData = payload.data; return mockPreviewRes; },
    status: (code) => mockPreviewRes
  };
  await previewPayoutStatement({
    body: {
      associate_id: ram.id,
      self_business: 750000,
      team_business: 15000000,
      differential_commission: 390000,
      tds_percent: 5
    }
  }, mockPreviewRes, (err) => { if (err) throw err; });

  assert.strictEqual(previewData.self_commission, 0, 'Self commission is 0');
  assert.strictEqual(previewData.slab_reward, 25000, 'Slab reward is 25000');
  assert.strictEqual(previewData.differential_commission, 390000, 'Team diff is 390000');
  assert.strictEqual(previewData.gross_payout, 415000, 'Gross is 415000');
  assert.strictEqual(previewData.tds_amount, 20750, 'TDS is 20750');
  assert.strictEqual(previewData.processing_amount, 0, 'Processing fee is 0');
  assert.strictEqual(previewData.net_payable, 394250, 'Net payable is 394250');
  console.log('✓ Passed Test 7: Live preview endpoint matches specification');

  console.log('\nALL BACKEND FORMULA & CALCULATION TESTS PASSED SUCCESSFULLY! 🎉');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
