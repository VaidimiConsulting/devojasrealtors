const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/db');

async function createBackup() {
  console.log('Starting full database backup...');
  await sequelize.authenticate();
  const [tables] = await sequelize.query('SHOW TABLES');
  const dbName = sequelize.config.database;
  let dump = `-- DATABASE BACKUP: ${dbName}\n-- CREATED AT: ${new Date().toISOString()}\n\nSET FOREIGN_KEY_CHECKS=0;\n\n`;

  for (const row of tables) {
    const tableName = Object.values(row)[0];
    const [[createTable]] = await sequelize.query(`SHOW CREATE TABLE \`${tableName}\``);
    dump += `DROP TABLE IF EXISTS \`${tableName}\`;\n${createTable['Create Table']};\n\n`;

    const [records] = await sequelize.query(`SELECT * FROM \`${tableName}\``);
    if (records.length > 0) {
      for (const r of records) {
        const keys = Object.keys(r).map(k => `\`${k}\``).join(', ');
        const values = Object.values(r).map(v => {
          if (v === null) return 'NULL';
          if (typeof v === 'boolean') return v ? '1' : '0';
          if (typeof v === 'number') return v;
          if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
          return sequelize.escape(String(v));
        }).join(', ');
        dump += `INSERT INTO \`${tableName}\` (${keys}) VALUES (${values});\n`;
      }
      dump += '\n';
    }
  }

  dump += 'SET FOREIGN_KEY_CHECKS=1;\n';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(__dirname, `database_backup_${timestamp}.sql`);
  fs.writeFileSync(backupFile, dump, 'utf8');
  console.log(`✅ Database backup successfully created at: ${backupFile} (${(dump.length / 1024).toFixed(2)} KB)`);
  return backupFile;
}

createBackup()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Backup failed:', err);
    process.exit(1);
  });
