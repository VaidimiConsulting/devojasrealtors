const { Op } = require('sequelize');
const { Commission, CommissionSetting, CommissionHistory, User, Transaction, Plot } = require('../models');
const { previewCommissionDistribution, roundPercent } = require('../services/commissionEngine');

// @desc Get all commissions (with filters)
// @route GET /api/commissions
const getCommissions = async (req, res, next) => {
  try {
    const { user_id, status, is_flagged, transaction_id } = req.query;
    const where = {};
    if (user_id) where.user_id = user_id;
    if (status) where.status = status;
    if (transaction_id) where.transaction_id = transaction_id;
    if (is_flagged !== undefined) where.is_flagged = is_flagged === 'true' || is_flagged === true;

    const commissions = await Commission.findAll({
      where,
      include: [
        { model: User, as: 'earner', attributes: ['id', 'name', 'login_id', 'phone', 'email', 'commission_percent'] },
        { model: User, as: 'downlineAssociate', attributes: ['id', 'name', 'login_id', 'phone', 'commission_percent'] },
        {
          model: Transaction,
          as: 'transaction',
          include: [{ model: Plot, as: 'plot', attributes: ['id', 'title', 'location', 'price'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: commissions.length, data: commissions });
  } catch (error) {
    next(error);
  }
};

// @desc Get all associates for Commission Management (Admin view)
// @route GET /api/commissions/associates
const getAssociatesCommissionList = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = { role: { [Op.in]: ['associate', 'admin'] } };

    if (search && search.trim()) {
      const q = search.trim();
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { login_id: { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } }
      ];
    }

    const associates = await User.findAll({
      where,
      attributes: [
        'id', 'name', 'login_id', 'phone', 'email', 'role', 'status', 'kyc_status',
        'commission_percent', 'referral_commission_percent', 'commission_set_by',
        'referred_by', 'total_business_volume', 'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'referrer',
          attributes: ['id', 'name', 'login_id', 'phone', 'commission_percent']
        },
        {
          model: User,
          as: 'referrals',
          attributes: ['id', 'name', 'login_id', 'commission_percent']
        },
        {
          model: CommissionHistory,
          as: 'commissionHistories',
          limit: 1,
          order: [['effective_date', 'DESC']],
          include: [{ model: User, as: 'adminUser', attributes: ['id', 'name'] }]
        }
      ],
      order: [['commission_percent', 'DESC'], ['name', 'ASC']]
    });

    const formatted = associates.map(a => {
      const json = a.toJSON();
      const latestHistory = json.commissionHistories && json.commissionHistories[0];
      return {
        ...json,
        sponsor: json.referrer,
        direct_downlines_count: json.referrals ? json.referrals.length : 0,
        direct_downlines: json.referrals || [],
        latest_history: latestHistory || null
      };
    });

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc Set or update associate commission percentage (Admin only)
// @route PUT /api/commissions/associates/:id
const updateAssociateCommission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commission_percent, reason, effective_date } = req.body;

    const newPercent = roundPercent(commission_percent);
    if (isNaN(newPercent) || newPercent < 0 || newPercent > 100) {
      return res.status(400).json({
        success: false,
        message: 'Commission percentage must be a valid number between 0% and 100%.'
      });
    }

    const associate = await User.findOne({
      where: { id, role: { [Op.in]: ['associate', 'admin'] } },
      include: [
        { model: User, as: 'referrals', attributes: ['id', 'name', 'login_id', 'commission_percent'] },
        { model: User, as: 'referrer', attributes: ['id', 'name', 'login_id', 'commission_percent'] }
      ]
    });

    if (!associate) {
      return res.status(404).json({ success: false, message: 'Associate not found.' });
    }

    const previousPercent = roundPercent(associate.commission_percent || 0);

    // Validation checks for hierarchy consistency:
    const warnings = [];

    // Check if new percent is lower than any direct downline
    if (associate.referrals && associate.referrals.length > 0) {
      const higherDownlines = associate.referrals.filter(
        d => roundPercent(d.commission_percent) > newPercent
      );
      if (higherDownlines.length > 0) {
        warnings.push(
          `Note: ${higherDownlines.length} downline associate(s) have higher percentage than ${newPercent}% (` +
          higherDownlines.map(d => `${d.name}: ${d.commission_percent}%`).join(', ') +
          `). Future transactions from these branches will flag upline differential for review.`
        );
      }
    }

    // Check if upline has lower percent than new percent
    if (associate.referrer) {
      const uplinePercent = roundPercent(associate.referrer.commission_percent || 0);
      if (uplinePercent < newPercent) {
        warnings.push(
          `Note: Direct sponsor ${associate.referrer.name} has ${uplinePercent}%, which is lower than this associate's new ${newPercent}%. Sponsor may need an update.`
        );
      }
    }

    // Update associate commission percentage
    await associate.update({
      commission_percent: newPercent,
      referral_commission_percent: newPercent,
      commission_set_by: 'admin'
    });

    // Record audit trail in CommissionHistory
    const historyRecord = await CommissionHistory.create({
      user_id: associate.id,
      previous_percent: previousPercent,
      new_percent: newPercent,
      changed_by: req.user.id,
      effective_date: effective_date ? new Date(effective_date) : new Date(),
      reason: reason || 'Admin updated commission percentage'
    });

    res.json({
      success: true,
      message: `Commission percentage for ${associate.name} updated from ${previousPercent}% to ${newPercent}%.`,
      warnings: warnings.length > 0 ? warnings : null,
      data: {
        id: associate.id,
        name: associate.name,
        login_id: associate.login_id,
        previous_percent: previousPercent,
        current_percent: newPercent,
        effective_date: historyRecord.effective_date,
        history_id: historyRecord.id
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc View history of commission changes for a specific associate
// @route GET /api/commissions/associates/:id/history
const getAssociateCommissionHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await CommissionHistory.findAll({
      where: { user_id: id },
      include: [{ model: User, as: 'adminUser', attributes: ['id', 'name', 'login_id'] }],
      order: [['effective_date', 'DESC'], ['id', 'DESC']]
    });

    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    next(error);
  }
};

// @desc Preview / simulate multi-level differential commission distribution
// @route GET /api/commissions/preview?associate_id=X&amount=Y
const previewDistribution = async (req, res, next) => {
  try {
    const { associate_id, amount } = req.query;
    if (!associate_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide associate_id and deal amount.'
      });
    }

    const preview = await previewCommissionDistribution(associate_id, amount);
    res.json({ success: true, data: preview });
  } catch (error) {
    next(error);
  }
};

// @desc Get current global commission settings
// @route GET /api/commissions/settings
const getCommissionSettings = async (req, res, next) => {
  try {
    let settings = await CommissionSetting.findOne();
    if (!settings) settings = await CommissionSetting.create({});
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc Update global commission settings (Admin only)
// @route PUT /api/commissions/settings
const updateCommissionSettings = async (req, res, next) => {
  try {
    let settings = await CommissionSetting.findOne();
    if (!settings) settings = await CommissionSetting.create({});

    await settings.update(req.body);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCommissions,
  getAssociatesCommissionList,
  updateAssociateCommission,
  getAssociateCommissionHistory,
  previewDistribution,
  getCommissionSettings,
  updateCommissionSettings
};
