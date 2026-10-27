const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SmsLog = sequelize.define('SmsLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'credentials'
  },
  status: {
    type: DataTypes.ENUM('sent', 'failed', 'mock_delivered'),
    defaultValue: 'sent'
  },
  provider: {
    type: DataTypes.STRING,
    defaultValue: 'mock'
  },
  message_snippet: {
    type: DataTypes.STRING,
    allowNull: true
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'sms_logs',
  timestamps: true,
  updatedAt: false
});

module.exports = SmsLog;
