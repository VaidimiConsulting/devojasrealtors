const express = require('express');
const router = express.Router();
const { getFullTree, updateSponsor } = require('../controllers/networkController');
const { protect, authorize } = require('../middleware/auth');

router.get('/full-tree', protect, authorize('admin'), getFullTree);
router.get('/full', protect, authorize('admin'), getFullTree);
router.put('/user/:id/sponsor', protect, authorize('admin'), updateSponsor);

module.exports = router;
