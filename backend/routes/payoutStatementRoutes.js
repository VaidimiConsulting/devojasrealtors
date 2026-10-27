const express = require('express');
const router = express.Router();
const {
  slabLookup,
  getAssociateLedger,
  createPayoutStatement,
  getPayoutStatements,
  getPayoutStatement,
  updatePayoutStatement,
  deletePayoutStatement,
  getAssociatesList,
  previewPayoutStatement
} = require('../controllers/payoutStatementController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Live preview calculation endpoint (accounts + admin)
router.post('/preview', authorize('admin', 'accounts'), previewPayoutStatement);

// Slab lookup (accounts + admin use it)
router.get('/slab-lookup', authorize('admin', 'accounts'), slabLookup);

// Authoritative ledger preview for one associate (own rate, per-sale differential, balances, deductions)
router.get('/ledger/:associateId', authorize('admin', 'accounts'), getAssociateLedger);

// Associates list for dropdown
router.get('/associates', authorize('admin', 'accounts'), getAssociatesList);

// CRUD
router.route('/')
  .get(getPayoutStatements) // all roles (associate sees own, accounts/admin sees all)
  .post(authorize('admin', 'accounts'), createPayoutStatement);

router.route('/:id')
  .get(getPayoutStatement)
  .put(authorize('admin', 'accounts'), updatePayoutStatement)
  .delete(authorize('admin', 'accounts'), deletePayoutStatement);

module.exports = router;
