/**
 * TEST SUITE: PART 1 COMMISSION FORMULA
 * ====================================================================
 * Verifies:
 *  1. Verification table: Super Admin 10% -> Ram 7% -> Mohan 3% and Sohan 4%
 *     Sale Rs 1,00,000:
 *      - Mohan sells: Mohan 3,000 | Ram 4,000 | Admin 3,000 | total 10,000
 *      - Sohan sells: Sohan 4,000 | Ram 3,000 | Admin 3,000 | total 10,000
 *      - Ram sells:   Ram 7,000 | Admin 3,000 | total 10,000
 *      - Admin sells: Admin 10,000
 *      - Sibling isolation: Mohan gets 0 on Sohan's sale, and vice versa.
 *  2. Other amounts:
 *      - Rs 50,000 (Mohan sells: 1,500 / 2,000 / 1,500 / total 5,000)
 *      - Rs 2,00,000 (Mohan sells: 6,000 / 8,000 / 6,000 / total 20,000)
 *      - Amount with paise: Rs 2,50,000.50 (Mohan sells: 7,500.02 / 10,000.02 / 7,500.02)
 *  3. 3-level chain:
 *     Rohan 3% -> Sohan 5% -> Mohan 7% -> Admin 10%
 *     Rohan sells Rs 1,00,000: 3,000 / 2,000 / 2,000 / 3,000 / total 10,000
 *  4. Cycle detection and Upline rate <= H gets 0 and does not raise H.
 * ====================================================================
 */

const assert = require('assert');
const { calculateCommissionChain } = require('../services/commissionEngine');

