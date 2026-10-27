/**
 * ASSOCIATE CONTROLLER
 * Associate apna network build karta hai, deals me madad karta hai,
 * aur commission kamata hai. Har function me ownership check hai —
 * associate sirf apna hi data dekh/manage kar sakta hai.
 */
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const {
  User, Plot, Transaction, Commission, Wallet, WalletTransaction, Notification,
  Complaint, RewardLog, Payment, Slab, BookingForm, CommissionPayment, Project
} = require('../models');
const generateReferralCode = require('../utils/generateReferralCode');
const { fetchTree, buildTree } = require('./networkController');

// @desc  Associate's own dashboard stats
// @route GET /api/associate/dashboard-stats
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Direct team count (associates only)
    const myTeamCount = await User.count({
      where: {
        referred_by: userId,
        role: 'associate',
        status: { [Op.ne]: 'deleted' }
      }
    });

    // Fetch all team members recursively for team business calc
    const { fetchTree } = require('./networkController');
    const allDescendants = await fetchTree(userId);
    const descendantIds = allDescendants.map(u => u.id).filter(id => id !== userId);

    // Self business: deals I personally closed (customer sales only, not acquisitions)
    const selfTransactions = await Transaction.findAll({
      where: {
        [Op.or]: [{ seller_associate_id: userId }, { buyer_associate_id: userId }],
        type: 'sale',   // FIX: exclude company plot-acquisition transactions
        status: 'completed'
      }
    });
    const selfBusiness = selfTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    // Team business: deals by anyone below me in network (customer sales only)
    let teamBusiness = 0;
    if (descendantIds.length > 0) {
      const teamTransactions = await Transaction.findAll({
        where: {
          [Op.or]: [
            { seller_associate_id: { [Op.in]: descendantIds } },
            { buyer_associate_id: { [Op.in]: descendantIds } }
          ],
          type: 'sale',   // FIX: exclude company plot-acquisition transactions
          status: 'completed'
        }
      });
      teamBusiness = teamTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    }

    const dealsAsSellerAssoc = await Transaction.count({ where: { seller_associate_id: userId } });
    const dealsAsBuyerAssoc = await Transaction.count({ where: { buyer_associate_id: userId } });

    // Level-wise downline breakdown
    const levelCounts = {};
    allDescendants.forEach(u => {
      if (u.id !== userId) {
        const lvl = u.level || 1;
        levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
      }
    });

    // Booking requests stats
    const totalBookings = await BookingForm.count({ where: { associate_id: userId } });
    const pendingBookings = await BookingForm.count({ where: { associate_id: userId, status: 'pending' } });
    const approvedBookings = await BookingForm.count({ where: { associate_id: userId, status: 'approved' } });
    const completedSales = dealsAsSellerAssoc + dealsAsBuyerAssoc;

    // Available plot inventory count
    const availablePlotsCount = await Plot.count({ where: { status: 'available' } });

    // Financial aggregates for personal deals
    const paymentsCollected = selfTransactions.reduce((sum, t) => sum + parseFloat(t.paid_amount || 0), 0);
    const outstandingBalance = selfTransactions.reduce((sum, t) => sum + Math.max(0, parseFloat(t.amount || 0) - parseFloat(t.paid_amount || 0)), 0);

    // Commission summary
    const totalCommissionEarned = await Commission.sum('amount', { where: { user_id: userId } }) || 0;
    const pendingCommission = await Commission.sum('amount', { where: { user_id: userId, status: 'pending' } }) || 0;
    const paidCommission = await Commission.sum('paid_amount', { where: { user_id: userId } }) || 0;
    const approvedCommission = await Commission.sum('amount', {
      where: { user_id: userId, status: ['approved', 'credited', 'paid'] }
    }) || 0;

    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) wallet = await Wallet.create({ user_id: userId, balance: 0 });

    const unreadNotifications = await Notification.count({ where: { user_id: userId, is_read: false } });

    // Get sponsor (referred_by) info
    let sponsoredBy = null;
    if (req.user.referred_by) {
      const sponsor = await User.findByPk(req.user.referred_by, {
        attributes: ['id', 'name', 'login_id', 'phone']
      });
      if (sponsor) {
        sponsoredBy = { id: sponsor.id, name: sponsor.name, login_id: sponsor.login_id, phone: sponsor.phone };
      }
    }

    // Recent activities (5 recent bookings or transactions)
    const recentBookings = await BookingForm.findAll({
      where: { associate_id: userId },
      attributes: ['id', 'booking_ref', 'plot_code', 'applicant_name', 'total_plot_price', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    // Self‑sale slab reward calculation (Formula: only qualifying personal plot sales)
    const allSlabs = await Slab.findAll({
      order: [['self_target_amount', 'ASC']]
    });

    // Highest slab achieved purely through personal self sales
    const earnedSlab = allSlabs.slice().reverse().find(s => 
      parseFloat(s.self_target_amount || 0) > 0 && selfBusiness >= parseFloat(s.self_target_amount)
    ) || null;

    // Next target slab to reach for self-sale reward progression
    const nextTargetSlab = allSlabs.find(s => 
      parseFloat(s.self_target_amount || 0) > selfBusiness
    ) || earnedSlab;

    const earnedRewardAmount = earnedSlab ? parseFloat(earnedSlab.reward_amount || 0) : 0;
    const rewardStatus = earnedRewardAmount > 0 
      ? 'Earned' 
      : (selfBusiness > 0 ? 'Pending' : 'Not Eligible');

    const applicableTargetAmount = nextTargetSlab 
      ? parseFloat(nextTargetSlab.self_target_amount || 0) 
      : (earnedSlab ? parseFloat(earnedSlab.self_target_amount || 0) : 0);
    const remainingAmount = Math.max(0, applicableTargetAmount - selfBusiness);
    const progressPercent = applicableTargetAmount > 0 
      ? Math.min(100, Math.round((selfBusiness / applicableTargetAmount) * 100)) 
      : 0;

    // Log reward if earned and not already logged (prevents duplicate reward logs)
    if (earnedRewardAmount > 0 && earnedSlab) {
      const existingLog = await RewardLog.findOne({
        where: { user_id: userId, slab_id: earnedSlab.id }
      });
      if (!existingLog) {
        await RewardLog.create({
          user_id: userId,
          slab_id: earnedSlab.id,
          reward_amount: earnedRewardAmount,
          status: 'pending'
        });
      }
    }

    const loggedRewardsSum = await RewardLog.sum('reward_amount', { where: { user_id: userId } }) || 0;
    const totalRewardEarned = Math.max(earnedRewardAmount, parseFloat(loggedRewardsSum));

    const selfReward = {
      slab_number: earnedSlab ? earnedSlab.slab_number : (nextTargetSlab ? nextTargetSlab.slab_number : 1),
      next_slab_number: nextTargetSlab ? nextTargetSlab.slab_number : null,
      reward_amount: earnedRewardAmount,
      total_reward: totalRewardEarned,
      status: rewardStatus,
      self_sales: selfBusiness,
      self_target_amount: applicableTargetAmount,
      completed_amount: selfBusiness,
      remaining_amount: remainingAmount,
      progress_percent: progressPercent,
      potential_reward: nextTargetSlab ? parseFloat(nextTargetSlab.reward_amount || 0) : earnedRewardAmount
    };

    // Total Earnings = Existing Eligible Commission + Earned Self-Sale Reward
    const totalEarnings = parseFloat(totalCommissionEarned) + totalRewardEarned;

    res.json({
      success: true,
      data: {
        myTeamCount,
        totalTeamCount: descendantIds.length,
        levelCounts,
        availablePlotsCount,
        totalBookings,
        pendingBookings,
        approvedBookings,
        completedSales,
        totalDeals: completedSales,
        selfBusiness,
        teamBusiness,
        totalBusiness: selfBusiness + teamBusiness,
        totalSalesValue: selfBusiness,
        paymentsCollected,
        outstandingBalance,
        totalCommissionEarned,
        pendingCommission,
        approvedCommission,
        paidCommission,
        walletBalance: wallet.balance,
        unreadNotifications,
        referralCode: req.user.referral_code,
        associateId: req.user.login_id,
        referredById: sponsoredBy ? sponsoredBy.login_id : null,
        referredByName: sponsoredBy ? sponsoredBy.name : null,
        sponsoredBy,
        recentBookings,
        selfReward,
        totalEarnings,
        commissions: {
          total: totalCommissionEarned,
          pending: pendingCommission,
          approved: approvedCommission,
          paid: paidCommission
        },
        profile: {
          id: req.user.id,
          login_id: req.user.login_id,
          associateId: req.user.login_id,
          referredById: sponsoredBy ? sponsoredBy.login_id : null,
          referredByName: sponsoredBy ? sponsoredBy.name : null,
          referred_by: req.user.referred_by,
          sponsoredBy,
          name: req.user.name,
          phone: req.user.phone,
          email: req.user.email,
          address: req.user.address,
          pan_number: req.user.pan_number,
          aadhar_number: req.user.aadhar_number,
          referral_commission_percent: req.user.referral_commission_percent,
          commission_percent: req.user.commission_percent,
          kyc_status: req.user.kyc_status,
          last_login_at: req.user.last_login_at,
          member_since: req.user.createdAt
        }
      }
    });
  } catch (error) { next(error); }
};


// @desc  Get MY team (associates/clients I directly referred)
// @route GET /api/associate/my-team
const getMyTeam = async (req, res, next) => {
  try {
    const team = await User.findAll({
      where: {
        referred_by: req.user.id,
        role: 'associate',
        status: { [Op.ne]: 'deleted' }
      },
      attributes: { exclude: ['password'] },
      include: [
        { model: User, as: 'referrer', attributes: ['id', 'name', 'login_id', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: team.length, data: team });
  } catch (error) { next(error); }
};

// @desc  Get MY commission history & authoritative balances — self-sale reward + downline differential
// @route GET /api/associate/commissions
const getMyCommissions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { syncSelfSaleReward } = require('../services/commissionEngine');

    // ── 1. DOWNLINE DIFFERENTIAL COMMISSIONS (level > 0 only) ─────────────────
    // Self-sale (level 0) never generates a payable commission row; those are routed through RewardLog.
    const commissions = await Commission.findAll({
      where: { user_id: userId, level: { [Op.gt]: 0 } },
      include: [
        {
          model: Transaction,
          as: 'transaction',
          include: [
            { model: Plot, as: 'plot', attributes: ['id', 'plot_code', 'plot_number', 'title', 'location', 'size_sqft', 'basic_price', 'price'] },
            { model: User, as: 'buyer', attributes: ['id', 'name', 'phone'] },
            { model: User, as: 'sellerAssociate', attributes: ['id', 'name', 'login_id'] }
          ]
        },
        { model: User, as: 'downlineAssociate', attributes: ['id', 'name', 'login_id'] },
        {
          model: CommissionPayment,
          as: 'payments',
          include: [{ model: User, as: 'recordedByUser', attributes: ['id', 'name'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // ── 2. PERSONAL SALES (only this associate as seller, completed, non-cancelled) ──
    const personalSales = await Transaction.findAll({
      where: { seller_associate_id: userId, status: 'completed' },
      include: [
        { model: Plot, as: 'plot', attributes: ['id', 'plot_code', 'plot_number', 'title', 'location'] },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    const selfSalesTotal = Math.round(
      (personalSales.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) + Number.EPSILON) * 100
    ) / 100;

    // ── 3. SYNC SELF-SALE SLAB REWARD (idempotent — no duplicate logs) ─────────
    const rewardSync = await syncSelfSaleReward(userId);

    // ── 4. FETCH ALL REWARD LOGS for this associate (with Slab info) ─────────
    const rewardLogs = await RewardLog.findAll({
      where: { user_id: userId },
      include: [{ model: Slab, as: 'slab' }],
      order: [['createdAt', 'DESC']]
    });

    // ── 5. AUTHORITATIVE SUMMARY CALCULATIONS ────────────────────────────────
    const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

    // Differential commission amounts
    const totalDifferentialCommission = round2(
      commissions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
    );
    const paidDifferential = round2(
      commissions.reduce((sum, c) => sum + parseFloat(c.paid_amount || 0), 0)
    );

    // Slab rewards: only the highest qualifying slab earned (non-cumulative)
    // Use the earnedSlab from syncSelfSaleReward to get authoritative highest-slab reward
    const highestRewardLog = rewardLogs.find(rl =>
      rl.slab_id === rewardSync.earnedSlab?.id
    ) || rewardLogs[0] || null;

    const totalSlabRewards = highestRewardLog
      ? round2(parseFloat(highestRewardLog.reward_amount || 0))
      : 0;

    const paidSlabRewards = round2(
      rewardLogs
        .filter(rl => rl.status === 'paid')
        .reduce((sum, rl) => sum + parseFloat(rl.reward_amount || 0), 0)
    );

    // Totals
    const totalEarnings = round2(totalDifferentialCommission + totalSlabRewards);
    const totalPaid = round2(paidDifferential + paidSlabRewards);
    const remainingPayable = round2(Math.max(0, totalEarnings - totalPaid));

    // Slab progress for UI
    const allSlabs = await Slab.findAll({ order: [['self_target_amount', 'ASC']] });
    const earnedSlab = rewardSync.earnedSlab || null;
    const nextTargetSlab = rewardSync.nextTargetSlab || null;
    const applicableTarget = nextTargetSlab
      ? parseFloat(nextTargetSlab.self_target_amount || 0)
      : (earnedSlab ? parseFloat(earnedSlab.self_target_amount || 0) : 0);
    const remainingToNextSlab = round2(Math.max(0, applicableTarget - selfSalesTotal));
    const progressPercent = applicableTarget > 0
      ? Math.min(100, Math.round((selfSalesTotal / applicableTarget) * 100))
      : (earnedSlab ? 100 : 0);

    // Commission pending / approved / reversed breakdown
    const pendingAmount = round2(
      commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
    );
    const approvedAmount = round2(
      commissions.filter(c => ['approved', 'credited', 'partial', 'paid'].includes(c.status))
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
    );
    const reversedAmount = round2(
      commissions.filter(c => c.status === 'reversed').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
    );

    res.json({
      success: true,
      summary: {
        // ── Core 5-part payout breakdown (Rule A + Rule B) ────────────────
        totalDifferentialCommission,   // sum of eligible downline differential commissions
        totalSlabRewards,              // highest qualifying slab reward (personal sales only)
        totalEarnings,                 // totalDifferentialCommission + totalSlabRewards
        totalPaid,                     // actual paid differential + paid rewards
        remainingPayable,              // totalEarnings - totalPaid
        // ── Commission sub-breakdown ──────────────────────────────────────
        pendingAmount,
        approvedAmount,
        reversedAmount,
        paidDifferential,
        paidSlabRewards,
        commissionsCount: commissions.length,
        // ── Legacy fields (kept for backward compatibility) ───────────────
        totalEarned: totalEarnings,
        totalPaid,
      },
      data: {
        // Downline differential commissions (level > 0)
        commissions,
        // Personal / self-sale transactions
        personalSales: personalSales.map(t => ({
          id: t.id,
          transaction_id: t.id,
          plot: t.plot,
          buyer: t.buyer,
          amount: parseFloat(t.amount || 0),
          paid_amount: parseFloat(t.paid_amount || 0),
          status: t.status,
          deal_date: t.deal_date,
          createdAt: t.createdAt,
          earning_type: 'self_sale',
          commission_type: 'Self-Sale (No Direct Commission)'
        })),
        // Slab reward log entries
        rewardLogs: rewardLogs.map(rl => ({
          id: rl.id,
          slab_id: rl.slab_id,
          slab: rl.slab ? {
            id: rl.slab.id,
            slab_number: rl.slab.slab_number,
            self_target_amount: parseFloat(rl.slab.self_target_amount || 0),
            reward_amount: parseFloat(rl.slab.reward_amount || 0)
          } : null,
          reward_amount: parseFloat(rl.reward_amount || 0),
          status: rl.status,
          paid_amount: rl.status === 'paid' ? parseFloat(rl.reward_amount || 0) : 0,
          remaining_amount: rl.status === 'paid' ? 0 : parseFloat(rl.reward_amount || 0),
          earning_type: 'slab_reward',
          commission_type: 'Self-Sale Slab Reward',
          createdAt: rl.createdAt
        })),
        // Slab progress for UI progress bar
        slabProgress: {
          selfSalesTotal,
          earnedSlab: earnedSlab ? {
            id: earnedSlab.id,
            slab_number: earnedSlab.slab_number,
            self_target_amount: parseFloat(earnedSlab.self_target_amount || 0),
            reward_amount: parseFloat(earnedSlab.reward_amount || 0)
          } : null,
          nextTargetSlab: nextTargetSlab ? {
            id: nextTargetSlab.id,
            slab_number: nextTargetSlab.slab_number,
            self_target_amount: parseFloat(nextTargetSlab.self_target_amount || 0),
            reward_amount: parseFloat(nextTargetSlab.reward_amount || 0)
          } : null,
          progressPercent,
          remainingToNextSlab,
          applicableTarget,
          totalSlabRewards
        }
      }
    });
  } catch (error) { next(error); }
};

// @desc  Get MY plot sales & bookings (Section 3: My Sales)
// @route GET /api/associate/sales
const getMySales = async (req, res, next) => {
  try {
    const deals = await Transaction.findAll({
      where: {
        [Op.or]: [
          { seller_associate_id: req.user.id },
          { buyer_associate_id: req.user.id }
        ]
      },
      include: [
        { model: Plot, as: 'plot' },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'phone', 'email'] },
        { model: Payment, as: 'payments' },
        { model: Commission, as: 'commissions', where: { user_id: req.user.id }, required: false }
      ],
      order: [['deal_date', 'DESC'], ['createdAt', 'DESC']]
    });

    const bookings = await BookingForm.findAll({
      where: { associate_id: req.user.id },
      include: [
        { model: Plot, as: 'plot' },
        { model: User, as: 'client', attributes: ['id', 'name', 'phone', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        deals,
        sales: deals,
        bookings,
        bookingForms: bookings
      }
    });
  } catch (error) { next(error); }
};

// @desc  Get MY wallet + transaction history
// @route GET /api/associate/wallet
const getMyWallet = async (req, res, next) => {
  try {
    let wallet = await Wallet.findOne({ where: { user_id: req.user.id } });
    if (!wallet) wallet = await Wallet.create({ user_id: req.user.id, balance: 0 });

    const transactions = await WalletTransaction.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: { balance: wallet.balance, transactions } });
  } catch (error) { next(error); }
};

// @desc  Request a withdrawal
// @route POST /api/associate/withdraw
const requestWithdrawal = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const wallet = await Wallet.findOne({ where: { user_id: req.user.id } });

    if (!wallet || parseFloat(wallet.balance) < parseFloat(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance for this withdrawal' });
    }

    const request = await WalletTransaction.create({
      user_id: req.user.id,
      type: 'withdrawal_request',
      amount,
      description: 'Withdrawal requested by associate',
      status: 'pending'
    });

    await Notification.create({
      user_id: null,
      title: 'New Withdrawal Request',
      message: `${req.user.name} requested a withdrawal of ₹${amount}.`,
      type: 'payout'
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) { next(error); }
};

// @desc  Browse plots available to promote (same marketplace as client, read-only)
// @route GET /api/associate/plots
const browsePlots = async (req, res, next) => {
  try {
    const { search, city } = req.query;
    // genuinely sellable inventory only (sold / booked / pending / rejected / under negotiation are excluded)
    const where = { status: { [Op.in]: ['available', 'approved'] } };
    if (req.query.project_id) where.project_id = req.query.project_id;
    if (city) where.city = city;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }

    const plots = await Plot.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'name'] }, { model: Project, as: 'project', attributes: ['id', 'project_id', 'name', 'location'] }],
      order: [['is_featured', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({ success: true, count: plots.length, data: plots });
  } catch (error) { next(error); }
};

// @desc  Update MY profile
// @route PUT /api/associate/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByPk(req.user.id);
    await user.update({ name: name ?? user.name, phone: phone ?? user.phone });

    const { password, ...userData } = user.toJSON();
    res.json({ success: true, data: userData });
  } catch (error) { next(error); }
};

// @desc  Change MY password
// @route PUT /api/associate/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) { next(error); }
};

// @desc  Submit KYC document
// @route POST /api/associate/kyc
const submitKyc = async (req, res, next) => {
  try {
    const { document_url } = req.body;
    const user = await User.findByPk(req.user.id);
    await user.update({ kyc_document_url: document_url, kyc_status: 'pending' });

    await Notification.create({
      user_id: null,
      title: 'New KYC Submission',
      message: `${user.name} (Associate) submitted KYC documents for review.`,
      type: 'kyc'
    });

    res.json({ success: true, message: 'KYC submitted for review', data: user });
  } catch (error) { next(error); }
};

// @desc  Get MY notifications
// @route GET /api/associate/notifications
const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    const unreadCount = await Notification.count({ where: { user_id: req.user.id, is_read: false } });
    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) { next(error); }
};

// @desc  Mark notification as read
// @route PUT /api/associate/notifications/:id/read
const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    notification.is_read = true;
    await notification.save();
    res.json({ success: true, data: notification });
  } catch (error) { next(error); }
};

// @desc  Raise a complaint
// @route POST /api/associate/complaints
const createComplaint = async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    const complaint = await Complaint.create({ user_id: req.user.id, subject, message });
    res.status(201).json({ success: true, data: complaint });
  } catch (error) { next(error); }
};

