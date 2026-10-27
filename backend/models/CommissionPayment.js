const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CommissionPayment = sequelize.define('CommissionPayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  payment_ref: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  commission_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  associate_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'Bank Transfer'
  },
  payment_reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  payment_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('completed', 'reversed', 'failed'),
    defaultValue: 'completed'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'commission_payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CommissionPayment;
