/**
 * Migration: Add paid_amount column to emi_installments table
 * Supports partial EMI payment tracking
 */
const { sequelize } = require('../config/db');

async function runMigration() {
  console.log('--- EMI Installments paid_amount Migration ---');
  await sequelize.authenticate();

  const queryInterface = sequelize.getQueryInterface();

  try {
    const instCols = await queryInterface.describeTable('emi_installments');

    if (!instCols.paid_amount) {
      console.log('Adding paid_amount column to emi_installments...');
      await sequelize.query(
        'ALTER TABLE `emi_installments` ADD COLUMN `paid_amount` DECIMAL(15,2) DEFAULT 0.00 AFTER `amount`;'
      );
      console.log('✓ paid_amount column added.');
    } else {
      console.log('✓ paid_amount column already exists — skipping.');
    }

    // Backfill: where status = paid and paid_amount = 0, set paid_amount = amount
    await sequelize.query(
      "UPDATE `emi_installments` SET `paid_amount` = `amount` WHERE `status` = 'paid' AND (`paid_amount` IS NULL OR `paid_amount` = 0);"
    );
    console.log('✓ Backfilled paid_amount for existing paid installments.');

  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }

  console.log('--- Migration complete ---');
  process.exit(0);
}

runMigration();
