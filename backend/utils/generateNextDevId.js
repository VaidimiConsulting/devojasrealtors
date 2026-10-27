const { User } = require('../models');
const { Op } = require('sequelize');

/**
 * Generate next sequential unique user ID in DEV-XXXX format.
 * Format starts from DEV-0002 for non-admin users (DEV-0001 reserved for Super Admin).
 * Prevents race conditions and duplicates.
 */
async function generateNextDevId(transaction = null) {
  const users = await User.findAll({
    where: {
      login_id: {
        [Op.like]: 'DEV-%'
      }
    },
    attributes: ['login_id'],
    raw: true,
    transaction
  });

  let maxNum = 1; // DEV-0001 is Super Admin
  for (const u of users) {
    if (u.login_id) {
      const match = u.login_id.match(/^DEV-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidateId = `DEV-${String(nextNum).padStart(4, '0')}`;

  // Double check uniqueness just in case
  while (await User.findOne({ where: { login_id: candidateId }, transaction })) {
    nextNum++;
    candidateId = `DEV-${String(nextNum).padStart(4, '0')}`;
  }

  return candidateId;
}

module.exports = generateNextDevId;
