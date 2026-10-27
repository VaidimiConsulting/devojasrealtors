const { PayoutStatement, User, Slab, Commission, CommissionPayment, Transaction, AuditLog, RewardLog } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { getPayableEntries, getDownlineIds, round2, monthlyBusiness } = require('../services/commissionLedgerService');
const { creditWallet } = require('../services/commissionEngine');

/**
 * Helper: Find slab for a given total business amount.
 * Slabs are sorted ascending by min_amount.
 * Range rule:
 * Slab 1: 0 - 10 lakh
 * Slab 2: Above 10 - 25 lakh
 * ...
 * Slab 12: Above 75 - 100 crore
 * If amount exceeds the highest slab max_amount, it matches the highest slab.
 */
const findSlab = async (totalBusiness) => {
  const amount = parseFloat(totalBusiness) || 0;
  const slabs = await Slab.findAll({ order: [['min_amount', 'ASC'], ['slab_number', 'ASC']] });
  if (!slabs.length) return null;

  let matched = null;
  for (let i = 0; i < slabs.length; i++) {
    const s = slabs[i];
    const min = parseFloat(s.min_amount);
    const max = parseFloat(s.max_amount);
    if (i === 0) {
      if (amount >= min && amount <= max) {
        matched = s;
        break;
      }
    } else {
      if (amount > min && amount <= max) {
        matched = s;
        break;
      }
    }
  }

  // If above the highest slab, use the top slab
  if (!matched && amount > parseFloat(slabs[slabs.length - 1].max_amount)) {
    matched = slabs[slabs.length - 1];
  }
  // If 0 or negative and no match, default to slab 1
  if (!matched && amount <= parseFloat(slabs[0].min_amount)) {
    matched = slabs[0];
  }

  return matched;
};

/**
 * Helper: Find applicable reward slab strictly based on personal sales (Self Business).
 * Team/downline sales never count toward self target.
 * Looks for the highest slab where selfBusiness >= slab.self_target_amount.
 */
const findRewardSlab = async (selfBusiness) => {
  const selfAmount = parseFloat(selfBusiness) || 0;
  const slabs = await Slab.findAll({
    where: { self_target_amount: { [Op.gt]: 0 } },
    order: [['self_target_amount', 'DESC'], ['slab_number', 'DESC']]
  });
  if (!slabs.length) {
    return { slab: null, selfTargetAchieved: false, selfTargetAmount: 0, rewardAmount: 0 };
  }

  // Find the highest slab where self business meets or exceeds self_target_amount
  const qualified = slabs.find(s => selfAmount >= parseFloat(s.self_target_amount));
  if (qualified) {
    return {
      slab: qualified,
      selfTargetAchieved: true,
      selfTargetAmount: parseFloat(qualified.self_target_amount),
      rewardAmount: parseFloat(qualified.reward_amount || 0)
    };
  }

  // Not achieved: use the lowest slab (e.g. Slab 1) as the baseline required self target
  const lowestSlab = slabs[slabs.length - 1];
  return {
    slab: lowestSlab,
    selfTargetAchieved: false,
    selfTargetAmount: parseFloat(lowestSlab.self_target_amount),
    rewardAmount: 0
  };
};

/**
 * Check if the reward for a given associate and slab was already paid
 * (prevents duplicate reward payments for the same associate and qualifying period).
 */
const isRewardAlreadyPaid = async (associateId, slabId) => {
  if (!associateId || !slabId) return false;
  // Check RewardLog
  const paidLog = await RewardLog.findOne({
    where: { user_id: associateId, slab_id: slabId, status: 'paid' }
  });
  if (paidLog) return true;

  // Check paid PayoutStatement
  const paidStmt = await PayoutStatement.findOne({
    where: {
      associate_id: associateId,
      slab_id: slabId,
      status: 'paid',
      self_target_achieved: true,
      reward_amount: { [Op.gt]: 0 }
    }
  });
  return !!paidStmt;
};

/**
 * Core payout calculation — BUSINESS RULES:
 *   - Self Commission = ₹0 (personal sales contribute to Self Business & Total Business, but do NOT generate self commission)
 *   - self_deposit  = ₹0 always
 *   - team_deposit  = differential commission earned from downline sales
 *   - Slab Reward is earned ONLY when self_business >= slab's self_target_amount
 *   - Team Business NEVER counts toward Self Target achievement
 *   - Gross Payout = Eligible Team Differential Commission + Total Reward + Other Earnings
 *   - TDS Deduction = Gross Payout × TDS Rate ÷ 100
 *   - Net Payable = Gross Payout - TDS Deduction
 *   - Processing Fee is REMOVED completely (0% / ₹0)
 */
