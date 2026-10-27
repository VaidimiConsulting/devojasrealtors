const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PayoutStatement = sequelize.define('PayoutStatement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  associate_id: { type: DataTypes.INTEGER, allowNull: false },
  created_by: { type: DataTypes.INTEGER, allowNull: true }, // accounts user id

  payment_date: { type: DataTypes.DATEONLY, allowNull: false },

  // Business figures (from settled commission ledger rows)
  self_business:  { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }, // own sale values
  team_business:  { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }, // downline sale values
  total_business: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }, // self + team

  // Slab (determined from total_business against saved slab ranges)
  slab_id:           { type: DataTypes.INTEGER, allowNull: true },
  slab_percent:      { type: DataTypes.FLOAT, defaultValue: 0 },       // slab's configured %
  // effective_commission_percent: statement-specific override (editable by Accounts). Does NOT touch users table.
  effective_commission_percent: { type: DataTypes.FLOAT, defaultValue: 0 },

  // Slab reward — paid only if self_business >= self_target_amount
  reward_amount:        { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }, // slab's configured reward
  self_target_amount:   { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }, // slab's self target (snapshot)
  self_target_achieved: { type: DataTypes.BOOLEAN, defaultValue: false },    // true if self_business >= self_target_amount

  // Calculation (Business model: Self Commission = ₹0)
  // self_deposit  = 0  (no self commission on own sales)
  // team_deposit  = differential commission earned from downline
  // total_amount  = team_deposit + eligible slab reward
  self_deposit:       { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  team_deposit:       { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_amount:       { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },   // gross payout
  tds_percent:        { type: DataTypes.FLOAT, defaultValue: 5 },
  tds_amount:         { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  processing_percent: { type: DataTypes.FLOAT, defaultValue: 0 },
  processing_amount:  { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  net_payable:        { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },   // total_amount - tds

  notes:  { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'pending', 'under_review', 'approved', 'paid', 'rejected', 'published'), defaultValue: 'pending' }
}, {
  tableName: 'payout_statements',
  timestamps: true
});

module.exports = PayoutStatement;
