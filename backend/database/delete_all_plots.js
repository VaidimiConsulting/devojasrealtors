/**
 * DELETE ALL PLOTS — Force delete all plots and their linked records
 * WARNING: This permanently deletes ALL plots + linked transactions, payments, booking_forms
 * Run ONLY when user explicitly confirms.
 */

const { sequelize } = require('../config/db');

async function deleteAllPlots() {
  console.log('=== Fetching all plots ===');

  const [plots] = await sequelize.query('SELECT id, title, status FROM plots ORDER BY id ASC');
  console.log('Total plots found:', plots.length);
  plots.forEach(function(p) {
    console.log('  Plot ID:' + p.id + ' | ' + p.title + ' | status:' + p.status);
  });

  if (plots.length === 0) {
    console.log('No plots to delete.');
    process.exit(0);
  }

  const plotIds = plots.map(function(p) { return p.id; });
  const idList = plotIds.join(',');

  console.log('\n=== Checking linked records ===');
  const [txns] = await sequelize.query('SELECT COUNT(*) AS cnt FROM transactions WHERE plot_id IN (' + idList + ')');
  const [bookings] = await sequelize.query('SELECT COUNT(*) AS cnt FROM booking_forms WHERE plot_id IN (' + idList + ')');
  const [payments] = await sequelize.query('SELECT COUNT(*) AS cnt FROM payments WHERE transaction_id IN (SELECT id FROM transactions WHERE plot_id IN (' + idList + '))');

  console.log('Linked transactions:', txns[0].cnt);
  console.log('Linked booking_forms:', bookings[0].cnt);
  console.log('Linked payments (via transactions):', payments[0].cnt);

  console.log('\n=== Starting forced deletion (in correct FK order) ===');

  // Step 1: Delete payments linked to transactions of these plots
  const payResult = await sequelize.query(
    'DELETE FROM payments WHERE transaction_id IN (SELECT id FROM transactions WHERE plot_id IN (' + idList + '))'
  );
  console.log('Deleted payments:', payResult[0].affectedRows || 0);

  // Step 2: Delete commission records linked to transactions of these plots
  try {
    const commResult = await sequelize.query(
      'DELETE FROM commissions WHERE transaction_id IN (SELECT id FROM transactions WHERE plot_id IN (' + idList + '))'
    );
    console.log('Deleted commissions:', commResult[0].affectedRows || 0);
  } catch (e) {
    console.log('commissions table skip:', e.message);
  }

  // Step 2b: Delete EMI installments linked to EMI plans of these transactions
  try {
    const emiInstResult = await sequelize.query(
      'DELETE FROM emi_installments WHERE emi_plan_id IN (SELECT id FROM emi_plans WHERE transaction_id IN (SELECT id FROM transactions WHERE plot_id IN (' + idList + ')))'
    );
    console.log('Deleted emi_installments:', emiInstResult[0].affectedRows || 0);
  } catch (e) {
    console.log('emi_installments table skip:', e.message);
  }

  // Step 2c: Delete EMI payments linked to EMI plans of these transactions
  try {
    const emiPayResult = await sequelize.query(
      'DELETE FROM emi_payments WHERE emi_plan_id IN (SELECT id FROM emi_plans WHERE transaction_id IN (SELECT id FROM transactions WHERE plot_id IN (' + idList + ')))'
    );
    console.log('Deleted emi_payments:', emiPayResult[0].affectedRows || 0);
  } catch (e) {
    console.log('emi_payments table skip:', e.message);
  }

  // Step 2d: Delete EMI plans linked to these transactions
  try {
    const emiPlanResult = await sequelize.query(
      'DELETE FROM emi_plans WHERE transaction_id IN (SELECT id FROM transactions WHERE plot_id IN (' + idList + '))'
    );
    console.log('Deleted emi_plans:', emiPlanResult[0].affectedRows || 0);
  } catch (e) {
    console.log('emi_plans table skip:', e.message);
  }

  // Step 3: Delete transactions
  const txnResult = await sequelize.query(
    'DELETE FROM transactions WHERE plot_id IN (' + idList + ')'
  );
  console.log('Deleted transactions:', txnResult[0].affectedRows || 0);

  // Step 4: Delete booking_forms
  const bookResult = await sequelize.query(
    'DELETE FROM booking_forms WHERE plot_id IN (' + idList + ')'
  );
  console.log('Deleted booking_forms:', bookResult[0].affectedRows || 0);

  // Step 5: Nullify owner_id in plots (safety, already nullable now)
  await sequelize.query('UPDATE plots SET owner_id = NULL WHERE id IN (' + idList + ')');

  // Step 6: Delete all plots
  const plotResult = await sequelize.query('DELETE FROM plots WHERE id IN (' + idList + ')');
  console.log('Deleted plots:', plotResult[0].affectedRows || 0);

  // Verify
  const [remaining] = await sequelize.query('SELECT COUNT(*) AS cnt FROM plots');
  console.log('\n=== Done! Remaining plots in DB:', remaining[0].cnt, '===');
  process.exit(0);
}

deleteAllPlots().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
