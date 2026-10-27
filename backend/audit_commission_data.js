/**
 * READ-ONLY audit - changes nothing.  Usage:  node audit_commission_data.js
 *  1. Ledger rows whose saved amount != sale value x differential %  (e.g. rows created by the old
 *     "sale price - base price" rule). These are LISTED for an auditable, manual correction - never auto-rewritten,
 *     and rows already paid/partially paid are flagged so they are never silently altered.
 *  2. Associates whose users.commission_percent differs from users.referral_commission_percent
 *     (two columns historically written by different screens; commission_percent is the authoritative one).
 */
require('dotenv').config();
const { Commission, User, sequelize } = require('./models');
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
(async () => {
  const rows = await Commission.findAll({ order: [['id', 'ASC']] });
  const bad = rows.filter(c => {
    const sale = parseFloat(c.sale_price);
    if (!(sale > 0)) return false;                       // no sale value stored: cannot verify
    const pct = Number(c.level) === 0 ? parseFloat(c.percent) : parseFloat(c.differential_percent ?? c.percent);
    return Math.abs(r2(sale * pct / 100) - parseFloat(c.amount)) > 0.01;
  });
  console.log(`\n[1] Ledger rows checked: ${rows.length}; amount differs from full-sale-value formula: ${bad.length}`);
  bad.forEach(c => {
    const sale = parseFloat(c.sale_price); const pct = Number(c.level) === 0 ? parseFloat(c.percent) : parseFloat(c.differential_percent ?? c.percent);
    console.log(`  commission #${c.id} txn ${c.transaction_id} user ${c.user_id} status=${c.status} paid=${c.paid_amount}  saved=${c.amount}  expected=${r2(sale * pct / 100)}  ${parseFloat(c.paid_amount) > 0 ? '** PAID/PARTIAL - needs manual adjustment entry, do not overwrite **' : '(unpaid - can be recalculated after approval)'}`);
  });
  const users = await User.findAll({ where: { role: 'associate' }, attributes: ['id', 'name', 'login_id', 'commission_percent', 'referral_commission_percent'], raw: true });
  const diff = users.filter(u => u.referral_commission_percent !== null && Number(u.referral_commission_percent) !== Number(u.commission_percent));
  console.log(`\n[2] Associates: ${users.length}; commission_percent != referral_commission_percent: ${diff.length}`);
  diff.forEach(u => console.log(`  ${u.login_id} ${u.name}: commission_percent=${u.commission_percent} (used for payouts/commission)  referral_commission_percent=${u.referral_commission_percent}`));
  await sequelize.close();
})().catch(e => { console.error(e); process.exit(1); });
