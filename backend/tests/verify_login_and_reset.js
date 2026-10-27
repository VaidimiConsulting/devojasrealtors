const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');

async function test(dbName) {
  const s = new Sequelize(dbName, 'root', '', { host: 'localhost', dialect: 'mysql', logging: false });
  const [users] = await s.query("SELECT id, name, login_id, role, password FROM users");
  console.log(`Checking logins on [${dbName}] for ${users.length} users:`);
  for (const u of users) {
    // Admin password is known as admin123 or password
    const testPw = u.role === 'admin' ? 'admin123' : 'password';
    let match = await bcrypt.compare(testPw, u.password);
    if (!match && u.role === 'admin') {
      match = await bcrypt.compare('password', u.password);
    }
    console.log(` - User ${u.login_id} (${u.name}, ${u.role}): password hash valid = ${Boolean(u.password && u.password.startsWith('$2'))}`);
  }
}

test(process.argv[2] || 'devojas_test')
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
