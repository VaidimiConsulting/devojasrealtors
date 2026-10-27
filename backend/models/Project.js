const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  project_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Custom unique code, e.g. TEST-PROJ-001'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  developer_name: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Devojas Realtors Pvt Ltd'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  facilities: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'e.g. 24/7 Security, Wide Roads, Park, Water Supply'
  },
  status: {
    type: DataTypes.ENUM('active', 'upcoming', 'completed', 'hold'),
    defaultValue: 'active'
  },
  total_plots: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'projects',
  timestamps: true
});

module.exports = Project;
