const { sequelize } = require('../models');

async function run() {
  try {
    await sequelize.authenticate();
    const [cols] = await sequelize.query("SHOW COLUMNS FROM `commissions` LIKE 'seller_id'");
    if (!cols.length) {
      await sequelize.query('ALTER TABLE `commissions` ADD COLUMN `seller_id` INT NULL AFTER `transaction_id`');
      console.log('✅ Added seller_id to commissions');
    } else {
      console.log('ℹ️ seller_id already exists');
    }

    const [colsRate] = await sequelize.query("SHOW COLUMNS FROM `commissions` LIKE 'seller_rate'");
    if (!colsRate.length) {
      await sequelize.query('ALTER TABLE `commissions` ADD COLUMN `seller_rate` DECIMAL(6,4) NULL AFTER `differential_percent`');
      console.log('✅ Added seller_rate to commissions');
    } else {
      console.log('ℹ️ seller_rate already exists');
    }

    // Also check reward_logs table for month column
    const [rewardMonth] = await sequelize.query("SHOW COLUMNS FROM `reward_logs` LIKE 'month'");
    if (!rewardMonth.length) {
      await sequelize.query("ALTER TABLE `reward_logs` ADD COLUMN `month` VARCHAR(7) NULL COMMENT 'YYYY-MM' AFTER `slab_id`");
      console.log('✅ Added month column to reward_logs');
    }

    const [rewardStatus] = await sequelize.query("SHOW COLUMNS FROM `reward_logs` LIKE 'status'");
    if (!rewardStatus.length) {
      await sequelize.query("ALTER TABLE `reward_logs` ADD COLUMN `status` ENUM('pending', 'paid') DEFAULT 'pending' AFTER `reward_amount`");
      console.log('✅ Added status column to reward_logs');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
