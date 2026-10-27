const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BookingForm = sequelize.define('BookingForm', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  booking_ref: { type: DataTypes.STRING(50), allowNull: true, unique: true },
  
  // Section A — Plot Price Details
  project_id: { type: DataTypes.INTEGER, allowNull: true },
  project_name: { type: DataTypes.STRING },
  plot_id: { type: DataTypes.INTEGER, allowNull: true },
  plot_code: { type: DataTypes.STRING(50), allowNull: true },
  plot_size: { type: DataTypes.STRING },
  size_unit: { type: DataTypes.STRING, defaultValue: 'Sq.ft.' },
  sector_no: { type: DataTypes.STRING },
  plot_no: { type: DataTypes.STRING },
  rate_per_sqft: { type: DataTypes.DECIMAL(12, 2) },
  basic_plot_price: { type: DataTypes.DECIMAL(15, 2) },
  is_corner: { type: DataTypes.BOOLEAN, defaultValue: false },
  corner_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  corner_charge_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  is_park_facing: { type: DataTypes.BOOLEAN, defaultValue: false },
  park_facing_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  park_facing_charge_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  other_approved_charges: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total_plot_price: { type: DataTypes.DECIMAL(15, 2) },
  plot_length: { type: DataTypes.DECIMAL(10, 2) },
  plot_width: { type: DataTypes.DECIMAL(10, 2) },

  // Section B — Client / Applicant Details
  client_id: { type: DataTypes.INTEGER, allowNull: true },
  client_code: { type: DataTypes.STRING(50), allowNull: true },
  applicant_name: { type: DataTypes.STRING },
  father_husband_name: { type: DataTypes.STRING, allowNull: true },
  applicant_phone: { type: DataTypes.STRING },
  applicant_email: { type: DataTypes.STRING, allowNull: true },
  applicant_address: { type: DataTypes.TEXT, allowNull: true },
  permanent_address: { type: DataTypes.TEXT, allowNull: true },
  govt_id_type: { type: DataTypes.STRING, allowNull: true },
  govt_id_number: { type: DataTypes.STRING, allowNull: true },
  nominee_name: { type: DataTypes.STRING, allowNull: true },
  nominee_relation: { type: DataTypes.STRING, allowNull: true },
  applicant_date: { type: DataTypes.DATEONLY },
  applicant_place: { type: DataTypes.STRING },

  // Section C — Associate and Referral Information
  associate_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'Selling Associate User ID' },
  selling_associate_name: { type: DataTypes.STRING, allowNull: true },
  selling_associate_code: { type: DataTypes.STRING(50), allowNull: true },
  selling_associate_ref_id: { type: DataTypes.STRING(50), allowNull: true },
  direct_sponsor_id: { type: DataTypes.INTEGER, allowNull: true },
  direct_sponsor_name: { type: DataTypes.STRING, allowNull: true },
  direct_sponsor_code: { type: DataTypes.STRING(50), allowNull: true },
  direct_sponsor_ref_id: { type: DataTypes.STRING(50), allowNull: true },
  referral_chain_info: { type: DataTypes.TEXT, allowNull: true },
  referred_id: { type: DataTypes.STRING },

  // Section D — Payment Plan Option
  payment_plan_type: { 
    type: DataTypes.ENUM('full', 'booking_balance', 'emi', 'custom'), 
    defaultValue: 'full' 
  },
  payment_mode: { type: DataTypes.STRING, defaultValue: 'Cash' },
  check_no: { type: DataTypes.STRING },
  upi_id: { type: DataTypes.STRING },
  bank_name: { type: DataTypes.STRING },
  transaction_ref: { type: DataTypes.STRING(100), allowNull: true },
  booking_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  down_payment_amt: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  remaining_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  emi_duration_months: { type: DataTypes.INTEGER, allowNull: true },
  emi_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  installment_frequency: { type: DataTypes.STRING, defaultValue: 'monthly' },
  first_due_date: { type: DataTypes.DATEONLY, allowNull: true },

  // Section E — Terms, Declaration & Status
  declaration_accepted: { type: DataTypes.BOOLEAN, defaultValue: true },
  status: { 
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'allotted', 'transferred', 'cancelled'), 
    defaultValue: 'pending' 
  },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  allotment_status: { 
    type: DataTypes.ENUM('none', 'provisional', 'confirmed'), 
    defaultValue: 'none' 
  },
  cancellation_reason: { type: DataTypes.TEXT, allowNull: true },
  refund_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  authorized_officer_name: { type: DataTypes.STRING, allowNull: true },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'booking_forms',
  timestamps: true
});

module.exports = BookingForm;