// @desc  Get MY complaints
// @route GET /api/associate/complaints
const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: complaints });
  } catch (error) { next(error); }
};


// @desc  Associate adds their OWN downline member (self-service recruitment).
//        Associate decides the % themselves — but it cannot exceed their
//        own referral_commission_percent (the % they give to THEIR upline).
// @route POST /api/associate/team
async function createTeamMember(req, res, next) {
  try {
    // SECURITY: the sponsor is ALWAYS the logged-in associate (from the JWT session).
    // Any sponsor / referred_by / commission value sent by the client is ignored.
    const { registerAssociateRecord, deliverCredentials, buildResponse, RegistrationError } = require('../services/associateRegistrationService');
    const { user, sponsor, password } = await registerAssociateRecord(req.body, req.user.id, req.user);
    const sms = await deliverCredentials(user, password);
    try {
      await Notification.create({
        user_id: null, title: 'New Team Member Added',
        message: `${req.user.name} added ${user.name} (${user.login_id}) to their team. Commission will be set by Admin.`, type: 'general'
      });
    } catch (_) { /* non-fatal */ }
    res.status(201).json(buildResponse(user, sponsor, sms, 'Associate registered successfully under you.'));
  } catch (error) {
    if (error && error.constructor && error.constructor.name === 'RegistrationError') {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

// @desc  Get MY network (tree structure)
// @route GET /api/associate/network
async function getMyNetwork(req, res, next) {
  try {
    const flatList = await fetchTree(req.user.id);
    const networkTree = buildTree(flatList, req.user.id);
    // Exclude self and ensure only associates are counted
    const totalCount = flatList.filter(u => u.id !== req.user.id && String(u.role || '').toLowerCase() === 'associate').length;
    res.json({ success: true, data: networkTree, totalCount });
  } catch (error) { next(error); }
}

// @desc  Override commission percent for a direct downline team member
// @route PUT /api/associate/team/:id/commission
async function setTeamMemberCommission(req, res, next) {
  try {
    const downlineId = req.params.id;
    const { commission_percent } = req.body;
    
    const newPercent = parseFloat(commission_percent);
    if (isNaN(newPercent) || newPercent <= 0) {
      return res.status(400).json({ success: false, message: 'Valid commission percentage is required' });
    }

    const downlineUser = await User.findOne({ where: { id: downlineId, referred_by: req.user.id } });
    if (!downlineUser) {
      return res.status(404).json({ success: false, message: 'Team member not found or not in your direct downline' });
    }

    const myPercent = parseFloat(req.user.commission_percent) || 0;
    if (newPercent > myPercent) {
      return res.status(400).json({ 
        success: false, 
        message: `Downline commission cannot exceed your own commission (${myPercent}%)` 
      });
    }

    await downlineUser.update({ 
      commission_percent: newPercent,
      commission_set_by: 'upline' 
    });

    res.json({ success: true, message: 'Commission updated successfully', data: downlineUser });
  } catch (error) { next(error); }
}

// @desc  Plots involved in MY deals (as seller or buyer associate)
// @route GET /api/associate/my-plots
async function getMyPlots(req, res, next) {
  try {
    const transactions = await Transaction.findAll({
      where: { [Op.or]: [{ seller_associate_id: req.user.id }, { buyer_associate_id: req.user.id }] },
      include: [{ model: Plot, as: 'plot' }],
      order: [['createdAt', 'DESC']]
    });
    const plots = transactions.map((t) => ({ ...t.plot?.toJSON(), deal_amount: t.amount, transaction_id: t.id, deal_status: t.status }));
    res.json({ success: true, data: plots });
  } catch (error) { next(error); }
}

// @desc  My milestone rewards (only earned when I PERSONALLY sold, not from downline)
// @route GET /api/associate/my-rewards
async function getMyRewards(req, res, next) {
  try {
    const rewards = await RewardLog.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Slab, as: 'slab' }],
      order: [['createdAt', 'DESC']]
    });
    const totalRewards = rewards.reduce((sum, r) => sum + parseFloat(r.reward_amount), 0);
    res.json({ success: true, data: rewards, totalRewards });
  } catch (error) { next(error); }
}

