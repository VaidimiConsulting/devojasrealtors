const express = require('express');
const router = express.Router();
const {
  getDailySummary,
  saveDraft,
  submitReport,
  getReports,
  getReportById,
  approveReport,
  rejectReport,
  getAccountsUsers
} = require('../controllers/dailyReportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Summary (both accounts and admin)
router.get('/summary', authorize('admin', 'accounts'), getDailySummary);

// Accounts users list (admin only, for filter dropdown)
router.get('/accounts-users', authorize('admin'), getAccountsUsers);

// Report CRUD
router.get('/',    authorize('admin', 'accounts'), getReports);
router.get('/:id', authorize('admin', 'accounts'), getReportById);

// Draft & Submit
router.post('/draft',  authorize('admin', 'accounts'), saveDraft);
router.post('/submit', authorize('admin', 'accounts'), submitReport);

// Admin review
router.put('/:id/approve', authorize('admin'), approveReport);
router.put('/:id/reject',  authorize('admin'), rejectReport);

module.exports = router;