const calculatePayout = (data) => {
  const selfBusiness       = parseFloat(data.self_business)          || 0;
  const teamBusiness       = parseFloat(data.team_business)          || 0;
  const totalBusiness      = round2(selfBusiness + teamBusiness);
  const tdsPercent         = data.tds_percent !== undefined && data.tds_percent !== '' ? parseFloat(data.tds_percent) : 5;
  const teamDifferential   = parseFloat(data.team_deposit || data.differential_commission) || 0;
  const otherEarnings      = parseFloat(data.other_earnings)         || 0;
  const slabRewardAmt      = parseFloat(data.reward_amount)          || 0;
  const selfTargetAmt      = parseFloat(data.self_target_amount)     || 0;

  // Reward rule: Self Business must meet the slab's self target (team business does NOT count)
  const selfTargetAchieved = selfTargetAmt > 0 ? (selfBusiness >= selfTargetAmt && selfBusiness > 0) : false;
  const eligibleReward     = selfTargetAchieved ? slabRewardAmt : 0;

  // Gross = Team Differential + Eligible Reward + Other Earnings
  const grossPayout        = round2(teamDifferential + eligibleReward + otherEarnings);
  const tdsAmount          = round2(grossPayout * tdsPercent / 100);
  const netPayable         = round2(grossPayout - tdsAmount);

  return {
    total_business:       totalBusiness,
    self_deposit:         0,
    team_deposit:         teamDifferential,
    self_target_amount:   selfTargetAmt,
    self_target_achieved: selfTargetAchieved,
    reward_amount:        slabRewardAmt,
    eligible_reward:      eligibleReward,
    other_earnings:       otherEarnings,
    total_amount:         grossPayout,
    tds_percent:          tdsPercent,
    tds_amount:           tdsAmount,
    processing_percent:   0,
    processing_amount:    0,
    net_payable:          netPayable
  };
};

// @desc Get slab suggestion based on business amount
// @route GET /api/payout-statements/slab-lookup?amount=xxx
const slabLookup = async (req, res, next) => {
  try {
    const amount = parseFloat(req.query.amount) || 0;
    const slab = await findSlab(amount);
    res.json({ success: true, data: slab });
  } catch (error) { next(error); }
};

