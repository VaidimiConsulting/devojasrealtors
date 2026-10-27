const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getMyPlots, createMyPlot, updateMyPlot, deleteMyPlot,
  browsePlots, getPlotDetail, getMyTransactions, updateProfile, changePassword,
  submitKyc, getMyNotifications, markNotificationRead, createComplaint, getMyComplaints,
  getMyReceipt, getMyEmiSchedule, getMyBookingPdf, getMyPaymentReceiptPdf
} = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/auth');

// Every route here is protected AND restricted to role = 'client'
router.use(protect, authorize('client'));

router.get('/dashboard-stats', getDashboardStats);

router.get('/my-plots', getMyPlots);
router.post('/plots', createMyPlot);
router.put('/plots/:id', updateMyPlot);
router.delete('/plots/:id', deleteMyPlot);

router.get('/browse-plots', browsePlots);
router.get('/plots/:id', getPlotDetail);

router.get('/my-transactions', getMyTransactions);
router.get('/transactions/:id/receipt', getMyReceipt);
router.get('/transactions/:id/pdf', getMyBookingPdf);
router.get('/transactions/:id/emi', getMyEmiSchedule);
router.get('/payments/:id/receipt-pdf', getMyPaymentReceiptPdf);

router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/kyc', submitKyc);

router.get('/notifications', getMyNotifications);
router.put('/notifications/:id/read', markNotificationRead);

router.post('/complaints', createComplaint);
router.get('/complaints', getMyComplaints);

module.exports = router;
