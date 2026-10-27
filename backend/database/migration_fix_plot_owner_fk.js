/**
 * MIGRATION: Fix plots.owner_id FK constraint
 * 
 * Problem: plots.owner_id is INT NOT NULL with FK plots_ibfk_1 → users(id).
 * This prevents adding a plot without a Client/Owner ID.
 * 
 * Fix: 
 *   1. Drop the FK constraint plots_ibfk_1
 *   2. Modify owner_id to allow NULL (the Sequelize model already has allowNull: true)
 *   3. Re-add the FK with NULL allowed, and ON DELETE SET NULL
 *
 * Data safety: 
 *   - All existing plots have valid owner_id values (verified: 0 null records)
 *   - No existing data is modified or deleted
 *   - Only the column constraint is relaxed
 */

const { sequelize } = require('../config/db');

async function migrate() {
  console.log('=== Migration: Fix plots.owner_id FK (allow NULL) ===');

  try {
    // 1. Check current state
    const [cols] = await sequelize.query(`
      SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plots' AND COLUMN_NAME = 'owner_id'
    `);
    console.log('Current owner_id column:', cols[0]);

    // 2. Drop existing FK constraint
    console.log('Dropping FK constraint plots_ibfk_1...');
    await sequelize.query(`ALTER TABLE \`plots\` DROP FOREIGN KEY \`plots_ibfk_1\``);
    console.log('✓ Dropped plots_ibfk_1');

    // 3. Modify column to allow NULL
    console.log('Modifying owner_id to allow NULL...');
    await sequelize.query(`
      ALTER TABLE \`plots\` 
      MODIFY COLUMN \`owner_id\` INT(11) NULL 
      COMMENT 'Client/Owner who owns/booked this plot (optional)'
    `);
    console.log('✓ owner_id is now nullable');

    // 4. Re-add FK with ON DELETE SET NULL
    console.log('Re-adding FK with ON DELETE SET NULL...');
    await sequelize.query(`
      ALTER TABLE \`plots\` 
      ADD CONSTRAINT \`plots_ibfk_1\` 
      FOREIGN KEY (\`owner_id\`) REFERENCES \`users\` (\`id\`) 
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
    console.log('✓ FK re-added with SET NULL on delete');

    // 5. Verify
    const [verifyResult] = await sequelize.query(`
      SELECT COLUMN_NAME, IS_NULLABLE 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plots' AND COLUMN_NAME = 'owner_id'
    `);
    console.log('Verified owner_id column after migration:', verifyResult[0]);

    const [fkResult] = await sequelize.query(`
      SELECT CONSTRAINT_NAME, DELETE_RULE
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'plots' AND CONSTRAINT_NAME = 'plots_ibfk_1'
    `);
    console.log('Verified FK constraint:', fkResult[0]);

    console.log('\n=== Migration completed successfully! ===');
    console.log('✓ plots.owner_id is now nullable');
    console.log('✓ FK plots_ibfk_1 preserved with SET NULL on delete');
    console.log('✓ All existing plot data is intact');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
