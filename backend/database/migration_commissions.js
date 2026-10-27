require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/db');

async function runMigration() {
  try {
    console.log('🔄 Running backward-compatible migration for Commission System & Registration...');

    // 1. Check & add columns to `commissions`
    const [commCols] = await sequelize.query('SHOW COLUMNS FROM commissions');
    const existingCommCols = new Set(commCols.map(c => c.Field));

    const commAdditions = [
      { name: 'downline_user_id', sql: 'ADD COLUMN downline_user_id INT NULL' },
      { name: 'level', sql: 'ADD COLUMN level INT DEFAULT 0' },
      { name: 'base_amount', sql: 'ADD COLUMN base_amount DECIMAL(15, 2) DEFAULT 0' },
      { name: 'upline_percent', sql: 'ADD COLUMN upline_percent FLOAT DEFAULT 0' },
      { name: 'downline_percent', sql: 'ADD COLUMN downline_percent FLOAT DEFAULT 0' },
      { name: 'differential_percent', sql: 'ADD COLUMN differential_percent FLOAT DEFAULT 0' },
      { name: 'is_flagged', sql: 'ADD COLUMN is_flagged TINYINT(1) DEFAULT 0' },
      { name: 'flag_reason', sql: 'ADD COLUMN flag_reason VARCHAR(255) NULL' }
    ];

    for (const col of commAdditions) {
      if (!existingCommCols.has(col.name)) {
        await sequelize.query(`ALTER TABLE commissions ${col.sql}`);
        console.log(`  Added column commissions.${col.name}`);
      }
    }

    // 2. Check & add columns to `users`
    const [userCols] = await sequelize.query('SHOW COLUMNS FROM users');
    const existingUserCols = new Set(userCols.map(c => c.Field));

    const userAdditions = [
      { name: 'is_temporary_password', sql: 'ADD COLUMN is_temporary_password TINYINT(1) DEFAULT 0' },
      { name: 'temporary_password_expires_at', sql: 'ADD COLUMN temporary_password_expires_at DATETIME NULL' },
      { name: 'last_sms_sent_at', sql: 'ADD COLUMN last_sms_sent_at DATETIME NULL' },
      { name: 'last_sms_status', sql: 'ADD COLUMN last_sms_status VARCHAR(100) NULL' }
    ];

    for (const col of userAdditions) {
      if (!existingUserCols.has(col.name)) {
        await sequelize.query(`ALTER TABLE users ${col.sql}`);
        console.log(`  Added column users.${col.name}`);
      }
    }

    // 3. Create `commission_histories` table if not exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS commission_histories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        previous_percent FLOAT NOT NULL,
        new_percent FLOAT NOT NULL,
        changed_by INT NULL,
        effective_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reason VARCHAR(255) NULL,
        notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_comm_hist_user (user_id),
        INDEX idx_comm_hist_date (effective_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  Ensured commission_histories table exists.');

    // 4. Create `sms_logs` table for audit & tracking
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        phone VARCHAR(20) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'credentials',
        status ENUM('sent', 'failed', 'mock_delivered') NOT NULL DEFAULT 'sent',
        provider VARCHAR(50) NOT NULL DEFAULT 'mock',
        message_snippet VARCHAR(255) NULL,
        error_message TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sms_phone (phone),
        INDEX idx_sms_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  Ensured sms_logs table exists.');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runMigration;
