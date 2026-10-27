const { sequelize } = require('../config/db');

async function migrate() {
  console.log('--- Starting safe schema migration for Projects, Plots & BookingForms ---');
  
  // 1. Create `projects` table if it does not exist
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      city VARCHAR(100) NULL,
      developer_name VARCHAR(255) DEFAULT 'Devojas Realtors Pvt Ltd',
      description TEXT NULL,
      facilities TEXT NULL,
      status ENUM('active', 'upcoming', 'completed', 'hold') DEFAULT 'active',
      total_plots INT DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('Checked/created table `projects`');

  // Helper to safely add column if not exists
  const addColumnIfNotExists = async (table, column, definition) => {
    const [cols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'
    `);
    if (cols.length === 0) {
      await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`Added column \`${column}\` to table \`${table}\``);
    } else {
      console.log(`Column \`${column}\` already exists on table \`${table}\``);
    }
  };

  // 2. Add columns to `plots`
  await addColumnIfNotExists('plots', 'plot_code', 'VARCHAR(50) NULL');
  await addColumnIfNotExists('plots', 'project_id', 'INT NULL');
  await addColumnIfNotExists('plots', 'sector_number', 'VARCHAR(50) NULL');
  await addColumnIfNotExists('plots', 'rate_per_sqft', 'DECIMAL(12, 2) DEFAULT 0');
  await addColumnIfNotExists('plots', 'basic_price', 'DECIMAL(15, 2) DEFAULT 0');
  await addColumnIfNotExists('plots', 'corner_charge', 'DECIMAL(12, 2) DEFAULT 0');
  await addColumnIfNotExists('plots', 'park_facing_charge', 'DECIMAL(12, 2) DEFAULT 0');
  await addColumnIfNotExists('plots', 'is_park_facing', 'TINYINT(1) DEFAULT 0');
  await addColumnIfNotExists('plots', 'additional_charges', 'DECIMAL(12, 2) DEFAULT 0');
  await addColumnIfNotExists('plots', 'discount', 'DECIMAL(12, 2) DEFAULT 0');
  await addColumnIfNotExists('plots', 'allotment_status', "ENUM('none', 'provisional', 'allotted', 'transferred', 'cancelled') DEFAULT 'none'");
  await addColumnIfNotExists('plots', 'booking_date', 'DATE NULL');

  // 3. Add columns to `booking_forms`
  await addColumnIfNotExists('booking_forms', 'booking_ref', 'VARCHAR(50) NULL');
  await addColumnIfNotExists('booking_forms', 'project_id', 'INT NULL');
  await addColumnIfNotExists('booking_forms', 'plot_id', 'INT NULL');
  await addColumnIfNotExists('booking_forms', 'plot_code', 'VARCHAR(50) NULL');
  await addColumnIfNotExists('booking_forms', 'size_unit', "VARCHAR(20) DEFAULT 'Sq.ft.'");
  await addColumnIfNotExists('booking_forms', 'is_corner', 'TINYINT(1) DEFAULT 0');
  await addColumnIfNotExists('booking_forms', 'corner_charge_amount', 'DECIMAL(12, 2) DEFAULT 0');
  await addColumnIfNotExists('booking_forms', 'is_park_facing', 'TINYINT(1) DEFAULT 0');
  await addColumnIfNotExists('booking_forms', 'park_facing_charge_amount', 'DECIMAL(12, 2) DEFAULT 0');
  await addColumnIfNotExists('booking_forms', 'other_approved_charges', 'DECIMAL(12, 2) DEFAULT 0');
  await addColumnIfNotExists('booking_forms', 'discount_amount', 'DECIMAL(12, 2) DEFAULT 0');
  await addColumnIfNotExists('booking_forms', 'client_id', 'INT NULL');
  await addColumnIfNotExists('booking_forms', 'client_code', 'VARCHAR(50) NULL');
  await addColumnIfNotExists('booking_forms', 'father_husband_name', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('booking_forms', 'applicant_email', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('booking_forms', 'applicant_address', 'TEXT NULL');
  await addColumnIfNotExists('booking_forms', 'permanent_address', 'TEXT NULL');
  await addColumnIfNotExists('booking_forms', 'govt_id_type', 'VARCHAR(50) NULL');
  await addColumnIfNotExists('booking_forms', 'govt_id_number', 'VARCHAR(100) NULL');
  await addColumnIfNotExists('booking_forms', 'nominee_name', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('booking_forms', 'nominee_relation', 'VARCHAR(100) NULL');
  await addColumnIfNotExists('booking_forms', 'selling_associate_name', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('booking_forms', 'selling_associate_code', 'VARCHAR(50) NULL');
  await addColumnIfNotExists('booking_forms', 'selling_associate_ref_id', 'VARCHAR(50) NULL');
  await addColumnIfNotExists('booking_forms', 'direct_sponsor_id', 'INT NULL');
  await addColumnIfNotExists('booking_forms', 'direct_sponsor_name', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('booking_forms', 'direct_sponsor_code', 'VARCHAR(50) NULL');
  await addColumnIfNotExists('booking_forms', 'direct_sponsor_ref_id', 'VARCHAR(50) NULL');
  await addColumnIfNotExists('booking_forms', 'referral_chain_info', 'TEXT NULL');
  await addColumnIfNotExists('booking_forms', 'transaction_ref', 'VARCHAR(100) NULL');
  await addColumnIfNotExists('booking_forms', 'booking_amount', 'DECIMAL(15, 2) DEFAULT 0');
  await addColumnIfNotExists('booking_forms', 'remaining_balance', 'DECIMAL(15, 2) DEFAULT 0');
  await addColumnIfNotExists('booking_forms', 'emi_amount', 'DECIMAL(12, 2) NULL');
  await addColumnIfNotExists('booking_forms', 'installment_frequency', "VARCHAR(50) DEFAULT 'monthly'");
  await addColumnIfNotExists('booking_forms', 'first_due_date', 'DATE NULL');
  await addColumnIfNotExists('booking_forms', 'declaration_accepted', 'TINYINT(1) DEFAULT 1');
  await addColumnIfNotExists('booking_forms', 'allotment_status', "ENUM('none', 'provisional', 'confirmed') DEFAULT 'none'");
  await addColumnIfNotExists('booking_forms', 'cancellation_reason', 'TEXT NULL');
  await addColumnIfNotExists('booking_forms', 'refund_amount', 'DECIMAL(15, 2) DEFAULT 0');
  await addColumnIfNotExists('booking_forms', 'authorized_officer_name', 'VARCHAR(255) NULL');

  console.log('--- Migration completed successfully! ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
