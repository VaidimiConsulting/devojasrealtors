// Script to sync plain_password to hashed password for associates
// Forces hashed `password` column to match whatever is in `plain_password`
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { User } = require('../models');

(async () => {
  try {
    const associates = await User.findAll({ where: { role: 'associate' } });
    console.log(`Found ${associates.length} associates`);
    let updated = 0;
    for (const assoc of associates) {
      const plain = (assoc.plain_password || '').trim();
      if (!plain) {
        console.log(`⚠️  ${assoc.login_id} (${assoc.name}) – no plain_password stored, skipping`);
        continue;
      }
      // Always re-hash and update so the hash definitely matches the plain password
      const hashed = await bcrypt.hash(plain, 10);
      await assoc.update({ password: hashed });
      updated++;
      console.log(`🔐 Updated: ${assoc.login_id} (${assoc.name}) → plain_password="${plain}"`);
    }
    console.log(`\n✅ Sync complete – ${updated} record(s) updated.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during sync:', err.message);
    process.exit(1);
  }
})();