// @desc  Record a cash payment for a deal I'm associated with
// @route POST /api/associate/transactions/:id/payments
async function recordPaymentForDeal(req, res, next) {
  try {
    const { amount, note } = req.body;
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const isInvolved = transaction.seller_associate_id === req.user.id || transaction.buyer_associate_id === req.user.id;
    if (!isInvolved) return res.status(403).json({ success: false, message: 'You are not associated with this deal' });

    await Payment.create({ transaction_id: transaction.id, amount, recorded_by: req.user.id, note: note || null });

    const newPaidAmount = parseFloat(transaction.paid_amount) + parseFloat(amount);
    transaction.paid_amount = newPaidAmount;
    transaction.payment_status = newPaidAmount >= parseFloat(transaction.amount) ? 'paid' : 'unpaid';
    await transaction.save();

    res.status(201).json({ success: true, data: transaction });
  } catch (error) { next(error); }
}

// =========================================================================
// DOWNLINE COMMISSION TRACKING (Section 7 — Associate Panel)
// Each associate can see commissions generated by their authorized downline.
// SERVER-SIDE isolation: only descendants in their own subtree are returned.
// =========================================================================

// @desc  Get commissions for ALL associates in my downline network
// @route GET /api/associate/downline-commissions
async function getDownlineCommissions(req, res, next) {
  try {
    const userId = req.user.id;

    // Get all descendants (server-side hierarchy check)
    const allDescendants = await fetchTree(userId);
    // Exclude self — we only want downline commissions here
    const downlineIds = allDescendants.map(u => u.id).filter(id => id !== userId);

    if (downlineIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        downlineCount: 0,
        summary: { totalCommission: 0, paidCommission: 0, pendingCommission: 0, recordCount: 0 }
      });
    }

    // Role-based rule (Part 4): Show ONLY the commission this associate
    // earned FROM HIS OWN DOWNLINE's sales (beneficiary = me, level > 0, seller in downline)
    const commissions = await Commission.findAll({
      where: {
        user_id: userId,
        level: { [Op.gt]: 0 },
        [Op.or]: [
          { seller_id: { [Op.in]: downlineIds } },
          { downline_user_id: { [Op.in]: downlineIds } }
        ]
      },
      include: [
        {
          model: Transaction,
          as: 'transaction',
          include: [
            {
              model: Plot,
              as: 'plot',
              attributes: ['id', 'plot_code', 'plot_number', 'title', 'location', 'project_id'],
              include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }]
            },
            { model: User, as: 'buyer', attributes: ['id', 'name', 'phone'] },
            { model: User, as: 'sellerAssociate', attributes: ['id', 'name', 'login_id'] }
          ]
        },
        { model: User, as: 'earner', attributes: ['id', 'name', 'login_id', 'commission_percent'] },
        { model: User, as: 'downlineAssociate', attributes: ['id', 'name', 'login_id'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Build summary strictly for these downline commission rows
    const totalCommission = Math.round(commissions.reduce((s, c) => s + parseFloat(c.amount || 0), 0) * 100) / 100;
    const paidCommission = Math.round(commissions.reduce((s, c) => s + parseFloat(c.paid_amount || 0), 0) * 100) / 100;
    const pendingCommission = Math.round(commissions.reduce((s, c) => s + parseFloat(c.remaining_amount !== null && c.remaining_amount !== undefined ? c.remaining_amount : (c.amount - (c.paid_amount || 0))), 0) * 100) / 100;

    res.json({
      success: true,
      data: commissions,
      downlineCount: downlineIds.length,
      summary: {
        totalCommission,
        paidCommission,
        pendingCommission,
        recordCount: commissions.length
      }
    });
  } catch (error) { next(error); }
}

// @desc  Get all members in MY downline with their commission percentages
// @route GET /api/associate/downline-members
async function getDownlineMembers(req, res, next) {
  try {
    const userId = req.user.id;
    const allDescendants = await fetchTree(userId);
    const downline = allDescendants.filter(u => u.id !== userId);

    res.json({
      success: true,
      data: downline.map(u => ({
        id: u.id,
        name: u.name,
        login_id: u.login_id,
        email: u.email,
        phone: u.phone,
        referred_by: u.referred_by,
        commission_percent: u.commission_percent,
        role: u.role,
        status: u.status
      })),
      totalCount: downline.length
    });
  } catch (error) { next(error); }
}

module.exports = {
  getDashboardStats, getMyTeam, getMyCommissions, getMySales, getMyWallet, requestWithdrawal,
  browsePlots, updateProfile, changePassword, submitKyc,
  getMyNotifications, markNotificationRead, createComplaint, getMyComplaints,
  createTeamMember, getMyNetwork, getMyPlots, getMyRewards, recordPaymentForDeal,
  getDownlineCommissions, getDownlineMembers,
  setTeamMemberCommission
};

