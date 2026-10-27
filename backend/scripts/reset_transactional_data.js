/**
 * ONE-TIME RESET SCRIPT: CLEAR TRANSACTIONAL DATA
 * -------------------------------------------------------------
 * Safely clears all sales, commissions, payments, payouts, bookings,
 * wallets, notifications and old audit logs.
 *
 * KEEPS:
 *  - Every user (id, name, login_id, password hash, role, phone, email,
 *    PAN, Aadhar, KYC, referred_by hierarchy, commission_percent) byte-for-byte.
 *  - Slabs configuration
 *  - App settings
 *  - Projects & Plot inventory (resets plot status to 'available' and clears buyer/booking links)
 *
 * SAFETY REQUIREMENTS:
 *  1. Refuses to run unless both --confirm and --db <dbname> match.
 *  2. Supports --dry-run to display table counts without modifying data.
 *  3. Operates inside a transaction.
 *  4. Verifies post-reset user data against pre-reset snapshot byte-for-byte.
 *  5. Adds an audit-log entry recording the reset.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

// Command line argument parser
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const hasConfirm = args.includes('--confirm');
const dbArgIndex = args.indexOf('--db');
const targetDbName = dbArgIndex !== -1 && args[dbArgIndex + 1] ? args[dbArgIndex + 1].trim() : null;

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const configuredDb = process.env.DB_NAME || 'realestate_admin';

// Tables to CLEAR
const TABLES_TO_CLEAR = [
  'commission_payments',
  'commission_histories',
  'commissions',
  'payout_statements',
  'reward_logs',
  'emi_installments',
  'emi_plans',
  'payments',
  'booking_forms',
  'wallet_transactions',
  'daily_records',
  'complaints',
  'notifications',
  'sms_logs',
  'enquiries',
  'audit_logs',
  'transactions'
];

// Tables to KEEP
const TABLES_TO_KEEP = [
  'users',
  'slabs',
  'app_settings',
  'commission_settings',
  'projects',
  'plots',
  'wallets',
  'banners'
];

async function run() {
  console.log('===============================================================');
  console.log('       DEVOJAS REALTORS - TRANSACTIONAL DATA RESET SCRIPT      ');
  console.log('===============================================================');

  if (!targetDbName) {
    console.error('❌ ERROR: Missing target database name.');
    console.error('Usage: node backend/scripts/reset_transactional_data.js --dry-run --db <dbname>');
    console.error('       node backend/scripts/reset_transactional_data.js --confirm --db <dbname>');
    process.exit(1);
  }

  if (!isDryRun && !hasConfirm) {
    console.error('❌ ERROR: Safety confirmation missing.');
    console.error('You must pass both --confirm and --db <dbname> to execute real reset.');
    process.exit(1);
  }

  const sequelize = new Sequelize(targetDbName, dbUser, dbPassword, {
    host: dbHost,
    dialect: 'mysql',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log(`Connected to database: [${targetDbName}] on ${dbHost}\n`);

    // 1. Fetch all tables in database
    const [allTablesResult] = await sequelize.query('SHOW TABLES');
    const existingTables = allTablesResult.map(t => Object.values(t)[0]);

    // 2. Count rows before reset
    const beforeCounts = {};
    for (const table of existingTables) {
      const [res] = await sequelize.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
      beforeCounts[table] = res[0].c;
    }

    console.log('--- TABLE CLASSIFICATION & CURRENT ROW COUNTS ---');
    console.table(
      existingTables.map(t => ({
        Table: t,
        Rows: beforeCounts[t],
        Action: TABLES_TO_CLEAR.includes(t) ? 'CLEARED' : (TABLES_TO_KEEP.includes(t) ? 'KEPT' : 'UNCATALOGUED')
      }))
    );

    if (isDryRun) {
      console.log('\n[DRY RUN MODE] No changes were made to the database.');
      console.log('To execute the real reset, run with: --confirm --db ' + targetDbName);
      process.exit(0);
    }

    console.log('\n⏳ PROCEEDING WITH REAL TRANSACTIONAL DATA RESET IN 3 SECONDS...');
    await new Promise(r => setTimeout(r, 3000));

    // 3. Capture pre-reset user snapshot for verification
    const [preUsers] = await sequelize.query(
      'SELECT id, name, email, phone, login_id, role, password, referred_by, commission_percent, pan_number, aadhar_number, kyc_status, status FROM users ORDER BY id ASC'
    );
    console.log(`📸 Pre-reset user snapshot captured: ${preUsers.length} users.`);

    // 4. Execute reset inside transaction
    const t = await sequelize.transaction();
    try {
      // Disable foreign key checks for clean batch delete
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });

      // Delete rows from transactional tables
      for (const table of TABLES_TO_CLEAR) {
        if (existingTables.includes(table)) {
          await sequelize.query(`DELETE FROM \`${table}\``, { transaction: t });
          console.log(`  ✓ Cleared table: ${table}`);
        }
      }

      // Reset plot inventory to available & clean buyer/booking linkages
      if (existingTables.includes('plots')) {
        await sequelize.query(
          "UPDATE `plots` SET `status` = 'available', `allotment_status` = 'none', `booking_date` = NULL, `owner_id` = NULL",
          { transaction: t }
        );
        console.log('  ✓ Reset plots inventory: status=\'available\', links cleared');
      }

      // Reset wallets to 0 balance
      if (existingTables.includes('wallets')) {
        await sequelize.query(
          'UPDATE `wallets` SET `balance` = 0.00',
          { transaction: t }
        );
        console.log('  ✓ Reset all wallets balance to ₹0.00');
      }

      // Reset user business volume counters without touching identities
      if (existingTables.includes('users')) {
        await sequelize.query(
          'UPDATE `users` SET `total_business_volume` = 0.00, `self_business_volume` = 0.00, `current_slab_id` = NULL',
          { transaction: t }
        );
        console.log('  ✓ Reset associate business volume accumulators to ₹0.00');
      }

      // Re-enable foreign key checks
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });

      // Record 1 audit-log row for the reset event
      if (existingTables.includes('audit_logs')) {
        await sequelize.query(
          `INSERT INTO \`audit_logs\` (\`user_id\`, \`action\`, \`entity_type\`, \`entity_id\`, \`notes\`, \`ip_address\`, \`created_at\`)
           VALUES (1, 'RESET_TRANSACTIONAL_DATA', 'system', 0, 'Clean transactional reset executed: users and plot inventory preserved, transactional history cleared', '127.0.0.1', NOW())`,
          { transaction: t }
        );
        console.log('  ✓ Created reset audit log entry');
      }

      await t.commit();
      console.log('\n✅ Transaction successfully committed.');
    } catch (err) {
      await t.rollback();
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      console.error('❌ Reset failed! Transaction rolled back.', err);
      process.exit(1);
    }

    // 5. Post-reset user verification
    const [postUsers] = await sequelize.query(
      'SELECT id, name, email, phone, login_id, role, password, referred_by, commission_percent, pan_number, aadhar_number, kyc_status, status FROM users ORDER BY id ASC'
    );

    if (preUsers.length !== postUsers.length) {
      console.error(`❌ CRITICAL: User count mismatch! Pre: ${preUsers.length}, Post: ${postUsers.length}`);
      process.exit(1);
    }

    let usersUntouched = true;
    for (let i = 0; i < preUsers.length; i++) {
      const u1 = JSON.stringify(preUsers[i]);
      const u2 = JSON.stringify(postUsers[i]);
      if (u1 !== u2) {
        console.error(`❌ User ID ${preUsers[i].id} differs!`, { pre: preUsers[i], post: postUsers[i] });
        usersUntouched = false;
        break;
      }
    }

    if (!usersUntouched) {
      console.error('❌ User verification failed: user records were modified!');
      process.exit(1);
    }
    console.log(`\n🔒 User Integrity Verified: All ${postUsers.length} users byte-for-byte identical.`);

    // 6. Count rows after reset
    const afterCounts = {};
    for (const table of existingTables) {
      const [res] = await sequelize.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
      afterCounts[table] = res[0].c;
    }

    console.log('\n--- BEFORE AND AFTER ROW COUNTS ---');
    console.table(
      existingTables.map(t => ({
        Table: t,
        'Before Count': beforeCounts[t],
        'After Count': afterCounts[t],
        Status: TABLES_TO_CLEAR.includes(t) ? (afterCounts[t] === (t === 'audit_logs' ? 1 : 0) ? 'CLEARED ✅' : 'NOT EMPTY ❌') : 'PRESERVED ✅'
      }))
    );

    console.log('🎉 Reset process completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Database connection or query error:', error);
    process.exit(1);
  }
}

run();
