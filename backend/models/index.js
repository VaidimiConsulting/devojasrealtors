const { sequelize } = require('../config/db');
const User = require('./User');
const Plot = require('./Plot');
const Transaction = require('./Transaction');
const Commission = require('./Commission');
const CommissionSetting = require('./CommissionSetting');
const Wallet = require('./Wallet');
const WalletTransaction = require('./WalletTransaction');
const Notification = require('./Notification');
const Complaint = require('./Complaint');
const Banner = require('./Banner');
const Slab = require('./Slab');
const RewardLog = require('./RewardLog');
const Payment = require('./Payment');
const EmiPlan = require('./EmiPlan');
const EmiInstallment = require('./EmiInstallment');
const AppSettings = require('./AppSettings');
const Enquiry = require('./Enquiry');
const BookingForm = require('./BookingForm');
const PayoutStatement = require('./PayoutStatement');
const DailyRecord = require('./DailyRecord');
const DailyReport = require('./DailyReport');
const CommissionHistory = require('./CommissionHistory');
const SmsLog = require('./SmsLog');
const AuditLog = require('./AuditLog');
const CommissionPayment = require('./CommissionPayment');

const Project = require('./Project');

// ---------- Associations ----------

// Project <-> Plot
Project.hasMany(Plot, { foreignKey: 'project_id', as: 'plots' });
Plot.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// User <-> Plot (owner)
User.hasMany(Plot, { foreignKey: 'owner_id', as: 'plots' });
Plot.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// User self-reference (referred_by)
User.belongsTo(User, { foreignKey: 'referred_by', as: 'referrer' });
User.hasMany(User, { foreignKey: 'referred_by', as: 'referrals' });

// Transaction relations
Transaction.belongsTo(Plot, { foreignKey: 'plot_id', as: 'plot' });
Transaction.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });
Transaction.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });
Transaction.belongsTo(User, { foreignKey: 'seller_associate_id', as: 'sellerAssociate' });
Transaction.belongsTo(User, { foreignKey: 'buyer_associate_id', as: 'buyerAssociate' });
User.hasMany(Transaction, { foreignKey: 'buyer_id', as: 'purchases' });
User.hasMany(Transaction, { foreignKey: 'seller_id', as: 'sales' });

// Commission relations
Commission.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });
Commission.belongsTo(User, { foreignKey: 'user_id', as: 'earner' });
Commission.belongsTo(User, { foreignKey: 'downline_user_id', as: 'downlineAssociate' });
Transaction.hasMany(Commission, { foreignKey: 'transaction_id', as: 'commissions' });

// CommissionPayment relations
CommissionPayment.belongsTo(Commission, { foreignKey: 'commission_id', as: 'commission' });
Commission.hasMany(CommissionPayment, { foreignKey: 'commission_id', as: 'payments' });
CommissionPayment.belongsTo(User, { foreignKey: 'associate_id', as: 'associate' });
CommissionPayment.belongsTo(User, { foreignKey: 'recorded_by', as: 'recordedByUser' });
User.hasMany(CommissionPayment, { foreignKey: 'associate_id', as: 'commissionPayments' });

// CommissionHistory relations
CommissionHistory.belongsTo(User, { foreignKey: 'user_id', as: 'associate' });
CommissionHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'adminUser' });
User.hasMany(CommissionHistory, { foreignKey: 'user_id', as: 'commissionHistories' });

// SmsLog relations
SmsLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// AuditLog relations
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'performer' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });

// Wallet relations
Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(Wallet, { foreignKey: 'user_id', as: 'wallet' });

WalletTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(WalletTransaction, { foreignKey: 'user_id', as: 'walletTransactions' });

// Notification relations
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Complaint relations
Complaint.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Slab relations
User.belongsTo(Slab, { foreignKey: 'current_slab_id', as: 'currentSlab' });

// RewardLog relations
RewardLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
RewardLog.belongsTo(Slab, { foreignKey: 'slab_id', as: 'slab' });
RewardLog.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });
User.hasMany(RewardLog, { foreignKey: 'user_id', as: 'rewards' });

// Payment relations
Payment.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });
Payment.belongsTo(User, { foreignKey: 'recorded_by', as: 'recordedByUser' });
Transaction.hasMany(Payment, { foreignKey: 'transaction_id', as: 'payments' });

// EMI relations
EmiPlan.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });
Transaction.hasOne(EmiPlan, { foreignKey: 'transaction_id', as: 'emiPlan' });

EmiInstallment.belongsTo(EmiPlan, { foreignKey: 'emi_plan_id', as: 'emiPlan' });
EmiPlan.hasMany(EmiInstallment, { foreignKey: 'emi_plan_id', as: 'installments' });

// BookingForm relations
BookingForm.belongsTo(User, { foreignKey: 'associate_id', as: 'associate' });
User.hasMany(BookingForm, { foreignKey: 'associate_id', as: 'submittedForms' });

BookingForm.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
BookingForm.belongsTo(Plot, { foreignKey: 'plot_id', as: 'plot' });
BookingForm.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// PayoutStatement relations
PayoutStatement.belongsTo(User, { foreignKey: 'associate_id', as: 'associate' });
User.hasMany(PayoutStatement, { foreignKey: 'associate_id', as: 'payoutStatements' });
PayoutStatement.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
PayoutStatement.belongsTo(require('./Slab'), { foreignKey: 'slab_id', as: 'slab' });

// DailyRecord relations
DailyRecord.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
DailyRecord.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
User.hasMany(DailyRecord, { foreignKey: 'created_by', as: 'dailyRecords' });

// DailyReport relations
DailyReport.belongsTo(User, { foreignKey: 'submitted_by', as: 'submitter' });
DailyReport.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });
User.hasMany(DailyReport, { foreignKey: 'submitted_by', as: 'dailyReports' });

module.exports = {
  sequelize,
  User,
  Project,
  Plot,
  Transaction,
  Commission,
  CommissionSetting,
  Wallet,
  WalletTransaction,
  Notification,
  Complaint,
  Banner,
  Slab,
  RewardLog,
  Payment,
  EmiPlan,
  EmiInstallment,
  AppSettings,
  Enquiry,
  BookingForm,
  PayoutStatement,
  DailyRecord,
  DailyReport,
  CommissionHistory,
  SmsLog,
  AuditLog,
  CommissionPayment
};
