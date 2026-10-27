const { sequelize, User } = require('../models');

async function standardizeUserIds() {
  const transaction = await sequelize.transaction();
  try {
    console.log('--- STANDARDIZING ALL USER IDs TO DEV-XXXX FORMAT ---');

    // Desired mapping for existing primary accounts
    const targetOrder = [
      { id: 1, name: 'Super Admin', targetId: 'DEV-0001' },
      { id: 83, name: 'Ram', targetId: 'DEV-0002' },
      { id: 90, name: 'Mohan', targetId: 'DEV-0003' },
      { id: 91, name: 'Sohan', targetId: 'DEV-0004' },
      { id: 92, name: 'Rohan', targetId: 'DEV-0005' },
      { id: 93, name: 'Fixed Associate 1', targetId: 'DEV-0006' },
      { id: 94, name: 'Fixed Associate 2', targetId: 'DEV-0007' },
      { id: 95, name: 'Fixed Associate 3', targetId: 'DEV-0008' },
      { id: 96, name: 'Fixed Associate 4', targetId: 'DEV-0009' },
      { id: 99, name: 'Fixed Associate 5', targetId: 'DEV-0010' },
      { id: 100, name: 'Fixed Associate 6', targetId: 'DEV-0011' },
    ];

    // First assign temporary placeholder IDs to avoid duplicate key conflicts
    for (const item of targetOrder) {
      await User.update(
        { login_id: `TEMP-${item.id}` },
        { where: { id: item.id }, transaction }
      );
    }

    // Now assign the standardized DEV-XXXX IDs
    for (const item of targetOrder) {
      const user = await User.findByPk(item.id, { transaction });
      if (user) {
        await user.update({ login_id: item.targetId }, { transaction });
        console.log(`Updated User ID ${item.id} (${item.name}): ${item.targetId}`);
      }
    }

    // Next, check any remaining users without DEV- format and sequence them
    const otherUsers = await User.findAll({
      where: sequelize.literal("login_id NOT LIKE 'DEV-%'"),
      order: [['id', 'ASC']],
      transaction
    });

    let currentCounter = 12;
    for (const u of otherUsers) {
      const newDevId = `DEV-${String(currentCounter).padStart(4, '0')}`;
      await u.update({ login_id: newDevId }, { transaction });
      console.log(`Updated Other User ID ${u.id} (${u.name}): ${newDevId}`);
      currentCounter++;
    }

    await transaction.commit();
    console.log('✅ User ID Standardization Complete!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error standardizing user IDs:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  standardizeUserIds().then(() => process.exit(0));
}

module.exports = standardizeUserIds;
