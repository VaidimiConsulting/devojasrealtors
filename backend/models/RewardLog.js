const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Tracks one-time milestone rewards given when an associate personally
// crosses into a new slab by selling. Prevents giving the same reward twice.
const RewardLog = sequelize.define('RewardLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  slab_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  month: {
    type: DataTypes.STRING(7),
    allowNull: true,
    comment: 'Calendar month in YYYY-MM'
  },
  reward_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'reward_logs'
});

module.exports = RewardLog;
