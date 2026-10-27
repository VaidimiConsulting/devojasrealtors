const express = require('express');
const router = express.Router();
const {
  getPlots, getPlot, createPlot, updatePlot, deletePlot,
  updatePlotApproval, toggleFeatured, purchasePlot, getPlotPurchases
} = require('../controllers/plotController');
const { protect, authorize } = require('../middleware/auth');
const { Plot } = require('../models');
const { Op } = require('sequelize');

// ── PUBLIC route (no auth required) — for the public website plot inventory ──
router.get('/public', async (req, res, next) => {
  try {
    const { status, location } = req.query;
    const eligibleStatuses = ['available', 'booked', 'sold', 'pending', 'under_negotiation', 'approved'];
    const where = {};

    if (status && status !== 'all') {
      if (status === 'booked') {
        where.status = { [Op.in]: ['booked', 'sold'] };
      } else {
        where.status = status;
      }
    } else {
      where.status = { [Op.in]: eligibleStatuses };
    }

    if (location) where.location = { [Op.like]: `%${location}%` };

    const plots = await Plot.findAll({
      where,
      attributes: ['id', 'plot_code', 'title', 'location', 'city', 'block', 'plot_number', 'size_sqft', 'price', 'dimensions', 'road_width', 'facing', 'is_corner', 'status', 'image_url', 'description'],
      order: [['id', 'DESC']]
    });
    res.json({ success: true, count: plots.length, data: plots });
  } catch (err) { next(err); }
});

// Plot purchases listing — accessible by admin (all records) and associate (own records scoped in controller)
router.get('/purchases', protect, authorize('admin', 'associate'), getPlotPurchases);

router.use(protect, authorize('admin'));

router.post('/purchase', purchasePlot);
router.get('/', getPlots);
router.post('/', createPlot);
router.get('/:id', getPlot);
router.put('/:id', updatePlot);
router.delete('/:id', deletePlot);
router.put('/:id/approval', updatePlotApproval);
router.put('/:id/feature', toggleFeatured);

module.exports = router;
