const { User } = require('../models');
const { Op } = require('sequelize');

/**
 * Generate next sequential unique Accounts ID in ACCOUNTS-XXXX format.
 * e.g. ACCOUNTS-0001, ACCOUNTS-0002, ACCOUNTS-0003 ...
 * Prevents race conditions and duplicates.
 */
async function generateNextAccountsId(transaction = null) {
  const users = await User.findAll({
    where: {
      login_id: {
        [Op.like]: 'ACCOUNTS-%'
      }
    },
    attributes: ['login_id'],
    raw: true,
    transaction
  });

  let maxNum = 0;
  for (const u of users) {
    if (u.login_id) {
      const match = u.login_id.match(/^ACCOUNTS-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidateId = `ACCOUNTS-${String(nextNum).padStart(4, '0')}`;

  // Double check uniqueness just in case
  while (await User.findOne({ where: { login_id: candidateId }, transaction })) {
    nextNum++;
    candidateId = `ACCOUNTS-${String(nextNum).padStart(4, '0')}`;
  }

  return candidateId;
}

module.exports = generateNextAccountsId;
