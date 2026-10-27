/**
 * Diagnostic script - reads real DB data to understand dashboard bugs
 * Run: node diagnose_dashboard.js
 */
const { Sequelize } = require('sequelize');
const seq = new Sequelize('realestate_admin', 'root', '', { host: 'localhost', dialect: 'mysql', logging: false });

async function run() {
  // Check actual transaction data
  const [txRows] = await seq.query('SELECT id, type, status, amount, notes FROM transactions ORDER BY id');
  console.log('=== TRANSACTIONS ===');
  txRows.forEach(r => console.log(JSON.stringify(r)));

  // Commission table columns
  const [colRows] = await seq.query('SHOW COLUMNS FROM commissions');
  const colNames = colRows.map(c => c.Field);
  console.log('\n=== COMMISSION COLUMNS ===\n' + colNames.join(', '));

  // Commission data
  const [comRows] = await seq.query('SELECT id, user_id, transaction_id, amount, paid_amount, remaining_amount, status FROM commissions ORDER BY id');
  console.log('\n=== COMMISSIONS ===');
  comRows.forEach(r => console.log(JSON.stringify(r)));

  // Transaction totals
  const [[totals]] = await seq.query(
    "SELECT " +
    "  SUM(CASE WHEN type='sale' AND status='completed' THEN amount ELSE 0 END) AS revenue_sales, " +
    "  SUM(CASE WHEN status='completed' THEN amount ELSE 0 END) AS revenue_all, " +
    "  SUM(amount) AS total_txn_amount " +
    "FROM transactions"
  );
  console.log('\n=== TRANSACTION TOTALS ===\n' + JSON.stringify(totals));

  // Commission totals
  const [[ctotals]] = await seq.query(
    "SELECT " +
    "  SUM(amount) AS total_generated, " +
    "  SUM(paid_amount) AS total_paid_amount, " +
    "  SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) AS paid_status_sum, " +
    "  SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) AS pending_status_sum " +
    "FROM commissions"
  );
  console.log('\n=== COMMISSION TOTALS ===\n' + JSON.stringify(ctotals));

  // Admin user id
  const [[adminUser]] = await seq.query("SELECT id, login_id, role FROM users WHERE role='admin' LIMIT 1");
  console.log('\n=== ADMIN USER ===\n' + JSON.stringify(adminUser));

  // Admin's own commissions
  if (adminUser) {
    const [[adminComm]] = await seq.query(
      "SELECT SUM(amount) AS earned, SUM(paid_amount) AS paid FROM commissions WHERE user_id = " + adminUser.id
    );
    console.log('\n=== ADMIN OWN COMMISSIONS ===\n' + JSON.stringify(adminComm));
  }

  // Users table
  const [users] = await seq.query("SELECT id, login_id, name, role FROM users ORDER BY id LIMIT 20");
  console.log('\n=== USERS ===');
  users.forEach(u => console.log(JSON.stringify(u)));

  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
