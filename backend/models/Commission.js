const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Commission = sequelize.define('Commission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  seller_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Selling associate ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Associate who earns this commission'
  },
  downline_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Downline associate from whose deal this override/differential was generated'
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '0 = direct closing associate, 1 = direct sponsor, 2+ = multi-level upline'
  },
  base_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Commissionable transaction amount base'
  },
  base_price: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Approved base price of the plot'
  },
  sale_price: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Actual sale price of the plot'
  },
  eligible_difference: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Sale price minus approved base price'
  },
  upline_percent: {
    type: DataTypes.DECIMAL(6, 4),
    defaultValue: 0,
    comment: 'Commission percent of earner at transaction time'
  },
  downline_percent: {
    type: DataTypes.DECIMAL(6, 4),
    defaultValue: 0,
    comment: 'Commission percent of downline associate at transaction time'
  },
  differential_percent: {
    type: DataTypes.DECIMAL(6, 4),
    defaultValue: 0,
    comment: 'Actual effective differential percent applied'
  },
  seller_rate: {
    type: DataTypes.DECIMAL(6, 4),
    defaultValue: 0,
    comment: 'Commission percentage of the seller at transaction time'
  },
  role_level: {
    type: DataTypes.ENUM('seller_associate', 'seller_referrer', 'buyer_associate', 'buyer_referrer'),
    allowNull: false
  },
  percent: {
    type: DataTypes.DECIMAL(6, 4),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  paid_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Running total paid against this commission'
  },
  remaining_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Remaining payable commission balance'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'credited', 'partial', 'paid', 'rejected', 'reversed', 'disputed'),
    defaultValue: 'pending'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reversal_reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  slip_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_flagged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'True if upline config anomaly was flagged for Admin review'
  },
  flag_reason: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'commissions'
});

module.exports = Commission;
