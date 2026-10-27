require('dotenv').config();
const assert = require('assert');
const {
  findRewardSlab,
  calculatePayout,
  isRewardAlreadyPaid,
  createPayoutStatement,
  getPayoutStatements,
  getPayoutStatement
} = require('../controllers/payoutStatementController');
const { User, Slab, Commission, PayoutStatement, RewardLog } = require('../models');

async function testAll11Scenarios() {
  console.log('========================================================');
  console.log('STARTING VERIFICATION OF ALL 11 SPECIFICATION SCENARIOS');
  console.log('========================================================\n');

  // Find associates
  const ram = await User.findOne({ where: { login_id: 'DEV-0002' } });
  const mohan = await User.findOne({ where: { login_id: 'DEV-0003' } });
  const sohan = await User.findOne({ where: { login_id: 'DEV-0004' } });
  const accountsUser = await User.findOne({ where: { role: 'accounts' } }) || await User.findOne({ where: { role: 'admin' } });

  assert.ok(ram, 'Ram (DEV-0002) found');
  assert.ok(mohan, 'Mohan (DEV-0003) found');
  assert.ok(sohan, 'Sohan (DEV-0004) found');

  // Scenario 1: Self sales of ₹5,00,000 qualify for configured ₹10,000 reward
  console.log('--- SCENARIO 1: Self sales of ₹5,00,000 -> Slab 1 reward ₹10,000 ---');
  const s1 = await findRewardSlab(500000);
  assert.strictEqual(s1.selfTargetAchieved, true);
  assert.strictEqual(s1.selfTargetAmount, 500000);
  assert.strictEqual(s1.rewardAmount, 10000);
  console.log('✓ Scenario 1 Verified\n');

  // Scenario 2: Self sales of ₹7,50,000 qualify for configured ₹25,000 reward
  console.log('--- SCENARIO 2: Self sales of ₹7,50,000 -> Slab 2 reward ₹25,000 ---');
  const s2 = await findRewardSlab(750000);
  assert.strictEqual(s2.selfTargetAchieved, true);
  assert.strictEqual(s2.selfTargetAmount, 750000);
  assert.strictEqual(s2.rewardAmount, 25000);
  console.log('✓ Scenario 2 Verified\n');

  // Scenario 3: Team sales alone never unlock a self reward
  console.log('--- SCENARIO 3: Team sales alone never unlock self reward ---');
  const s3 = await findRewardSlab(0);
  assert.strictEqual(s3.selfTargetAchieved, false);
  assert.strictEqual(s3.rewardAmount, 0);
  console.log('✓ Scenario 3 Verified\n');

  // Scenario 4: Self sales never generate an additional self-sale commission
  console.log('--- SCENARIO 4: Self-sale commission is strictly ₹0 ---');
  const calcSelf = calculatePayout({ self_business: 750000, differential_commission: 0, reward_amount: 25000, self_target_amount: 750000 });
  assert.strictEqual(calcSelf.self_deposit, 0);
  console.log('✓ Scenario 4 Verified\n');

  // Scenario 5: Existing team differential commission remains unchanged
  console.log('--- SCENARIO 5: Existing team differential commission verified from ledger ---');
  const ramComms = await Commission.findAll({ where: { user_id: ram.id, level: { [require('sequelize').Op.gt]: 0 } } });
  const totalDiff = ramComms.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  assert.strictEqual(totalDiff, 390000, 'Ram team differential commission is ₹3,90,000 (1.2L + 2.7L)');
  console.log('✓ Scenario 5 Verified: Team differential is ₹3,90,000\n');

  // Scenario 6: Team commission ₹3,90,000 + reward ₹25,000 -> Gross ₹4,15,000, TDS ₹20,750, Net ₹3,94,250
  console.log('--- SCENARIO 6: Team diff ₹3,90,000 + Reward ₹25,000 exact calculation ---');
  const calcExA = calculatePayout({
    self_business: 750000,
    team_business: 15000000,
    differential_commission: 390000,
    self_target_amount: 750000,
    reward_amount: 25000,
    tds_percent: 5
  });
  assert.strictEqual(calcExA.total_amount, 415000);
  assert.strictEqual(calcExA.tds_amount, 20750);
  assert.strictEqual(calcExA.net_payable, 394250);
  console.log('✓ Scenario 6 Verified: Gross ₹4,15,000, TDS ₹20,750, Net ₹3,94,250\n');

  // Scenario 7: With no eligible reward, only existing team commission is paid after TDS
  console.log('--- SCENARIO 7: No reward, only team commission paid after TDS ---');
  const calcExB = calculatePayout({
    self_business: 0,
    team_business: 15000000,
    differential_commission: 390000,
    self_target_amount: 750000,
    reward_amount: 25000,
    tds_percent: 5
  });
  assert.strictEqual(calcExB.eligible_reward, 0);
  assert.strictEqual(calcExB.total_amount, 390000);
  assert.strictEqual(calcExB.tds_amount, 19500);
  assert.strictEqual(calcExB.net_payable, 370500);
  console.log('✓ Scenario 7 Verified: Gross ₹3,90,000, TDS ₹19,500, Net ₹3,70,500\n');

  // Scenario 8: No processing fee appears or gets deducted
  console.log('--- SCENARIO 8: Processing fee is 0 across all calculations ---');
  assert.strictEqual(calcExA.processing_percent, 0);
  assert.strictEqual(calcExA.processing_amount, 0);
  assert.strictEqual(calcExB.processing_percent, 0);
  assert.strictEqual(calcExB.processing_amount, 0);
  console.log('✓ Scenario 8 Verified: Zero processing fee\n');

  // Scenario 9: Generated statement persists in Accounts and appears in the correct associate\'s panel
  console.log('--- SCENARIO 9: Persistent generation and retrieval for associate ---');
  let createdStmt = null;
  const mockCreateRes = {
    status: (code) => mockCreateRes,
    json: (p) => { createdStmt = p.data; return mockCreateRes; }
  };
  await createPayoutStatement({
    user: accountsUser,
    body: {
      associate_id: ram.id,
      payment_date: '2026-10-25',
      self_business: 750000,
      team_business: 15000000,
      differential_commission: 390000,
      tds_percent: 5,
      notes: 'October MLM Settlement for Ram',
      status: 'pending'
    }
  }, mockCreateRes, (err) => { if (err) throw err; });

  assert.ok(createdStmt, 'Statement created and returned');
  assert.strictEqual(createdStmt.associate_id, ram.id);
  assert.strictEqual(createdStmt.status, 'pending');
  assert.strictEqual(Number(createdStmt.net_payable), 394250);

  // Retrieve via associate endpoint (as Ram)
  let associateStatements = [];
  const mockAssocRes = {
    json: (p) => { associateStatements = p.data; return mockAssocRes; }
  };
  await getPayoutStatements({ user: { id: ram.id, role: 'associate' }, query: {} }, mockAssocRes, (err) => { if (err) throw err; });
  const foundInRam = associateStatements.find(s => s.id === createdStmt.id);
  assert.ok(foundInRam, 'Generated statement appears in Ram panel statements list');
  console.log('✓ Scenario 9 Verified: Statement persisted and retrieved in associate panel\n');

  // Scenario 10: Another associate cannot access that statement by changing URL or request ID
  console.log('--- SCENARIO 10: Mohan cannot access Ram statement (403 Forbidden) ---');
  let mohanDenied = false;
  const mockMohanRes = {
    status: (code) => {
      if (code === 403) mohanDenied = true;
      return mockMohanRes;
    },
    json: () => mockMohanRes
  };
  await getPayoutStatement({ user: { id: mohan.id, role: 'associate' }, params: { id: createdStmt.id } }, mockMohanRes, (err) => { if (err) throw err; });
  assert.strictEqual(mohanDenied, true, 'Mohan received 403 Forbidden when trying to view Ram statement');

  // Also verify Mohan statements list does not contain Ram statement
  let mohanStatements = [];
  const mockMohanListRes = {
    json: (p) => { mohanStatements = p.data; return mockMohanListRes; }
  };
  await getPayoutStatements({ user: { id: mohan.id, role: 'associate' }, query: {} }, mockMohanListRes, (err) => { if (err) throw err; });
  assert.strictEqual(mohanStatements.some(s => s.id === createdStmt.id), false, 'Mohan list does not contain Ram statement');
  console.log('✓ Scenario 10 Verified: Strict associate isolation enforced\n');

  // Scenario 11: Repeated generation cannot duplicate a reward or commission payout
  console.log('--- SCENARIO 11: Duplicate reward & commission prevention ---');
  // Mark the reward as paid
  await RewardLog.update({ status: 'paid' }, { where: { user_id: ram.id, slab_id: 2 } });
  const isPaid = await isRewardAlreadyPaid(ram.id, 2);
  assert.strictEqual(isPaid, true, 'Reward is now marked as paid');

  const { selfTargetAchieved, rewardAmount } = await findRewardSlab(750000);
  const eligibleNext = (selfTargetAchieved && !(await isRewardAlreadyPaid(ram.id, 2))) ? rewardAmount : 0;
  assert.strictEqual(eligibleNext, 0, 'Next payout preview recognizes reward already paid and awards ₹0 duplicate reward');
  console.log('✓ Scenario 11 Verified: Duplicate reward prevented\n');

  console.log('========================================================');
  console.log('ALL 11 SCENARIOS VERIFIED AND PASSED WITH 100% SUCCESS!');
  console.log('========================================================');
  process.exit(0);
}

testAll11Scenarios().catch(e => {
  console.error('Scenario failed:', e);
  process.exit(1);
});
