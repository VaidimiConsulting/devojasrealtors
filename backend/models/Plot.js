const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Plot = sequelize.define('Plot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  plot_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Custom unique Plot identifier, e.g. TEST-PLOT-001'
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Associated project ID'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING
  },
  sector_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Sector Number, e.g. "02"'
  },
  block: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g. "Block A" — used by the public website inventory display'
  },
  plot_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  size_sqft: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  rate_per_sqft: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  },
  basic_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0
  },
  corner_charge: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  },
  park_facing_charge: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  },
  additional_charges: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  },
  discount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Final Plot Price = Basic Plot Price + Corner + Park Facing + Additional - Discount'
  },
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: true,  // nullable — a new plot may not have an owner yet
    comment: 'Client/Owner who owns/booked this plot (optional on creation)'
  },
  image_url: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'available', 'booked', 'sold', 'under_negotiation'),
    defaultValue: 'available'
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dimensions: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g. "40x60 ft"'
  },
  road_width: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g. "30 ft"'
  },
  facing: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g. "East", "North"'
  },
  is_corner: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_park_facing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  allotment_status: {
    type: DataTypes.ENUM('none', 'provisional', 'allotted', 'transferred', 'cancelled'),
    defaultValue: 'none'
  },
  booking_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'plots'
});

module.exports = Plot;
