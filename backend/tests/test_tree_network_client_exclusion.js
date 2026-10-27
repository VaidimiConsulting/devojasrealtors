const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { User, sequelize } = require('../models');
const { getFullTree, fetchTree, buildTree } = require('../controllers/networkController');
const { getMyTeam, getMyNetwork } = require('../controllers/associateController');
const { calculateCommissionChain } = require('../services/commissionEngine');

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

// Helper to recursively collect all users in a tree node
function collectTreeUsers(node, list = []) {
  if (!node) return list;
  list.push(node);
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => collectTreeUsers(child, list));
  }
  return list;
}

async function runTreeNetworkTests() {
  console.log('=== TEST SUITE: TREE NETWORK - EXCLUDE CLIENTS, SHOW ASSOCIATES ONLY ===\n');

  try {
    // -------------------------------------------------------------
    // 1. Verify Existing Client Records in DB (Must NOT be deleted)
    // -------------------------------------------------------------
    const clientsInDb = await User.findAll({
      where: { role: 'client' },
      attributes: ['id', 'login_id', 'name', 'role', 'phone']
    });

    assert(clientsInDb.length >= 5, `Database has ${clientsInDb.length} clients intact (Vipin, Ravindra, etc.)`);
    const vipin = clientsInDb.find(c => c.name.toLowerCase().includes('vipin'));
    const ravindra = clientsInDb.find(c => c.name.toLowerCase().includes('ravindra'));
    assert(!!vipin, 'Client Vipin Kumar exists in DB');
    assert(!!ravindra, 'Client Ravindra Prajapati exists in DB');

    // -------------------------------------------------------------
    // 2. Test getFullTree (Admin Tree Network)
    // -------------------------------------------------------------
    const mockReq = { query: {} };
    let jsonResult = null;
    const mockRes = {
      json: (data) => { jsonResult = data; return mockRes; },
      status: () => mockRes
    };

    await getFullTree(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert(jsonResult && jsonResult.success === true, 'getFullTree returned success: true');
    assert(Array.isArray(jsonResult.data) && jsonResult.data.length > 0, 'Tree roots returned');

    // Collect all nodes from all root trees
    const allTreeNodes = [];
    jsonResult.data.forEach(root => collectTreeUsers(root, allTreeNodes));
    console.log(`\nTotal nodes rendered in Company Tree: ${allTreeNodes.length}`);

    // Check roles of all nodes
    const clientNodes = allTreeNodes.filter(n => String(n.role || '').toLowerCase() === 'client');
    const accountsNodes = allTreeNodes.filter(n => String(n.role || '').toLowerCase() === 'accounts');
    const associateNodes = allTreeNodes.filter(n => String(n.role || '').toLowerCase() === 'associate');
    const adminNodes = allTreeNodes.filter(n => String(n.role || '').toLowerCase() === 'admin');

    assert(clientNodes.length === 0, `ZERO clients in Tree Network (Found: ${clientNodes.length})`);
    assert(accountsNodes.length === 0, `ZERO accounts users in Tree Network (Found: ${accountsNodes.length})`);
    assert(adminNodes.length >= 1, `Super Admin is present in Tree Network (Found: ${adminNodes.length})`);
    assert(associateNodes.length >= 10, `Associates are present in Tree Network (Found: ${associateNodes.length})`);

    // Verify specifically that Vipin and Ravindra are NOT in tree
    const vipinInTree = allTreeNodes.find(n => n.name && n.name.toLowerCase().includes('vipin'));
    const ravindraInTree = allTreeNodes.find(n => n.name && n.name.toLowerCase().includes('ravindra'));
    assert(!vipinInTree, 'Vipin is completely absent from Tree Network');
    assert(!ravindraInTree, 'Ravindra is completely absent from Tree Network');

    // Verify key associates ARE in tree under correct hierarchy
    const ramNode = allTreeNodes.find(n => n.name === 'Ram' || n.login_id === 'DEV-0002');
    const mohanNode = allTreeNodes.find(n => n.name === 'Mohan' || n.login_id === 'DEV-0003');
    const sohanNode = allTreeNodes.find(n => n.name === 'Sohan' || n.login_id === 'DEV-0004');
    const rohanNode = allTreeNodes.find(n => n.name === 'Rohan' || n.login_id === 'DEV-0005');

    assert(!!ramNode, 'Ram (DEV-0002) is present in Tree Network');
    assert(!!mohanNode, 'Mohan (DEV-0003) is present in Tree Network');
    assert(!!sohanNode, 'Sohan (DEV-0004) is present in Tree Network');
    assert(!!rohanNode, 'Rohan (DEV-0005) is present in Tree Network');

    // Hierarchy test: Mohan & Sohan should be children of Ram
    if (ramNode) {
      const ramChildrenIds = (ramNode.children || []).map(c => c.id);
      assert(mohanNode && ramChildrenIds.includes(mohanNode.id), 'Mohan is child node of Ram');
      assert(sohanNode && ramChildrenIds.includes(sohanNode.id), 'Sohan is child node of Ram');
    }

    // Hierarchy test: Rohan should be child node of Mohan
    if (mohanNode) {
      const mohanChildrenIds = (mohanNode.children || []).map(c => c.id);
      assert(rohanNode && mohanChildrenIds.includes(rohanNode.id), 'Rohan is child node of Mohan');
    }

    // Check totalCount matches associates count
    assert(jsonResult.totalCount === associateNodes.length, `totalCount (${jsonResult.totalCount}) strictly equals associates count (${associateNodes.length})`);

    // -------------------------------------------------------------
    // 3. Test Associate Network Endpoint (getMyNetwork)
    // -------------------------------------------------------------
    if (ramNode) {
      let ramNetResult = null;
      const ramReq = { user: { id: ramNode.id, role: 'associate' } };
      const ramRes = {
        json: (data) => { ramNetResult = data; return ramRes; }
      };

      await getMyNetwork(ramReq, ramRes, (err) => { if (err) throw err; });
      assert(ramNetResult && ramNetResult.success === true, 'Ram getMyNetwork returned success');

      const ramSubTreeNodes = collectTreeUsers(ramNetResult.data);
      const clientsInRamTree = ramSubTreeNodes.filter(n => n.role === 'client');
      assert(clientsInRamTree.length === 0, `ZERO clients in Ram's downline tree (Found: ${clientsInRamTree.length})`);
      assert(ramNetResult.totalCount === ramSubTreeNodes.length - 1, `Ram's total downline count excludes self & clients (${ramNetResult.totalCount})`);
    }

    // -------------------------------------------------------------
    // 4. Test Associate My Team Endpoint (getMyTeam)
    // -------------------------------------------------------------
    if (ramNode) {
      let ramTeamResult = null;
      const ramReq = { user: { id: ramNode.id, role: 'associate' } };
      const ramRes = {
        json: (data) => { ramTeamResult = data; return ramRes; }
      };

      await getMyTeam(ramReq, ramRes, (err) => { if (err) throw err; });
      assert(ramTeamResult && ramTeamResult.success === true, 'Ram getMyTeam returned success');

      const nonAssociatesInTeam = ramTeamResult.data.filter(u => u.role !== 'associate');
      assert(nonAssociatesInTeam.length === 0, `Ram's direct team contains ONLY associates (Non-associates: ${nonAssociatesInTeam.length})`);
      console.log(`Ram's direct team count: ${ramTeamResult.count} (Mohan, Sohan)`);
    }

    // -------------------------------------------------------------
    // 5. Test Commission Engine Calculation
    // -------------------------------------------------------------
    // Test that calculating commission for an associate still works seamlessly
    if (rohanNode) {
      const commChain = await calculateCommissionChain(rohanNode.id, 100000);
      assert(commChain && commChain.breakdown.length > 0, 'Commission chain calculated successfully for Rohan');
      // Ensure no client is in commission breakdown
      const clientInComm = commChain.breakdown.filter(b => b.beneficiary_role === 'client');
      assert(clientInComm.length === 0, 'ZERO clients in commission distribution');
    }

    // Test that client cannot be treated as seller associate for commission
    if (vipin) {
      let threwForClient = false;
      try {
        await calculateCommissionChain(vipin.id, 100000);
      } catch (e) {
        threwForClient = true;
      }
      assert(threwForClient, 'Commission engine properly rejects clients from receiving associate commission');
    }

    console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution failed with error:', error);
    process.exit(1);
  }
}

runTreeNetworkTests();