// @desc Authoritative payout preview for one associate — straight from the saved commission ledger
// @route GET /api/payout-statements/ledger/:associateId
const getAssociateLedger = async (req, res, next) => {
  try {
    const assoc = await User.findOne({
      where: { id: req.params.associateId, role: 'associate' },
      attributes: ['id', 'name', 'login_id', 'phone', 'commission_percent', 'referral_commission_percent', 'referred_by'],
      include: [
        { model: User, as: 'referrer', attributes: ['id', 'name', 'login_id', 'phone'] }
      ]
    });
    if (!assoc) return res.status(404).json({ success: false, message: 'Associate not found' });

    const sponsor = assoc.referrer || (assoc.referred_by ? await User.findByPk(assoc.referred_by, { attributes: ['id', 'name', 'login_id', 'phone'] }) : null);
    const rawEntries = await getPayableEntries(assoc.id);
    const ownRate = parseFloat(assoc.commission_percent || 0);

    const effRate = (req.query.effective_commission_percent !== undefined && req.query.effective_commission_percent !== '')
      ? parseFloat(req.query.effective_commission_percent)
      : ownRate;

    const entries = rawEntries.map(e => {
      const amount = round2(e.amount);
      const paid = round2(e.paid_amount || 0);
      const remaining = round2(Math.max(0, amount - paid));
      return {
        ...e,
        amount,
        paid_amount: paid,
        remaining_amount: remaining
      };
    });

    const diff      = entries.filter(e => e.commission_type === 'differential');
    const sum       = (arr, k) => round2(arr.reduce((t, r) => t + (parseFloat(r[k]) || 0), 0));

    const tds       = req.query.tds_percent !== undefined && req.query.tds_percent !== '' ? parseFloat(req.query.tds_percent) : 5;
    const selected  = req.query.ids ? entries.filter(e => String(req.query.ids).split(',').map(Number).includes(e.id)) : entries;

    const selectedDiff     = diff.filter(e => selected.includes(e));
    const teamDifferential = sum(selectedDiff, 'remaining_amount');

    const biz    = await monthlyBusiness(assoc.id, req.query.payment_date);
    const totalSlab = await findSlab(biz.total_business);

    // Exact Self-Sale Reward Formula
    const { slab: rewardSlab, selfTargetAchieved, selfTargetAmount, rewardAmount } = await findRewardSlab(biz.self_business);
    const rewardAlreadyPaid = await isRewardAlreadyPaid(assoc.id, rewardSlab?.id);
    const eligibleReward = (selfTargetAchieved && !rewardAlreadyPaid) ? rewardAmount : 0;

    const gross  = round2(teamDifferential + eligibleReward);
    const tdsAmount  = round2(gross * tds / 100);
    const netPayable = round2(gross - tdsAmount);

    res.json({
      success: true,
      data: {
        associate: {
          id: assoc.id, name: assoc.name, login_id: assoc.login_id, phone: assoc.phone, sponsor,
          own_commission_rate: ownRate,
          effective_commission_rate: effRate,
          legacy_referral_rate: assoc.referral_commission_percent !== null ? parseFloat(assoc.referral_commission_percent) : null,
          rate_columns_differ: assoc.referral_commission_percent !== null && parseFloat(assoc.referral_commission_percent) !== ownRate
        },
        entries,
        summary: {
          self_commission:         0,
          direct_commission:       0,
          differential_commission: teamDifferential,
          already_paid_on_these_sales: sum(selected, 'paid_amount'),
          approved_unpaid:         sum(entries, 'remaining_amount'),
          gross_payable:           gross,
          self_target_amount:      selfTargetAmount,
          self_target_achieved:    selfTargetAchieved,
          slab_reward:             eligibleReward,
          reward_already_paid:     rewardAlreadyPaid,
          tds_percent:             tds,
          tds_amount:              tdsAmount,
          processing_percent:      0,
          processing_amount:       0,
          net_payable:             netPayable,
          self_business:           biz.self_business,
          team_business:           biz.team_business,
          total_business:          biz.total_business
        },
        slab_info: {
          ...biz,
          slab: rewardSlab ? {
            id:                 rewardSlab.id,
            slab_number:        rewardSlab.slab_number,
            min_amount:         parseFloat(rewardSlab.min_amount),
            max_amount:         parseFloat(rewardSlab.max_amount),
            percentage:         parseFloat(rewardSlab.percentage),
            reward_amount:      parseFloat(rewardSlab.reward_amount || 0),
            self_target_amount: parseFloat(rewardSlab.self_target_amount || 0)
          } : (totalSlab ? {
            id:                 totalSlab.id,
            slab_number:        totalSlab.slab_number,
            min_amount:         parseFloat(totalSlab.min_amount),
            max_amount:         parseFloat(totalSlab.max_amount),
            percentage:         parseFloat(totalSlab.percentage),
            reward_amount:      parseFloat(totalSlab.reward_amount || 0),
            self_target_amount: parseFloat(totalSlab.self_target_amount || 0)
          } : null),
          self_target_achieved: selfTargetAchieved,
          eligible_reward:      eligibleReward,
          reward_already_paid:  rewardAlreadyPaid
        },
        slab_reward: {
          slab: rewardSlab ? {
            id: rewardSlab.id,
            slab_number: rewardSlab.slab_number,
            reward_amount: parseFloat(rewardSlab.reward_amount || 0)
          } : null,
          eligible: selfTargetAchieved && !rewardAlreadyPaid,
          already_paid: rewardAlreadyPaid,
          amount: eligibleReward
        }
      }
    });
  } catch (error) { next(error); }
};

