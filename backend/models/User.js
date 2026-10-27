const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: { isEmail: true }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  login_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pan_number: {
    type: DataTypes.STRING,
    allowNull: true, // mandatory only for associate role — enforced in controller
    unique: true
  },
  aadhar_number: {
    type: DataTypes.STRING,
    allowNull: true, // mandatory only for associate role — enforced in controller
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  plain_password: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stores password for admin visibility during approval'
  },
  role: {
    type: DataTypes.ENUM('admin', 'client', 'associate', 'accounts'),
    defaultValue: 'client'
  },
  referred_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the associate who referred this user'
  },
  referral_commission_percent: {
    type: DataTypes.DECIMAL(6, 4),
    allowNull: true,
    comment: 'Fixed % this user gives to their own referrer (set by referrer at creation time)'
  },
  total_business_volume: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Running total of deals this associate has personally closed (drives slab)'
  },
  current_slab_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Which slab this associate currently falls into based on total_business_volume'
  },
  kyc_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'not_submitted'),
    defaultValue: 'not_submitted'
  },
  kyc_document_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profile_image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'blocked', 'pending_approval'),
    defaultValue: 'active'
  },
  is_fixed_associate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'True for the 6 pre-defined associate login accounts (devojas-0001 to devojas-0006)'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of admin who approved the associate'
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  commission_percent: {
    type: DataTypes.DECIMAL(6, 4),
    defaultValue: 5.0,
    comment: 'Current commission percentage for this associate'
  },
  commission_set_by: {
    type: DataTypes.ENUM('system', 'admin', 'upline'),
    defaultValue: 'system',
    comment: 'Who last updated the commission percent'
  },
  self_business_volume: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Total volume of deals closed by this associate themselves (drives rewards)'
  },
  referral_code: {
    type: DataTypes.STRING,
    unique: true
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of the most recent successful login — shown on dashboard'
  },
  is_temporary_password: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Flag indicating password is an initial temporary credential'
  },
  temporary_password_expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_sms_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_sms_status: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'users'
});

module.exports = User;
