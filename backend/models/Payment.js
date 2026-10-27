const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Cash-payment tracking against a Transaction (no Razorpay/online gateway).
// Each row is one cash installment recorded by Associate/Accounts.
const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User id of associate/accounts who recorded this cash payment'
  },
  note: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payment_mode: {
    type: DataTypes.STRING,
    defaultValue: 'Cash'
  },
  reference_no: {
    type: DataTypes.STRING,
    allowNull: true
  },
  receipt_no: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected', 'refunded'),
    defaultValue: 'verified'
  },
  paid_on: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payments'
});

module.exports = Payment;
