const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAssociatesAccountsList,
  getAssociateAccountDetails,
  getCommissionLedger,
  searchAssociatesForCommission,
  getAssociateCommissionLedger,
  payCommission,
  updateCommissionStatus,
  bulkUpdateCommissions,
  getCommissionSlipData,
  getAccountsTransactions,
  recordCustomerPayment,
  getPaymentsLedger,
  getIncomeExpensesSummary,
  addIncomeExpense,
  getAuditLogsList,
  getPaymentVerifications,
  updatePaymentStatus,
  getPayoutRequests,
  processPayout,
  getInvoiceData,
  getInvoiceList,
  getFinancialReports,
  getAllWallets,
  exportTransactions,
  createComplaint,
  getMyComplaints,
  getMyNotifications,
  downloadPaymentReceiptPdf,
  downloadTransactionReceiptPdf,
  getCommissionAuditReport,
  reprocessSaleCommissions
} = require('../controllers/accountsController');
const { protect, authorize } = require('../middleware/auth');

// Protected for Accounts and Admin
router.use(protect, authorize('accounts', 'admin'));

// A. Dashboard Stats
router.get('/dashboard-stats', getDashboardStats);

// B. Associate Accounts
router.get('/associates', getAssociatesAccountsList);
router.get('/associates/:id', getAssociateAccountDetails);

// C. Commission Management & Ledger (Sections 5 & 6)
router.get('/commissions/search-associates', searchAssociatesForCommission);
router.get('/commissions/associate/:id', getAssociateCommissionLedger);
router.post('/commissions/pay', payCommission);
router.get('/commissions', getCommissionLedger);
router.get('/commissions/audit', getCommissionAuditReport);
router.post('/commissions/reprocess/:transaction_id', reprocessSaleCommissions);
router.put('/commissions/:id/status', updateCommissionStatus);
router.post('/commissions/bulk', bulkUpdateCommissions);

// D. Individual Commission Slips (Section 7)
router.get('/commission-slips', getCommissionSlipData);

// E. Property Sales & Bookings
router.get('/transactions', getAccountsTransactions);

// F. Customer Payments & Receipts
router.post('/payments/record', recordCustomerPayment);
router.get('/payments/ledger', getPaymentsLedger);
router.get('/payments', getPaymentVerifications);
router.get('/payments/:id/receipt-pdf', downloadPaymentReceiptPdf);
router.get('/transactions/:id/receipt-pdf', downloadTransactionReceiptPdf);
router.put('/payments/:id', updatePaymentStatus);

// G. Income & Expenses
router.get('/income-expenses', getIncomeExpensesSummary);
router.post('/expenses', addIncomeExpense);

// H. Audit Logs
router.get('/audit-logs', getAuditLogsList);

// Payouts & Invoices (Existing)
router.get('/payouts', getPayoutRequests);
router.put('/payouts/:id', processPayout);

router.get('/invoices', getInvoiceList);
router.get('/invoices/:transactionId', getInvoiceData);

// Reports & Wallets
router.get('/reports', getFinancialReports);
router.get('/wallets', getAllWallets);
router.get('/export/transactions', exportTransactions);

// Complaints & Notifications
router.post('/complaints', createComplaint);
router.get('/complaints', getMyComplaints);
router.get('/notifications', getMyNotifications);

module.exports = router;
