const { sequelize } = require('../config/db');

async function runMigration() {
  console.log('--- Starting Non-Destructive Precision & Commission Ledger Migration ---');
  await sequelize.authenticate();

  const queryInterface = sequelize.getQueryInterface();
  const [tables] = await sequelize.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);

  // 1. Update columns in users table: commission_percent to DECIMAL(6,4)
  try {
    console.log('Upgrading users.commission_percent to DECIMAL(6,4)...');
    await sequelize.query('ALTER TABLE `users` MODIFY COLUMN `commission_percent` DECIMAL(6,4) DEFAULT 5.0000 COMMENT "Current commission percentage for this associate";');
    await sequelize.query('ALTER TABLE `users` MODIFY COLUMN `referral_commission_percent` DECIMAL(6,4) NULL COMMENT "Fixed % this user gives to their own referrer";');
  } catch (err) {
    console.warn('Notice altering users columns:', err.message);
  }

  // 2. Update commissions table: decimal precision and payment balance tracking
  const commCols = await queryInterface.describeTable('commissions');
  try {
    console.log('Upgrading commissions percent columns to DECIMAL(6,4)...');
    await sequelize.query('ALTER TABLE `commissions` MODIFY COLUMN `percent` DECIMAL(6,4) NOT NULL;');
    await sequelize.query('ALTER TABLE `commissions` MODIFY COLUMN `upline_percent` DECIMAL(6,4) DEFAULT 0.0000;');
    await sequelize.query('ALTER TABLE `commissions` MODIFY COLUMN `downline_percent` DECIMAL(6,4) DEFAULT 0.0000;');
    await sequelize.query('ALTER TABLE `commissions` MODIFY COLUMN `differential_percent` DECIMAL(6,4) DEFAULT 0.0000;');
  } catch (err) {
    console.warn('Notice modifying commissions percent columns:', err.message);
  }

  if (!commCols.base_price) {
    console.log('Adding base_price to commissions...');
    await sequelize.query('ALTER TABLE `commissions` ADD COLUMN `base_price` DECIMAL(15,2) DEFAULT 0.00 AFTER `base_amount`;');
  }
  if (!commCols.sale_price) {
    console.log('Adding sale_price to commissions...');
    await sequelize.query('ALTER TABLE `commissions` ADD COLUMN `sale_price` DECIMAL(15,2) DEFAULT 0.00 AFTER `base_price`;');
  }
  if (!commCols.eligible_difference) {
    console.log('Adding eligible_difference to commissions...');
    await sequelize.query('ALTER TABLE `commissions` ADD COLUMN `eligible_difference` DECIMAL(15,2) DEFAULT 0.00 AFTER `sale_price`;');
  }
  if (!commCols.paid_amount) {
    console.log('Adding paid_amount to commissions...');
    await sequelize.query('ALTER TABLE `commissions` ADD COLUMN `paid_amount` DECIMAL(15,2) DEFAULT 0.00 AFTER `amount`;');
  }
  if (!commCols.remaining_amount) {
    console.log('Adding remaining_amount to commissions...');
    await sequelize.query('ALTER TABLE `commissions` ADD COLUMN `remaining_amount` DECIMAL(15,2) DEFAULT 0.00 AFTER `paid_amount`;');
  }

  // Update status enum of commissions to include 'partial' if not present
  try {
    await sequelize.query("ALTER TABLE `commissions` MODIFY COLUMN `status` ENUM('pending', 'approved', 'credited', 'partial', 'paid', 'rejected', 'reversed', 'disputed') DEFAULT 'pending';");
  } catch (err) {
    console.warn('Notice altering commissions status enum:', err.message);
  }

  // Backfill existing commissions paid_amount and remaining_amount
  try {
    await sequelize.query("UPDATE `commissions` SET `paid_amount` = `amount`, `remaining_amount` = 0.00 WHERE `status` = 'paid' AND `paid_amount` = 0.00;");
    await sequelize.query("UPDATE `commissions` SET `remaining_amount` = `amount` WHERE `status` IN ('pending', 'approved', 'credited') AND (`remaining_amount` IS NULL OR `remaining_amount` = 0.00);");
  } catch (err) {
    console.warn('Notice backfilling commissions amounts:', err.message);
  }

  // 3. Update transactions table: add type and notes
  const txCols = await queryInterface.describeTable('transactions');
  if (!txCols.type) {
    console.log('Adding type to transactions...');
    await sequelize.query("ALTER TABLE `transactions` ADD COLUMN `type` ENUM('sale', 'purchase') DEFAULT 'sale' AFTER `transaction_ref`;");
  }
  if (!txCols.notes) {
    console.log('Adding notes to transactions...');
    await sequelize.query("ALTER TABLE `transactions` ADD COLUMN `notes` TEXT NULL AFTER `deal_date`;");
  }

  // 4. Create commission_payments table for tracking every individual payment
  if (!tableNames.includes('commission_payments')) {
    console.log('Creating commission_payments table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`commission_payments\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`payment_ref\` VARCHAR(100) NOT NULL UNIQUE,
        \`commission_id\` INT(11) NOT NULL,
        \`associate_id\` INT(11) NOT NULL,
        \`transaction_id\` INT(11) NULL,
        \`amount\` DECIMAL(15,2) NOT NULL,
        \`payment_method\` VARCHAR(50) DEFAULT 'Bank Transfer',
        \`payment_reference\` VARCHAR(100) NULL,
        \`payment_date\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`recorded_by\` INT(11) NOT NULL,
        \`status\` ENUM('completed', 'reversed', 'failed') DEFAULT 'completed',
        \`remarks\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_comm_id\` (\`commission_id\`),
        INDEX \`idx_assoc_id\` (\`associate_id\`),
        INDEX \`idx_payment_ref\` (\`payment_ref\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  console.log('✅ Migration completed successfully!');
}

runMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
