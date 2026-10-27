const express = require('express');
const router = express.Router();
const {
  getTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction,
  recordPayment, getReceipt, getTransactionPdf
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');
const Transaction = require('../models/Transaction');

// PDF receipt download — authorized for admin or the associate involved in this deal
router.get('/:id/pdf', protect, authorize('admin', 'associate'), async (req, res, next) => {
  try {
    if (req.user.role === 'associate') {
      const txn = await Transaction.findByPk(req.params.id);
      if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });
      if (txn.seller_associate_id !== req.user.id && txn.buyer_associate_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to download receipt for this transaction' });
      }
    }
    return getTransactionPdf(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.use(protect, authorize('admin'));

router.get('/', getTransactions);
router.post('/', createTransaction);
router.get('/:id', getTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);
router.post('/:id/payments', recordPayment);
router.get('/:id/receipt', getReceipt);

module.exports = router;