// @desc Live calculation preview for Accounts New/Edit Statement
// @route POST /api/payout-statements/preview
const previewPayoutStatement = async (req, res, next) => {
  try {
    const {
      associate_id,
      payment_date,
      self_business,
      team_business,
      effective_commission_percent,
      differential_commission,
      other_earnings,
      tds_percent,
      commission_ids
    } = req.body;

    let assoc = null;
    let sponsor = null;
    if (associate_id) {
      assoc = await User.findOne({
        where: { id: associate_id },
        attributes: ['id', 'name', 'login_id', 'phone', 'commission_percent', 'referral_commission_percent', 'referred_by'],
        include: [{ model: User, as: 'referrer', attributes: ['id', 'name', 'login_id', 'phone'] }]
      });
      sponsor = assoc?.referrer || (assoc?.referred_by ? await User.findByPk(assoc.referred_by, { attributes: ['id', 'name', 'login_id', 'phone'] }) : null);
    }

    const selfBiz = parseFloat(self_business) || 0;
    const teamBiz = parseFloat(team_business) || 0;
    const totalBiz = round2(selfBiz + teamBiz);

    const totalSlab = await findSlab(totalBiz);
    const slabPct = totalSlab ? parseFloat(totalSlab.percentage) : 0;

    const effPct = (effective_commission_percent !== undefined && effective_commission_percent !== '')
      ? parseFloat(effective_commission_percent)
      : (assoc ? parseFloat(assoc.commission_percent || 0) : slabPct);

    // Exact Self-Sale Reward Formula
    const { slab: rewardSlab, selfTargetAchieved, selfTargetAmount, rewardAmount } = await findRewardSlab(selfBiz);
    const rewardAlreadyPaid = assoc ? await isRewardAlreadyPaid(assoc.id, rewardSlab?.id) : false;
    const eligibleReward = (selfTargetAchieved && !rewardAlreadyPaid) ? rewardAmount : 0;

    let teamDiff = (differential_commission !== undefined && differential_commission !== '')
      ? parseFloat(differential_commission)
      : 0;

    // If commission_ids provided and teamDiff not set, compute from selected entries
    if ((differential_commission === undefined || differential_commission === '') && Array.isArray(commission_ids) && commission_ids.length && assoc) {
      const rows = await Commission.findAll({
        where: { id: { [Op.in]: commission_ids.map(Number) }, user_id: assoc.id }
      });
      teamDiff = round2(rows.reduce((sum, r) => {
        if (Number(r.level) > 0) {
          const rem = Math.max(0, parseFloat(r.amount) - parseFloat(r.paid_amount || 0));
          return sum + rem;
        }
        return sum;
      }, 0));
    }

    const otherEarn = parseFloat(other_earnings) || 0;
    const tdsPct = (tds_percent !== undefined && tds_percent !== '') ? parseFloat(tds_percent) : 5;

    // Payout Formula:
    // Gross = Eligible Team Differential Commission + Total Reward + Other Authorized Components
    // Self Commission = ₹0
    // Processing fee = 0
    const grossPayout = round2(teamDiff + eligibleReward + otherEarn);
    const tdsAmount = round2(grossPayout * tdsPct / 100);
    const netPayable = round2(grossPayout - tdsAmount);

    const applicableSlab = rewardSlab || totalSlab;

    res.json({
      success: true,
      data: {
        associate: assoc ? {
          id: assoc.id,
          name: assoc.name,
          login_id: assoc.login_id,
          phone: assoc.phone,
          master_commission_percent: parseFloat(assoc.commission_percent || 0),
          sponsor: sponsor ? {
            id: sponsor.id,
            name: sponsor.name,
            login_id: sponsor.login_id
          } : null
        } : null,
        self_business: round2(selfBiz),
        team_business: round2(teamBiz),
        total_business: totalBiz,
        slab: applicableSlab ? {
          id: applicableSlab.id,
          slab_number: applicableSlab.slab_number,
          min_amount: parseFloat(applicableSlab.min_amount),
          max_amount: parseFloat(applicableSlab.max_amount),
          percentage: parseFloat(applicableSlab.percentage),
          reward_amount: parseFloat(applicableSlab.reward_amount || 0),
          self_target_amount: parseFloat(applicableSlab.self_target_amount || 0)
        } : null,
        slab_percent: slabPct,
        effective_commission_percent: effPct,
        self_target_amount: selfTargetAmount,
        self_target_achieved: selfTargetAchieved,
        reward_already_paid: rewardAlreadyPaid,
        self_commission: 0,
        differential_commission: round2(teamDiff),
        slab_reward: eligibleReward,
        other_earnings: round2(otherEarn),
        gross_payout: grossPayout,
        tds_percent: tdsPct,
        tds_amount: tdsAmount,
        processing_percent: 0,
        processing_amount: 0,
        net_payable: netPayable
      }
    });
  } catch (error) { next(error); }
};

