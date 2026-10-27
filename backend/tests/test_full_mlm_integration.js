/**
 * FULL MLM Integration & Regression Test Suite (Part 6)
 * Uses actual DB and commissionEngine signature.
 * Run from backend/: node tests/test_full_mlm_integration.js
 */
require('../config/db');
const { Op } = require('sequelize');
const { calculateCommissionChain } = require('../services/commissionEngine');
const { getMonthlyTarget, listLedger } = require('../services/commissionLedgerService');
const User   = require('../models/User');
const Slab   = require('../models/Slab');

let passed = 0, failed = 0;

function ok(condition, message) {
  if (condition) { console.log(`  ✅ ${message}`); passed++; }
  else           { console.error(`  ❌ FAIL: ${message}`); failed++; }
}
function section(title) {
  console.log(`\n${'─'.repeat(62)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(62));
}

async function runTests() {
  // ─────────────────────────────────────────────────────────────────
  // 1. FORMULA TESTS – using live DB users via commissionEngine
  //    (engine uses User.findByPk internally)
  // ─────────────────────────────────────────────────────────────────
  section('Part 1 — Commission Formula (via DB user chain)');

  // Helper: look up chain result for a seller ID
  const chain = async (sellerId, V) => calculateCommissionChain(sellerId, V);
  const byUser = (breakdown, uid) => breakdown.find(b => b.beneficiary_id === uid);

  // Pick two known users: seller with commission_percent=5% (user 2 Ajay Rai) and admin 10%
  const seller2 = await User.findByPk(2, { attributes: ['id', 'commission_percent', 'referred_by'] });
  const adminU  = await User.findByPk(1, { attributes: ['id', 'commission_percent', 'referred_by'] });

  if (seller2 && adminU) {
    const r = await chain(2, 100000);
    ok(r.breakdown.length >= 1, '1.1 chain result has at least 1 entry');
    const sellerRow = r.breakdown.find(b => b.beneficiary_id === 2);
    ok(sellerRow && sellerRow.level === 0, '1.1 seller has level=0');
    ok(sellerRow && sellerRow.amount === Math.round(100000 * parseFloat(seller2.commission_percent) / 100 * 100) / 100, `1.1 seller amount = V × ${seller2.commission_percent}%`);
    ok(r.total_distributed_amount <= 100000, '1.1 total commission does not exceed sale value');
  } else {
    console.log('  ⚠️  Users 1 or 2 not found; skipping live chain tests (DB may be empty)');
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. SLAB CONFIGURATION
  // ─────────────────────────────────────────────────────────────────
  section('Part 2 — Slab Configuration & Self-Target Reward Logic');

  const slabs = await Slab.findAll({ order: [['min_amount', 'ASC']] });
  ok(slabs.length === 12, `12 slabs in database (found: ${slabs.length})`);

  if (slabs.length >= 2) {
    const s1 = slabs[0], s2 = slabs[1];
    ok(parseFloat(s1.percentage) === 5.0, `Slab 1: 5% commission`);
    ok(parseFloat(s1.self_target_amount) === 500000, `Slab 1: Self Target = ₹5 Lakh`);
    ok(parseFloat(s1.reward_amount) === 10000, `Slab 1: Reward = ₹10,000`);
    ok(parseFloat(s2.self_target_amount) === 750000, `Slab 2: Self Target = ₹7.5 Lakh`);
    ok(parseFloat(s2.reward_amount) === 25000, `Slab 2: Reward = ₹25,000`);

    // Reward eligibility – inline logic mirroring commissionLedgerService.getMonthlyTarget
    const matchSlab = (B) => slabs.find(s => B >= parseFloat(s.min_amount) && B <= parseFloat(s.max_amount));
    const checkReward = (S, B) => {
      const sl = matchSlab(B);
      if (!sl) return false;
      const target = parseFloat(sl.self_target_amount);
      return target > 0 && S >= target;
    };

    ok(checkReward(800000, 2000000) === true,  'S=8L, B=20L → Self target met → reward eligible');
    ok(checkReward(500000, 2000000) === false, 'S=5L, B=20L → Self target NOT met → no reward');
    ok(checkReward(0,      2000000) === false, 'S=0,  B=20L → No self sales → no reward');
    ok(checkReward(500000, 1000000) === true,  'S=5L, B=10L (Slab 1 at exactly max) → target met');
    ok(checkReward(400000, 1000000) === false, 'S=4L, B=10L → target 5L not met');
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. SECURITY — No plain-text passwords
  // ─────────────────────────────────────────────────────────────────
  section('Part 3 — Security: No Plain-Text Passwords');

  const withPlain = await User.findAll({ where: { plain_password: { [Op.not]: null } } });
  ok(withPlain.length === 0, `Zero users have plain_password stored (found: ${withPlain.length})`);

  // ─────────────────────────────────────────────────────────────────
  // 4. USER INTEGRITY AFTER RESET
  // ─────────────────────────────────────────────────────────────────
  section('Part 5 — Data Reset Preserved All 14 Users');

  const userCount = await User.count();
  ok(userCount === 14, `Exactly 14 users preserved (found: ${userCount})`);

  // Admin user intact
  const adminUser = await User.findByPk(1);
  ok(adminUser?.role === 'admin', 'User 1 = Super Admin with role=admin');
  ok(adminUser?.login_id === 'DEV-0001', 'Super Admin login_id = DEV-0001');

  // ─────────────────────────────────────────────────────────────────
  // 5. COMMISSION SCOPING
  // ─────────────────────────────────────────────────────────────────
  section('Part 4 — Commission Scoping (Downline isolation)');

  // For an associate with no downline, downline scope should return 0 rows
  const assoc = await User.findOne({ where: { role: 'associate' } });
  if (assoc) {
    const ledgerResult = await listLedger(
      { id: assoc.id, role: 'associate' },
      { scope: 'downline', page: 1, limit: 10 }
    );
    // Every row must have beneficiary = this associate and level > 0
    const badRows = (ledgerResult.rows || []).filter(r => r.beneficiary?.id !== assoc.id || r.level <= 0);
    ok(badRows.length === 0, `Downline scope only returns rows where beneficiary = this associate and level > 0 (${badRows.length} bad rows)`);
  }

  // ─────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  RESULTS: ${passed} passed  |  ${failed} failed`);
  console.log(`${'═'.repeat(62)}`);
  if (failed === 0) {
    console.log('  🎉 ALL TESTS PASSED\n');
  } else {
    console.log('  ❌ SOME TESTS FAILED — see output above\n');
  }
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('\n💥 Fatal error in test runner:\n', err);
  process.exit(1);
});
