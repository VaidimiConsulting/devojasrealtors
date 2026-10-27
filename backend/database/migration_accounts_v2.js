require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/db');

async function runAccountsV2Migration() {
  try {
    console.log('🔄 Running Accounts V2 migration (Audit logs, Commission status, Payment enhancements)...');

    // 1. Audit Logs Table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NULL,
        entity_id INT NULL,
        old_values TEXT NULL,
        new_values TEXT NULL,
        notes TEXT NULL,
        ip_address VARCHAR(50) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_user (user_id),
        INDEX idx_audit_action (action),
        INDEX idx_audit_entity (entity_type, entity_id),
        INDEX idx_audit_date (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✅ Ensured audit_logs table exists.');

    // 2. Add columns to `commissions`
    const [commCols] = await sequelize.query('SHOW COLUMNS FROM commissions');
    const existingCommCols = new Set(commCols.map(c => c.Field));

    const commAdditions = [
      { name: 'approved_by', sql: 'ADD COLUMN approved_by INT NULL' },
      { name: 'approved_at', sql: 'ADD COLUMN approved_at DATETIME NULL' },
      { name: 'paid_at', sql: 'ADD COLUMN paid_at DATETIME NULL' },
      { name: 'reversal_reason', sql: 'ADD COLUMN reversal_reason VARCHAR(255) NULL' },
      { name: 'slip_number', sql: 'ADD COLUMN slip_number VARCHAR(100) NULL' }
    ];

    for (const col of commAdditions) {
      if (!existingCommCols.has(col.name)) {
        await sequelize.query(`ALTER TABLE commissions ${col.sql}`);
        console.log(`  Added column commissions.${col.name}`);
      }
    }

    // Modify `status` on commissions to support all statuses
    try {
      await sequelize.query(`
        ALTER TABLE commissions 
        MODIFY COLUMN status ENUM('pending', 'approved', 'credited', 'paid', 'rejected', 'reversed', 'disputed') 
        NOT NULL DEFAULT 'pending'
      `);
      console.log('  ✅ Updated commissions.status enum to include all workflow statuses.');
    } catch (e) {
      console.log('  ℹ️ commissions.status alter note:', e.message);
    }

    // 3. Add columns to `payments`
    const [payCols] = await sequelize.query('SHOW COLUMNS FROM payments');
    const existingPayCols = new Set(payCols.map(c => c.Field));

    const payAdditions = [
      { name: 'payment_mode', sql: "ADD COLUMN payment_mode VARCHAR(50) DEFAULT 'Cash'" },
      { name: 'reference_no', sql: 'ADD COLUMN reference_no VARCHAR(100) NULL' },
      { name: 'receipt_no', sql: 'ADD COLUMN receipt_no VARCHAR(100) NULL' },
      { name: 'status', sql: "ADD COLUMN status ENUM('pending', 'verified', 'rejected', 'refunded') DEFAULT 'verified'" }
    ];

    for (const col of payAdditions) {
      if (!existingPayCols.has(col.name)) {
        await sequelize.query(`ALTER TABLE payments ${col.sql}`);
        console.log(`  Added column payments.${col.name}`);
      }
    }

    console.log('✅ Accounts V2 migration finished successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  }
}

if (require.main === module) {
  runAccountsV2Migration().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runAccountsV2Migration;