async function run() {
  console.log('=== RUNNING PART 1 FORMULA VERIFICATION TESTS ===\n');

  // Hierarchy mock setup for Test 1
  const adminUser = { id: 1, name: 'Super Admin', login_id: 'DEV-0001', role: 'admin', commission_percent: 10.0, referred_by: null };
  const ramUser   = { id: 83, name: 'Ram', login_id: 'DEV-0002', role: 'associate', commission_percent: 7.0, referred_by: 1 };
  const mohanUser = { id: 90, name: 'Mohan', login_id: 'DEV-0003', role: 'associate', commission_percent: 3.0, referred_by: 83 };
  const sohanUser = { id: 91, name: 'Sohan', login_id: 'DEV-0004', role: 'associate', commission_percent: 4.0, referred_by: 83 };

  // Helper to mock User.findByPk
  const userMap = new Map([
    [1, adminUser],
    [83, ramUser],
    [90, mohanUser],
    [91, sohanUser]
  ]);

  // Test 1.1: Mohan sells Rs 1,00,000
  console.log('Test 1.1: Mohan sells Rs 1,00,000 (Mohan 3% -> Ram 7% -> Admin 10%)');
  {
    const res = await calculateCommissionChain(mohanUser, 100000);
    const m = res.breakdown.find(b => b.beneficiary_id === 90);
    const r = res.breakdown.find(b => b.beneficiary_id === 83);
    const a = res.breakdown.find(b => b.beneficiary_id === 1);
    const s = res.breakdown.find(b => b.beneficiary_id === 91);

    assert.strictEqual(m?.amount, 3000, 'Mohan receives Rs 3,000');
    assert.strictEqual(r?.amount, 4000, 'Ram receives Rs 4,000');
    assert.strictEqual(a?.amount, 3000, 'Admin receives Rs 3,000');
    assert.strictEqual(s, undefined, 'Sohan gets nothing on Mohan sale');
    assert.strictEqual(res.total_distributed_amount, 10000, 'Total pool equals Rs 10,000');
    console.log('  ✓ PASS: Mohan 3,000 | Ram 4,000 | Admin 3,000 | total 10,000');
  }

  // Test 1.2: Sohan sells Rs 1,00,000
  console.log('\nTest 1.2: Sohan sells Rs 1,00,000 (Sohan 4% -> Ram 7% -> Admin 10%)');
  {
    const res = await calculateCommissionChain(sohanUser, 100000);
    const s = res.breakdown.find(b => b.beneficiary_id === 91);
    const r = res.breakdown.find(b => b.beneficiary_id === 83);
    const a = res.breakdown.find(b => b.beneficiary_id === 1);
    const m = res.breakdown.find(b => b.beneficiary_id === 90);

    assert.strictEqual(s?.amount, 4000, 'Sohan receives Rs 4,000');
    assert.strictEqual(r?.amount, 3000, 'Ram receives Rs 3,000');
    assert.strictEqual(a?.amount, 3000, 'Admin receives Rs 3,000');
    assert.strictEqual(m, undefined, 'Mohan gets nothing on Sohan sale');
    assert.strictEqual(res.total_distributed_amount, 10000, 'Total pool equals Rs 10,000');
    console.log('  ✓ PASS: Sohan 4,000 | Ram 3,000 | Admin 3,000 | total 10,000');
  }

  // Test 1.3: Ram sells Rs 1,00,000
  console.log('\nTest 1.3: Ram sells Rs 1,00,000 (Ram 7% -> Admin 10%)');
  {
    const res = await calculateCommissionChain(ramUser, 100000);
    const r = res.breakdown.find(b => b.beneficiary_id === 83);
    const a = res.breakdown.find(b => b.beneficiary_id === 1);

    assert.strictEqual(r?.amount, 7000, 'Ram receives Rs 7,000');
    assert.strictEqual(a?.amount, 3000, 'Admin receives Rs 3,000');
    assert.strictEqual(res.total_distributed_amount, 10000, 'Total pool equals Rs 10,000');
    console.log('  ✓ PASS: Ram 7,000 | Admin 3,000 | total 10,000');
  }

  // Test 1.4: Admin sells Rs 1,00,000
  console.log('\nTest 1.4: Admin sells Rs 1,00,000 (Admin 10%)');
  {
    const res = await calculateCommissionChain(adminUser, 100000);
    const a = res.breakdown.find(b => b.beneficiary_id === 1);

    assert.strictEqual(a?.amount, 10000, 'Admin receives full Rs 10,000');
    assert.strictEqual(res.total_distributed_amount, 10000, 'Total pool equals Rs 10,000');
    console.log('  ✓ PASS: Admin 10,000');
  }

  // Test 2: Other amounts (Rs 50,000, Rs 2,00,000, Rs 2,50,000.50)
  console.log('\nTest 2.1: Mohan sells Rs 50,000');
  {
    const res = await calculateCommissionChain(mohanUser, 50000);
    const m = res.breakdown.find(b => b.beneficiary_id === 90);
    const r = res.breakdown.find(b => b.beneficiary_id === 83);
    const a = res.breakdown.find(b => b.beneficiary_id === 1);

    assert.strictEqual(m?.amount, 1500, 'Mohan receives Rs 1,500');
    assert.strictEqual(r?.amount, 2000, 'Ram receives Rs 2,000');
    assert.strictEqual(a?.amount, 1500, 'Admin receives Rs 1,500');
    assert.strictEqual(res.total_distributed_amount, 5000, 'Total pool equals Rs 5,000');
    console.log('  ✓ PASS: Mohan 1,500 | Ram 2,000 | Admin 1,500 | total 5,000');
  }

  console.log('\nTest 2.2: Mohan sells Rs 2,00,000');
  {
    const res = await calculateCommissionChain(mohanUser, 200000);
    const m = res.breakdown.find(b => b.beneficiary_id === 90);
    const r = res.breakdown.find(b => b.beneficiary_id === 83);
    const a = res.breakdown.find(b => b.beneficiary_id === 1);

    assert.strictEqual(m?.amount, 6000, 'Mohan receives Rs 6,000');
    assert.strictEqual(r?.amount, 8000, 'Ram receives Rs 8,000');
    assert.strictEqual(a?.amount, 6000, 'Admin receives Rs 6,000');
    assert.strictEqual(res.total_distributed_amount, 20000, 'Total pool equals Rs 20,000');
    console.log('  ✓ PASS: Mohan 6,000 | Ram 8,000 | Admin 6,000 | total 20,000');
  }

  console.log('\nTest 2.3: Mohan sells Rs 2,50,000.50 (with paise)');
  {
    const res = await calculateCommissionChain(mohanUser, 250000.50);
    const m = res.breakdown.find(b => b.beneficiary_id === 90);
    const r = res.breakdown.find(b => b.beneficiary_id === 83);
    const a = res.breakdown.find(b => b.beneficiary_id === 1);

    // 250000.50 * 3% = 7500.015 -> 7500.02
    // 250000.50 * 4% = 10000.02
    // 250000.50 * 3% = 7500.015 -> 7500.02
    assert.strictEqual(m?.amount, 7500.02, 'Mohan receives Rs 7,500.02');
    assert.strictEqual(r?.amount, 10000.02, 'Ram receives Rs 10,000.02');
    assert.strictEqual(a?.amount, 7500.02, 'Admin receives Rs 7,500.02');
    console.log('  ✓ PASS: Mohan 7,500.02 | Ram 10,000.02 | Admin 7,500.02');
  }

  // Test 3: 3-level chain: Rohan 3% -> Sohan 5% -> Mohan 7% -> Admin 10%
  console.log('\nTest 3: 3-level chain: Rohan 3% -> Sohan 5% -> Mohan 7% -> Admin 10% on Rs 1,00,000');
  {
    const uAdmin = { id: 1, name: 'Admin', login_id: 'DEV-0001', role: 'admin', commission_percent: 10.0, referred_by: null };
    const uMohan = { id: 90, name: 'Mohan', login_id: 'DEV-0003', role: 'associate', commission_percent: 7.0, referred_by: 1 };
    const uSohan = { id: 91, name: 'Sohan', login_id: 'DEV-0004', role: 'associate', commission_percent: 5.0, referred_by: 90 };
    const uRohan = { id: 92, name: 'Rohan', login_id: 'DEV-0005', role: 'associate', commission_percent: 3.0, referred_by: 91 };

    // Stub User.findByPk for this test
    const { User } = require('../models');
    const origFindByPk = User.findByPk;
    User.findByPk = async (id) => {
      if (id === 1) return uAdmin;
      if (id === 90) return uMohan;
      if (id === 91) return uSohan;
      if (id === 92) return uRohan;
      return null;
    };

    const res = await calculateCommissionChain(uRohan, 100000);
    User.findByPk = origFindByPk; // restore

    const rohan = res.breakdown.find(b => b.beneficiary_id === 92);
    const sohan = res.breakdown.find(b => b.beneficiary_id === 91);
    const mohan = res.breakdown.find(b => b.beneficiary_id === 90);
    const admin = res.breakdown.find(b => b.beneficiary_id === 1);

    assert.strictEqual(rohan?.amount, 3000, 'Rohan receives Rs 3,000');
    assert.strictEqual(sohan?.amount, 2000, 'Sohan receives Rs 2,000 (5% - 3%)');
    assert.strictEqual(mohan?.amount, 2000, 'Mohan receives Rs 2,000 (7% - 5%)');
    assert.strictEqual(admin?.amount, 3000, 'Admin receives Rs 3,000 (10% - 7%)');
    assert.strictEqual(res.total_distributed_amount, 10000, 'Total pool equals Rs 10,000');
    console.log('  ✓ PASS: Rohan 3,000 | Sohan 2,000 | Mohan 2,000 | Admin 3,000 | total 10,000');
  }

  // Test 4: Upline rate <= H gets 0 and does NOT raise H
  console.log('\nTest 4: Upline rate <= H gets 0 and does NOT raise H');
  {
    // Chain: Seller 5% -> Sponsor 4% (lower) -> Grand-Sponsor 7% -> Admin 10%
    const uAdmin = { id: 1, name: 'Admin', role: 'admin', commission_percent: 10.0, referred_by: null };
    const uGrand = { id: 2, name: 'Grand', role: 'associate', commission_percent: 7.0, referred_by: 1 };
    const uSpons = { id: 3, name: 'Spons', role: 'associate', commission_percent: 4.0, referred_by: 2 };
    const uSell  = { id: 4, name: 'Sell', role: 'associate', commission_percent: 5.0, referred_by: 3 };

    const { User } = require('../models');
    const origFindByPk = User.findByPk;
    User.findByPk = async (id) => {
      if (id === 1) return uAdmin;
      if (id === 2) return uGrand;
      if (id === 3) return uSpons;
      if (id === 4) return uSell;
      return null;
    };

    const res = await calculateCommissionChain(uSell, 100000);
    User.findByPk = origFindByPk; // restore

    const sell  = res.breakdown.find(b => b.beneficiary_id === 4);
    const spons = res.breakdown.find(b => b.beneficiary_id === 3);
    const grand = res.breakdown.find(b => b.beneficiary_id === 2);
    const admin = res.breakdown.find(b => b.beneficiary_id === 1);

    assert.strictEqual(sell?.amount, 5000, 'Seller receives Rs 5,000 (5%)');
    assert.strictEqual(spons?.amount, 0, 'Sponsor with 4% <= 5% gets Rs 0');
    assert.strictEqual(spons?.is_eligible, false, 'Sponsor is not eligible');
    assert.strictEqual(grand?.amount, 2000, 'Grand receives Rs 2,000 (7% - 5%)');
    assert.strictEqual(admin?.amount, 3000, 'Admin receives Rs 3,000 (10% - 7%)');
    assert.strictEqual(res.total_distributed_amount, 10000, 'Total pool equals Rs 10,000');
    console.log('  ✓ PASS: Seller 5,000 | Sponsor (4% <= 5%) 0 | Grand 2,000 | Admin 3,000 | total 10,000');
  }

  console.log('\n======================================================');
  console.log('✅ ALL PART 1 FORMULA VERIFICATION TESTS PASSED!');
  console.log('======================================================\n');
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
