const { Slab } = require('../models');

// Standard 12-slab configuration as per company MLM policy
const STANDARD_SLABS = [
  { slab_number: 1, min_amount: 0, max_amount: 1000000, percentage: 5, self_target_amount: 500000, reward_amount: 10000 },
  { slab_number: 2, min_amount: 1000000, max_amount: 2500000, percentage: 7, self_target_amount: 750000, reward_amount: 25000 },
  { slab_number: 3, min_amount: 2500000, max_amount: 7500000, percentage: 9, self_target_amount: 1500000, reward_amount: 50000 },
  { slab_number: 4, min_amount: 7500000, max_amount: 15000000, percentage: 10, self_target_amount: 2500000, reward_amount: 150000 },
  { slab_number: 5, min_amount: 15000000, max_amount: 30000000, percentage: 11, self_target_amount: 3500000, reward_amount: 300000 },
  { slab_number: 6, min_amount: 30000000, max_amount: 60000000, percentage: 12, self_target_amount: 5000000, reward_amount: 450000 },
  { slab_number: 7, min_amount: 60000000, max_amount: 100000000, percentage: 13, self_target_amount: 7500000, reward_amount: 800000 },
  { slab_number: 8, min_amount: 100000000, max_amount: 150000000, percentage: 14, self_target_amount: 10000000, reward_amount: 1000000 },
  { slab_number: 9, min_amount: 150000000, max_amount: 250000000, percentage: 15, self_target_amount: 12500000, reward_amount: 1500000 },
  { slab_number: 10, min_amount: 250000000, max_amount: 500000000, percentage: 16, self_target_amount: 15000000, reward_amount: 2000000 },
  { slab_number: 11, min_amount: 500000000, max_amount: 750000000, percentage: 17, self_target_amount: 17500000, reward_amount: 3000000 },
  { slab_number: 12, min_amount: 750000000, max_amount: 1000000000, percentage: 18, self_target_amount: 20000000, reward_amount: 5000000 }
];

// @desc  Get all slabs (ordered)
// @route GET /api/slabs
const getSlabs = async (req, res, next) => {
  try {
    const slabs = await Slab.findAll({ order: [['slab_number', 'ASC']] });
    res.json({ success: true, data: slabs });
  } catch (error) { next(error); }
};

// @desc  Create a slab
// @route POST /api/slabs
const createSlab = async (req, res, next) => {
  try {
    const slab = await Slab.create(req.body);
    res.status(201).json({ success: true, data: slab });
  } catch (error) { next(error); }
};

// @desc  Update a slab (min/max/percentage/reward/self_target_amount — all admin editable)
// @route PUT /api/slabs/:id
const updateSlab = async (req, res, next) => {
  try {
    const slab = await Slab.findByPk(req.params.id);
    if (!slab) return res.status(404).json({ success: false, message: 'Slab not found' });
    await slab.update(req.body);
    res.json({ success: true, data: slab });
  } catch (error) { next(error); }
};

// @desc  Delete a slab
// @route DELETE /api/slabs/:id
const deleteSlab = async (req, res, next) => {
  try {
    const slab = await Slab.findByPk(req.params.id);
    if (!slab) return res.status(404).json({ success: false, message: 'Slab not found' });
    await slab.destroy();
    res.json({ success: true, message: 'Slab deleted' });
  } catch (error) { next(error); }
};

// @desc  Seed / Reset to standard 12 slabs
// @route POST /api/slabs/reset-standard
const resetStandardSlabs = async (req, res, next) => {
  try {
    for (const s of STANDARD_SLABS) {
      const existing = await Slab.findOne({ where: { slab_number: s.slab_number } });
      if (existing) {
        await existing.update(s);
      } else {
        await Slab.create(s);
      }
    }
    const slabs = await Slab.findAll({ order: [['slab_number', 'ASC']] });
    res.json({ success: true, message: 'Standard 12 slabs synchronized', data: slabs });
  } catch (error) { next(error); }
};

module.exports = {
  getSlabs,
  createSlab,
  updateSlab,
  deleteSlab,
  resetStandardSlabs,
  STANDARD_SLABS
};