// @desc Create payout statement = Generate statement (Accounts/Admin)
// Default status: 'pending' (generating a statement does NOT mark it as paid)
// @route POST /api/payout-statements
const createPayoutStatement = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      associate_id,
      payment_date,
      commission_ids,
      self_business,
      team_business,
      differential_commission,
      effective_commission_percent,
      other_earnings,
      tds_percent,
      notes,
      status: requestedStatus
    } = req.body;

    const assoc = await User.findOne({ where: { id: associate_id, role: 'associate' }, transaction: t });
    if (!assoc) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Associate not found' });
    }

    const wanted = Array.isArray(commission_ids) && commission_ids.length ? commission_ids.map(Number) : null;
    let payable = [];
    if (wanted) {
      const rows = await Commission.findAll({
        where: {
          user_id: assoc.id,
          status: { [Op.in]: ['pending', 'approved', 'partial', 'credited'] },
          id: { [Op.in]: wanted }
        },
        transaction: t, lock: t.LOCK.UPDATE, order: [['id', 'ASC']]
      });
      payable = rows.filter(c => round2(parseFloat(c.amount) - parseFloat(c.paid_amount || 0)) > 0);
      if (payable.length !== wanted.length) {
        await t.rollback();
        return res.status(409).json({ success: false, message: 'One or more selected commission entries are not payable (already settled or changed). Reload and try again.' });
      }
    } else {
      const rows = await Commission.findAll({
        where: {
          user_id: assoc.id,
          status: { [Op.in]: ['pending', 'approved', 'partial', 'credited'] }
        },
        transaction: t, lock: t.LOCK.UPDATE, order: [['id', 'ASC']]
      });
      payable = rows.filter(c => round2(parseFloat(c.amount) - parseFloat(c.paid_amount || 0)) > 0);
    }

    const hasManualFigures = (self_business !== undefined && self_business !== '') ||
                             (team_business !== undefined && team_business !== '') ||
                             (differential_commission !== undefined && differential_commission !== '');
    if (!payable.length && !hasManualFigures) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'No payable commission entries or business amounts to settle for this associate.' });
    }

    const tdsPct = tds_percent !== undefined && tds_percent !== '' ? parseFloat(tds_percent) : 5;
    if (tdsPct < 0 || tdsPct > 100) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid TDS percentage' });
    }

    const pay = payment_date ? new Date(payment_date) : new Date();

    let selfBiz = (self_business !== undefined && self_business !== '') ? parseFloat(self_business) : 0;
    let teamBiz = (team_business !== undefined && team_business !== '') ? parseFloat(team_business) : 0;
    let differential = (differential_commission !== undefined && differential_commission !== '') ? parseFloat(differential_commission) : 0;

    // If differential was not provided manually, calculate from payable downline entries
    if ((differential_commission === undefined || differential_commission === '') && payable.length > 0) {
      differential = round2(payable.reduce((acc, c) => {
        if (Number(c.level) > 0) {
          const rem = Math.max(0, parseFloat(c.amount) - parseFloat(c.paid_amount || 0));
          return acc + rem;
        }
        return acc;
      }, 0));
    }

    const totalBiz = round2(selfBiz + teamBiz);
    const totalSlab = await findSlab(totalBiz);
    const slabPct = totalSlab ? parseFloat(totalSlab.percentage) : 0;

    const effPct = (effective_commission_percent !== undefined && effective_commission_percent !== '')
      ? parseFloat(effective_commission_percent)
      : (assoc.commission_percent !== null ? parseFloat(assoc.commission_percent) : slabPct);

    // Exact Self-Sale Reward Formula
    const { slab: rewardSlab, selfTargetAchieved, selfTargetAmount, rewardAmount } = await findRewardSlab(selfBiz);
    const rewardAlreadyPaid = await isRewardAlreadyPaid(assoc.id, rewardSlab?.id);
    const eligibleReward = (selfTargetAchieved && !rewardAlreadyPaid) ? rewardAmount : 0;
    const otherEarn = parseFloat(other_earnings) || 0;

    // Payout Formula: Gross = Team Differential Commission + Total Reward + Other Authorized Components
    // Self Commission = ₹0
    const gross = round2(differential + eligibleReward + otherEarn);
    const tdsAmount = round2(gross * tdsPct / 100);
    const net = round2(gross - tdsAmount);

    const applicableSlab = rewardSlab || totalSlab;
    const finalStatus = requestedStatus || 'pending';

    const statement = await PayoutStatement.create({
      associate_id: assoc.id,
      created_by: req.user.id,
      payment_date: pay,
      self_business: round2(selfBiz),
      team_business: round2(teamBiz),
      total_business: totalBiz,
      slab_id: applicableSlab?.id || null,
      slab_percent: slabPct,
      effective_commission_percent: effPct,
      reward_amount: eligibleReward,
      self_target_amount: selfTargetAmount,
      self_target_achieved: selfTargetAchieved,
      self_deposit: 0, // ALWAYS ₹0
      team_deposit: round2(differential),
      total_amount: gross,
      tds_percent: tdsPct,
      tds_amount: tdsAmount,
      processing_percent: 0,
      processing_amount: 0,
      net_payable: net,
      notes: notes || null,
      status: finalStatus
    }, { transaction: t });

    const payoutRef = `PS-${statement.id}`;
    const settled = [];

    // Only mark ledger entries paid and credit wallet if status is 'paid'
    if (finalStatus === 'paid') {
      if (payable.length > 0) {
        for (const c of payable) {
          const remaining = round2(parseFloat(c.amount) - parseFloat(c.paid_amount || 0));
          await CommissionPayment.create({
            payment_ref: `${payoutRef}-C${c.id}`,
            commission_id: c.id,
            associate_id: c.user_id,
            transaction_id: c.transaction_id,
            amount: remaining,
            payment_method: 'Payout Statement',
            payment_reference: payoutRef,
            payment_date: pay,
            recorded_by: req.user.id,
            status: 'completed',
            remarks: `Settled via payout statement ${payoutRef}`
          }, { transaction: t });

          const before = { paid_amount: c.paid_amount, status: c.status };
          c.paid_amount      = round2(parseFloat(c.paid_amount || 0) + remaining);
          c.remaining_amount = 0;
          c.status           = 'paid';
          c.paid_at          = new Date();
          await c.save({ transaction: t });
          settled.push({ commission_id: c.id, amount: remaining, before });
        }
      }

      if (eligibleReward > 0 && rewardSlab) {
        const [existingRewardLog] = await RewardLog.findOrCreate({
          where: { user_id: assoc.id, slab_id: rewardSlab.id },
          defaults: {
            user_id: assoc.id,
            slab_id: rewardSlab.id,
            reward_amount: eligibleReward,
            status: 'paid'
          },
          transaction: t
        });
        if (existingRewardLog && existingRewardLog.status !== 'paid') {
          existingRewardLog.status = 'paid';
          await existingRewardLog.save({ transaction: t });
        }
      }

      await creditWallet(assoc.id, net, `Payout statement ${payoutRef} (gross ₹${gross}, TDS ₹${tdsAmount})`, t);
    }

    await AuditLog.create({
      user_id:     req.user.id,
      action:      'PAYOUT_STATEMENT_CREATE',
      entity_type: 'payout_statement',
      entity_id:   statement.id,
      new_values:  JSON.stringify({
        status: finalStatus, gross, tds: tdsAmount, net,
        self_target_achieved: selfTargetAchieved, eligible_reward: eligibleReward,
        commission_ids: payable.map(c => c.id)
      }),
      notes:       `Generated payout statement ${payoutRef} for associate #${assoc.id} (${assoc.login_id})`,
      ip_address:  req.ip
    }, { transaction: t });

    await t.commit();

    const full = await PayoutStatement.findByPk(statement.id, {
      include: [
        {
          model: User,
          as: 'associate',
          attributes: ['id', 'name', 'phone', 'login_id', 'commission_percent', 'referred_by'],
          include: [{ model: User, as: 'referrer', attributes: ['id', 'name', 'login_id', 'phone'] }]
        },
        { model: Slab, as: 'slab' }
      ]
    });

    res.status(201).json({
      success: true,
      data: full,
      payout_reference: payoutRef,
      settled_commission_ids: settled.map(s => s.commission_id)
    });
  } catch (error) {
    try { await t.rollback(); } catch (_) {}
    next(error);
  }
};

