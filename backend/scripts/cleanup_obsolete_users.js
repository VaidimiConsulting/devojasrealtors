/**
 * SAFE USER CLEANUP SCRIPT
 * Removes obsolete/demo/test users while preserving:
 *   ID:1  — Super Admin
 *   ID:83 — Ram
 *   ID:90 — Mohan
 *   ID:91 — Sohan
 *   ID:92 — Rohan
 *
 * Strategy:
 *   - Users with financial record links → deactivate (status=blocked) instead of hard-delete
 *   - Orphan demo/test users with no financial records → hard delete
 *   - Hierarchy references (referred_by) pointing to deleted users → set to null
 */

const { sequelize, User, Wallet, WalletTransaction, Commission, Transaction, Payment, BookingForm } = require('../models');

// IDs that MUST NEVER be deleted
const PROTECTED_IDS = new Set([1, 83, 90, 91, 92]);

// IDs with financial record ties (from audit query) — these we deactivate, not delete
const FINANCIAL_IDS = new Set([1, 2, 5, 7, 11, 12, 39, 40, 41, 42, 43, 45, 46, 83, 84, 86, 87, 89, 90, 91, 92]);

async function previewAndClean(dryRun = true) {
  console.log('\n====================================================');
  console.log(dryRun ? '  DRY RUN — Preview only (no changes)' : '  LIVE RUN — Executing cleanup');
  console.log('====================================================\n');

  const allUsers = await User.findAll({ raw: true, order: [['id', 'ASC']] });

  const toDelete = [];
  const toDeactivate = [];
  const toPreserve = [];

  for (const u of allUsers) {
    if (PROTECTED_IDS.has(u.id)) {
      toPreserve.push(u);
      continue;
    }
    // If user has financial records, deactivate instead of delete
    if (FINANCIAL_IDS.has(u.id)) {
      toDeactivate.push(u);
    } else {
      toDelete.push(u);
    }
  }

  console.log('=== PROTECTED (will not be touched) ===');
  toPreserve.forEach(u => console.log(`  ✅ ID:${u.id} | ${u.name} | ${u.email || u.phone} | ${u.role}`));

  console.log('\n=== TO DEACTIVATE (have financial records — safe archive) ===');
  toDeactivate.forEach(u => console.log(`  🔒 ID:${u.id} | ${u.name} | ${u.email || u.phone} | ${u.role}`));

  console.log('\n=== TO DELETE (no financial records — safe to remove) ===');
  toDelete.forEach(u => console.log(`  🗑️  ID:${u.id} | ${u.name} | ${u.email || u.phone} | ${u.role}`));

  console.log(`\nSummary: Preserve=${toPreserve.length}, Deactivate=${toDeactivate.length}, Delete=${toDelete.length}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN complete. Run with dryRun=false to execute.\n');
    return;
  }

  // Execute within a transaction
  const t = await sequelize.transaction();
  try {
    // 1. Deactivate users with financial records (archive, not delete)
    if (toDeactivate.length > 0) {
      const deactivateIds = toDeactivate.map(u => u.id);
      await User.update(
        { status: 'blocked' },
        { where: { id: deactivateIds }, transaction: t }
      );
      console.log(`\n✅ Deactivated ${deactivateIds.length} users with financial records.`);
    }

    // 2. For users to delete: clean up wallet records first, then delete
    for (const u of toDelete) {
      // Nullify referred_by for their downline so hierarchy isn't broken
      await User.update(
        { referred_by: null },
        { where: { referred_by: u.id }, transaction: t }
      );
      // Clean wallet records
      await WalletTransaction.destroy({ where: { user_id: u.id }, transaction: t });
      await Wallet.destroy({ where: { user_id: u.id }, transaction: t });
      // Delete the user
      await User.destroy({ where: { id: u.id }, transaction: t });
    }
    console.log(`✅ Deleted ${toDelete.length} obsolete users with no financial records.`);

    await t.commit();
    console.log('\n✅ Cleanup complete. Database committed.\n');
  } catch (err) {
    await t.rollback();
    console.error('\n❌ Error during cleanup — rolled back.', err.message);
    throw err;
  }
}

// Run dry-run by default; pass --execute to actually delete
const dryRun = !process.argv.includes('--execute');
previewAndClean(dryRun).catch(console.error).finally(() => sequelize.close());
