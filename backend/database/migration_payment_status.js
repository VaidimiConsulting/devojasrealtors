const { sequelize } = require('../config/db');

async function migrate() {
  console.log('--- Migrating transactions payment_status enum ---');
  try {
    await sequelize.query(`
      ALTER TABLE transactions 
      MODIFY COLUMN payment_status ENUM('unpaid', 'partially_paid', 'paid', 'refunded') DEFAULT 'unpaid';
    `);
    console.log('✅ Successfully updated transactions payment_status ENUM');

    // Also update Admin user commission_percent to 10.0000 if needed for cumulative differential pool
    await sequelize.query(`
      UPDATE users SET commission_percent = 10.0000 WHERE role = 'admin' AND id = 1;
    `);
    console.log('✅ Ensured Admin user ID 1 has configured 10% rate for MLM pool');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