// @desc Get all payout statements (Admin/Accounts = all, Associate = their own)
// @route GET /api/payout-statements
const getPayoutStatements = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'associate') where.associate_id = req.user.id;
    if (req.query.associate_id) where.associate_id = req.query.associate_id;

    const statements = await PayoutStatement.findAll({
      where,
      include: [
        {
          model: User,
          as: 'associate',
          attributes: ['id', 'name', 'phone', 'login_id', 'commission_percent', 'referred_by'],
          include: [{ model: User, as: 'referrer', attributes: ['id', 'name', 'login_id', 'phone'] }]
        },
        { model: User, as: 'creator', attributes: ['id', 'name', 'role'] },
        { model: Slab, as: 'slab' }
      ],
      order: [['payment_date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({ success: true, data: statements });
  } catch (error) { next(error); }
};

// @desc Get single payout statement
// @route GET /api/payout-statements/:id
const getPayoutStatement = async (req, res, next) => {
  try {
    const stmt = await PayoutStatement.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'associate',
          attributes: ['id', 'name', 'phone', 'login_id', 'commission_percent', 'referred_by'],
          include: [{ model: User, as: 'referrer', attributes: ['id', 'name', 'login_id', 'phone'] }]
        },
        { model: User, as: 'creator', attributes: ['id', 'name', 'role'] },
        { model: Slab, as: 'slab' }
      ]
    });
    if (!stmt) return res.status(404).json({ success: false, message: 'Statement not found' });
    if (req.user.role === 'associate' && stmt.associate_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, data: stmt });
  } catch (error) { next(error); }
};

