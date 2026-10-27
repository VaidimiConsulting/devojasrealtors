const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CommissionHistory = sequelize.define('CommissionHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  previous_percent: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  new_percent: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  changed_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  effective_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'commission_histories',
  timestamps: true
});

module.exports = CommissionHistory;
