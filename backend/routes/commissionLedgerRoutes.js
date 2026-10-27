const express = require('express');
const router = express.Router();
const { getLedger, getCounts, getTarget } = require('../controllers/commissionLedgerController');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/', getLedger);
router.get('/network-counts', getCounts);
router.get('/monthly-target', getTarget);
module.exports = router;
