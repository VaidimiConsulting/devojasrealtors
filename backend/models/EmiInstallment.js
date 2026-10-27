const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Individual monthly installment rows — auto-generated when an EmiPlan is created
const EmiInstallment = sequelize.define('EmiInstallment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  emi_plan_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  month_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  paid_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'overdue'),
    defaultValue: 'pending'
  },
  paid_on: {
    type: DataTypes.DATE,
    allowNull: true
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'emi_installments'
});

module.exports = EmiInstallment;
