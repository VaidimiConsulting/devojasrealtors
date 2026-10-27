const express = require('express');
const router = express.Router();
const { getSlabs, createSlab, updateSlab, deleteSlab, resetStandardSlabs } = require('../controllers/slabController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/', getSlabs);
router.post('/reset-standard', resetStandardSlabs);
router.post('/', createSlab);
router.put('/:id', updateSlab);
router.delete('/:id', deleteSlab);

module.exports = router;