// Helper: check if statement settled commission ledger entries
const isLedgerSettled = async (id) => !!(await CommissionPayment.findOne({ where: { payment_reference: `PS-${id}` } }));

// @desc Update payout statement (Accounts)
// @route PUT /api/payout-statements/:id
const updatePayoutStatement = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const stmt = await PayoutStatement.findByPk(req.params.id, { transaction: t });
    if (!stmt) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Statement not found' });
    }
    if (stmt.status === 'paid') {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: 'This statement is already paid and cannot be edited. Use an auditable correction instead.'
      });
    }

    const merged = { ...stmt.toJSON(), ...req.body };
    const selfBiz = parseFloat(merged.self_business) || 0;
    const teamBiz = parseFloat(merged.team_business) || 0;
    const totalBusiness = round2(selfBiz + teamBiz);

    const totalSlab = await findSlab(totalBusiness);
    const slabPct = totalSlab?.percentage || stmt.slab_percent;

    const effPct = req.body.effective_commission_percent !== undefined && req.body.effective_commission_percent !== ''
      ? parseFloat(req.body.effective_commission_percent)
      : (stmt.effective_commission_percent || slabPct);

    // Exact Self-Sale Reward Formula
    const { slab: rewardSlab, selfTargetAchieved, selfTargetAmount, rewardAmount } = await findRewardSlab(selfBiz);
    const rewardAlreadyPaid = await isRewardAlreadyPaid(stmt.associate_id, rewardSlab?.id);
    const eligibleReward = (selfTargetAchieved && !rewardAlreadyPaid) ? rewardAmount : 0;

    const teamDifferential = parseFloat(merged.team_deposit || merged.differential_commission) || 0;
    const otherEarn = parseFloat(merged.other_earnings) || 0;
    const gross = round2(teamDifferential + eligibleReward + otherEarn);
    const tdsPercent = merged.tds_percent !== undefined && merged.tds_percent !== '' ? parseFloat(merged.tds_percent) : 5;
    const tdsAmount = round2(gross * tdsPercent / 100);
    // Zero processing fee
    const net = round2(gross - tdsAmount);

    const applicableSlab = rewardSlab || totalSlab;
    const nextStatus = merged.status || stmt.status;

    // If status transitioned to 'paid', complete settlement
    if (nextStatus === 'paid' && stmt.status !== 'paid') {
      const payoutRef = `PS-${stmt.id}`;
      const payable = await Commission.findAll({
        where: {
          user_id: stmt.associate_id,
          status: { [Op.in]: ['pending', 'approved', 'partial', 'credited'] }
        },
        transaction: t, lock: t.LOCK.UPDATE
      });
      for (const c of payable) {
        const remaining = round2(parseFloat(c.amount) - parseFloat(c.paid_amount || 0));
        if (remaining > 0) {
          await CommissionPayment.create({
            payment_ref: `${payoutRef}-C${c.id}`,
            commission_id: c.id,
            associate_id: c.user_id,
            transaction_id: c.transaction_id,
            amount: remaining,
            payment_method: 'Payout Statement',
            payment_reference: payoutRef,
            payment_date: stmt.payment_date,
            recorded_by: req.user.id,
            status: 'completed',
            remarks: `Settled via payout statement ${payoutRef}`
          }, { transaction: t });

          c.paid_amount = round2(parseFloat(c.paid_amount || 0) + remaining);
          c.remaining_amount = 0;
          c.status = 'paid';
          c.paid_at = new Date();
          await c.save({ transaction: t });
        }
      }

      if (eligibleReward > 0 && rewardSlab) {
        const [existingRewardLog] = await RewardLog.findOrCreate({
          where: { user_id: stmt.associate_id, slab_id: rewardSlab.id },
          defaults: {
            user_id: stmt.associate_id,
            slab_id: rewardSlab.id,
            reward_amount: eligibleReward,
            status: 'paid'
          },
          transaction: t
        });
        if (existingRewardLog && existingRewardLog.status !== 'paid') {
          existingRewardLog.status = 'paid';
          await existingRewardLog.save({ transaction: t });
        }
      }

      await creditWallet(stmt.associate_id, net, `Payout statement ${payoutRef} (gross ₹${gross}, TDS ₹${tdsAmount})`, t);
    }

    await stmt.update({
      payment_date:                 merged.payment_date || stmt.payment_date,
      self_business:                round2(selfBiz),
      team_business:                round2(teamBiz),
      total_business:               totalBusiness,
      slab_id:                      applicableSlab?.id || stmt.slab_id,
      slab_percent:                 slabPct,
      effective_commission_percent: effPct,
      reward_amount:                eligibleReward,
      self_target_amount:           selfTargetAmount,
      self_target_achieved:         selfTargetAchieved,
      self_deposit:                 0, // ALWAYS ₹0
      team_deposit:                 round2(teamDifferential),
      total_amount:                 gross,
      tds_percent:                  tdsPercent,
      tds_amount:                   tdsAmount,
      processing_percent:           0,
      processing_amount:            0,
      net_payable:                  net,
      notes:                        merged.notes !== undefined ? merged.notes : stmt.notes,
      status:                       nextStatus
    }, { transaction: t });

    await AuditLog.create({
      user_id:     req.user.id,
      action:      'PAYOUT_STATEMENT_UPDATE',
      entity_type: 'payout_statement',
      entity_id:   stmt.id,
      new_values:  JSON.stringify({ status: nextStatus, gross, tds: tdsAmount, net }),
      notes:       `Updated payout statement PS-${stmt.id}`,
      ip_address:  req.ip
    }, { transaction: t });

    await t.commit();

    const full = await PayoutStatement.findByPk(stmt.id, {
      include: [
        {
          model: User,
          as: 'associate',
          attributes: ['id', 'name', 'phone', 'login_id', 'commission_percent', 'referred_by'],
          include: [{ model: User, as: 'referrer', attributes: ['id', 'name', 'login_id', 'phone'] }]
        },
        { model: Slab, as: 'slab' }
      ]
    });

    res.json({ success: true, data: full });
  } catch (error) {
    try { await t.rollback(); } catch (_) {}
    next(error);
  }
};

