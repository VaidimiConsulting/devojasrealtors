const express = require('express');
const router = express.Router();
const {
  getCommissions,
  getAssociatesCommissionList,
  updateAssociateCommission,
  getAssociateCommissionHistory,
  previewDistribution,
  getCommissionSettings,
  updateCommissionSettings
} = require('../controllers/commissionController');
const { protect, authorize } = require('../middleware/auth');

// Read-only commission data: Admin AND Accounts can view
router.get('/', protect, authorize('admin', 'accounts'), getCommissions);
router.get('/associates', protect, authorize('admin', 'accounts'), getAssociatesCommissionList);
router.get('/associates/:id/history', protect, authorize('admin', 'accounts'), getAssociateCommissionHistory);
router.get('/preview', protect, authorize('admin', 'accounts'), previewDistribution);
router.get('/settings', protect, authorize('admin', 'accounts'), getCommissionSettings);

// Write operations: Admin only
router.put('/associates/:id', protect, authorize('admin'), updateAssociateCommission);
router.put('/settings', protect, authorize('admin'), updateCommissionSettings);

module.exports = router;

