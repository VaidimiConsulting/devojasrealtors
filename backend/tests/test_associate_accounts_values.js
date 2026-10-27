const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getAssociatesAccountsList, getAssociateAccountDetails } = require('../controllers/accountsController');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== TEST SUITE: ASSOCIATE ACCOUNTS ACTUAL VALUES ===\n');

  try {
    // 1. Test getAssociatesAccountsList
    let listResult = null;
    const req = { query: {} };
    const res = {
      json: (d) => { listResult = d; return res; },
      status: () => res
    };

    await getAssociatesAccountsList(req, res, (err) => { if (err) throw err; });

    assert(listResult && listResult.success === true, 'getAssociatesAccountsList returned success');
    assert(Array.isArray(listResult.data) && listResult.data.length === 11, `Returned 11 associates (got ${listResult.data.length})`);

    const byLogin = {};
    listResult.data.forEach(a => { byLogin[a.login_id] = a; });

    // 2. Check Ram (DEV-0002)
    const ram = byLogin['DEV-0002'];
    assert(!!ram, 'Ram (DEV-0002) exists in response');
    assert(ram.salesCount === 1, `Ram salesCount is 1 (got ${ram.salesCount})`);
    assert(ram.totalSalesVolume === 750000, `Ram totalSalesVolume is 750,000 (got ${ram.totalSalesVolume})`);
    assert(ram.salesVolume === 750000, `Ram salesVolume is 750,000 (got ${ram.salesVolume})`);
    assert(ram.totalCommissionEarned === 415000, `Ram totalCommissionEarned is 415,000 (got ${ram.totalCommissionEarned})`);
    assert(ram.pendingCommissions === 415000, `Ram pendingCommissions is 415,000 (got ${ram.pendingCommissions})`);
    assert(ram.sponsor && ram.sponsor.login_id === 'DEV-0001', `Ram sponsor is Super Admin DEV-0001 (got ${ram.sponsor?.login_id})`);

    // 3. Check Mohan (DEV-0003)
    const mohan = byLogin['DEV-0003'];
    assert(!!mohan, 'Mohan (DEV-0003) exists in response');
    assert(mohan.salesCount === 1, `Mohan salesCount is 1 (got ${mohan.salesCount})`);
    assert(mohan.totalSalesVolume === 6000000, `Mohan totalSalesVolume is 6,000,000 (got ${mohan.totalSalesVolume})`);
    assert(mohan.salesVolume === 6000000, `Mohan salesVolume is 6,000,000 (got ${mohan.salesVolume})`);
    assert(mohan.totalCommissionEarned === 450000, `Mohan totalCommissionEarned is 450,000 (got ${mohan.totalCommissionEarned})`);
    assert(mohan.pendingCommissions === 450000, `Mohan pendingCommissions is 450,000 (got ${mohan.pendingCommissions})`);
    assert(mohan.sponsor && mohan.sponsor.login_id === 'DEV-0002', `Mohan sponsor is Ram DEV-0002 (got ${mohan.sponsor?.login_id})`);

    // 4. Check Sohan (DEV-0004)
    const sohan = byLogin['DEV-0004'];
    assert(!!sohan, 'Sohan (DEV-0004) exists in response');
    assert(sohan.salesCount === 1, `Sohan salesCount is 1 (got ${sohan.salesCount})`);
    assert(sohan.totalSalesVolume === 9000000, `Sohan totalSalesVolume is 9,000,000 (got ${sohan.totalSalesVolume})`);
    assert(sohan.salesVolume === 9000000, `Sohan salesVolume is 9,000,000 (got ${sohan.salesVolume})`);
    assert(sohan.totalCommissionEarned === 800000, `Sohan totalCommissionEarned is 800,000 (got ${sohan.totalCommissionEarned})`);
    assert(sohan.pendingCommissions === 800000, `Sohan pendingCommissions is 800,000 (got ${sohan.pendingCommissions})`);
    assert(sohan.sponsor && sohan.sponsor.login_id === 'DEV-0002', `Sohan sponsor is Ram DEV-0002 (got ${sohan.sponsor?.login_id})`);

    // 5. Check Rohan (DEV-0005)
    const rohan = byLogin['DEV-0005'];
    assert(!!rohan, 'Rohan (DEV-0005) exists in response');
    assert(rohan.salesCount === 0, `Rohan salesCount is 0 (got ${rohan.salesCount})`);
    assert(rohan.totalSalesVolume === 0, `Rohan totalSalesVolume is 0 (got ${rohan.totalSalesVolume})`);
    assert(rohan.totalCommissionEarned === 0, `Rohan totalCommissionEarned is 0 (got ${rohan.totalCommissionEarned})`);
    assert(rohan.sponsor && rohan.sponsor.login_id === 'DEV-0003', `Rohan sponsor is Mohan DEV-0003 (got ${rohan.sponsor?.login_id})`);

    // 6. Check Fixed Associates 1 to 6 (Zero deals, zero volume, zero commission)
    for (let i = 1; i <= 6; i++) {
      const fa = byLogin[`DEV-000${5 + i}`] || byLogin[`DEV-00${5 + i}`];
      assert(fa && fa.salesCount === 0 && fa.totalSalesVolume === 0 && fa.totalCommissionEarned === 0, `Fixed Associate ${i} shows genuine zero`);
    }

    // 7. Check Detail Ledger statement for Ram (DEV-0002)
    let ramDetail = null;
    const ramReq = { params: { id: ram.id } };
    const ramRes = { json: (d) => { ramDetail = d; return ramRes; }, status: () => ramRes };
    await getAssociateAccountDetails(ramReq, ramRes, (err) => { if (err) throw err; });

    assert(ramDetail && ramDetail.success === true, 'getAssociateAccountDetails for Ram returned success');
    assert(ramDetail.data.personalDeals.length === 1, `Ram has 1 personal deal in detail (got ${ramDetail.data.personalDeals.length})`);
    assert(ramDetail.data.commissions.length === 2, `Ram has 2 differential commission records (got ${ramDetail.data.commissions.length})`);
    assert(ramDetail.data.rewards.length === 1, `Ram has 1 slab milestone reward (got ${ramDetail.data.rewards.length})`);
    assert(ramDetail.data.summary.totalEarned === 415000, `Ram summary totalEarned is 415,000 (got ${ramDetail.data.summary.totalEarned})`);

    console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runTests();