// @desc Delete payout statement
// @route DELETE /api/payout-statements/:id
const deletePayoutStatement = async (req, res, next) => {
  try {
    const stmt = await PayoutStatement.findByPk(req.params.id);
    if (!stmt) return res.status(404).json({ success: false, message: 'Statement not found' });
    if (stmt.status === 'paid' || await isLedgerSettled(stmt.id)) {
      return res.status(409).json({ success: false, message: 'This statement is paid / settled and cannot be deleted.' });
    }
    await stmt.destroy();
    res.json({ success: true, message: 'Statement deleted' });
  } catch (error) { next(error); }
};

// @desc Get all associates list (for Accounts dropdown)
// @route GET /api/payout-statements/associates
const getAssociatesList = async (req, res, next) => {
  try {
    const associates = await User.findAll({
      where: { role: 'associate', status: 'active' },
      attributes: ['id', 'name', 'login_id', 'phone', 'referral_commission_percent', 'commission_percent', 'referred_by'],
      include: [
        { model: User, as: 'referrer', attributes: ['id', 'name', 'login_id', 'phone'] }
      ],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: associates });
  } catch (error) { next(error); }
};

module.exports = {
  findSlab,
  findRewardSlab,
  isRewardAlreadyPaid,
  calculatePayout,
  slabLookup,
  getAssociateLedger,
  previewPayoutStatement,
  createPayoutStatement,
  getPayoutStatements,
  getPayoutStatement,
  updatePayoutStatement,
  deletePayoutStatement,
  getAssociatesList
};
