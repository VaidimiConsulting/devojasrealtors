const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * DailyReport — represents a Accounts-submitted daily report for a specific date.
 * The actual financial data (bookings, payments, EMI) is always fetched live from
 * the source-of-truth tables.  This table stores the report metadata, summary
 * snapshot, remarks, and approval workflow state.
 */
const DailyReport = sequelize.define('DailyReport', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  report_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'The calendar date this report covers'
  },

  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected'),
    defaultValue: 'draft'
  },

  // Snapshot of summary figures at the time of submission
  snap_new_bookings:        { type: DataTypes.INTEGER,      defaultValue: 0 },
  snap_sales_value:         { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  snap_total_collections:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  snap_booking_collections: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  snap_emi_collections:     { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  snap_other_collections:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  snap_cash_collections:    { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  snap_bank_collections:    { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  snap_expenses:            { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  snap_pending_count:       { type: DataTypes.INTEGER,       defaultValue: 0 },
  snap_overdue_emi_count:   { type: DataTypes.INTEGER,       defaultValue: 0 },

  remarks: { type: DataTypes.TEXT, allowNull: true },

  // Accounts user who created/submitted
  submitted_by: { type: DataTypes.INTEGER, allowNull: false },
  submitted_at: { type: DataTypes.DATE,    allowNull: true },

  // Admin review
  reviewed_by:   { type: DataTypes.INTEGER, allowNull: true },
  reviewed_at:   { type: DataTypes.DATE,    allowNull: true },
  reject_reason: { type: DataTypes.TEXT,    allowNull: true }
}, {
  tableName: 'daily_reports',
  timestamps: true
});

module.exports = DailyReport;
