/**
 * ACCOUNTS CONTROLLER - DEVOJAS REALTORS
 * Complete financial management: Dashboard, Associate Accounts, Commission Management,
 * Commission Slips, Payments & Receipts, Transactions, Income & Expenses, Reports & Audit.
 */
const { Op } = require("sequelize");
const {
  sequelize,
  Transaction,
  Plot,
  User,
  Commission,
  Wallet,
  WalletTransaction,
  Notification,
  Complaint,
  Payment,
  DailyRecord,
  CommissionHistory,
  PayoutStatement,
  Slab,
  AuditLog,
  AppSettings,
  CommissionPayment,
  RewardLog,
} = require("../models");
const { creditWallet } = require("../services/commissionEngine");

// Safe currency rounding helper
const roundCurrency = (amount) =>
  Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;

// Helper: Record audit log
const logAudit = async ({
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  notes,
  ipAddress,
}) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues
        ? typeof oldValues === "object"
          ? JSON.stringify(oldValues)
          : String(oldValues)
        : null,
      new_values: newValues
        ? typeof newValues === "object"
          ? JSON.stringify(newValues)
          : String(newValues)
        : null,
      notes,
      ip_address: ipAddress,
    });
  } catch (err) {
    console.error("[AuditLog] Error recording audit:", err.message);
  }
};

// =============================================================================
// A. DASHBOARD STATS (Section 6.A)
// =============================================================================
const getDashboardStats = async (req, res, next) => {
  try {
    // ── 1. Property Sales & Collections ────────────────────────────────────
    //
    // FIX: totalRevenue now counts only type='sale' completed transactions.
    // Previously it included type='purchase' (company plot acquisitions),
    // which inflated the figure by the acquisition cost (e.g. ₹80L extra).
    const totalPropertySales = roundCurrency(
      (await Transaction.sum("amount", {
        where: { type: "sale", status: "completed" },
      })) || 0
    );
    // Keep legacy key alias for AccountsDashboard.jsx fallback (s.totalPropertySales || s.totalRevenue)
    const totalRevenue = totalPropertySales;

    const totalTransactionsPaid = (await Transaction.sum("paid_amount")) || 0;
    const directIncome =
      (await DailyRecord.sum("amount", { where: { type: "income" } })) || 0;
    const totalCollections = roundCurrency(
      totalTransactionsPaid + directIncome,
    );
    const outstandingCustomerPayments = roundCurrency(
      Math.max(0, totalPropertySales - totalTransactionsPaid),
    );

    // ── 2. Commissions Overview (ALL associates — network-wide) ────────────
    //
    // FIX: totalCommissionPaid now uses SUM(paid_amount) — the column that
    // holds the running total of money ACTUALLY DISBURSED for each commission row.
    // Previously it used SUM(amount WHERE status='paid'), which counted the full
    // commission amount the moment a row was marked 'paid', ignoring partial payments.
    const totalCommissions = roundCurrency(
      (await Commission.sum("amount")) || 0
    );
    // BUG FIX: was Commission.sum('amount', {where:{status:'paid'}})
    //          fix: Commission.sum('paid_amount') — actual cash settled
    const totalCommissionPaid = roundCurrency(
      (await Commission.sum("paid_amount")) || 0
    );
    const pendingCommissions = roundCurrency(
      (await Commission.sum("amount", { where: { status: "pending" } })) || 0
    );
    const approvedCommissions = roundCurrency(
      (await Commission.sum("amount", {
        where: { status: { [Op.in]: ["approved", "credited"] } },
      })) || 0
    );
    const rejectedCommissions = roundCurrency(
      (await Commission.sum("amount", { where: { status: "rejected" } })) || 0
    );
    const reversedCommissions = roundCurrency(
      (await Commission.sum("amount", { where: { status: "reversed" } })) || 0
    );
    // Remaining payable = total generated − total already paid
    const commissionRemainingPayable = roundCurrency(
      Math.max(0, totalCommissions - totalCommissionPaid)
    );

    // ── 3. Income, Expenses & Net Profit ──────────────────────────────────
    //
    // Net Profit formula:
    //   Customer Sales Revenue
    //   − Commission Actually Paid to ALL users (paid_amount)
    //   − Expenses
    //
    // The admin's own differential commission remains COMPANY INCOME and
    // is therefore NOT deducted here — it is already embedded in the revenue.
    const totalExpense =
      (await DailyRecord.sum("amount", { where: { type: "expense" } })) || 0;
    const netProfit = roundCurrency(
      totalPropertySales - totalCommissionPaid - totalExpense,
    );

    // ── 4. Pending items & Wallets (unchanged) ─────────────────────────────
    const unpaidTransactions = await Transaction.count({
      where: { payment_status: { [Op.in]: ["unpaid", "partial"] } },
    });
    const pendingPayouts = await WalletTransaction.count({
      where: { type: "withdrawal_request", status: "pending" },
    });
    const pendingPayoutAmount =
      (await WalletTransaction.sum("amount", {
        where: { type: "withdrawal_request", status: "pending" },
      })) || 0;
    const totalWalletBalance = (await Wallet.sum("balance")) || 0;

    // ── 5. Recent 6 Transactions (unchanged) ──────────────────────────────
    const recentTransactions = await Transaction.findAll({
      limit: 6,
      order: [
        ["deal_date", "DESC"],
        ["createdAt", "DESC"],
      ],
      include: [
        {
          model: Plot,
          as: "plot",
          attributes: ["id", "title", "location", "price"],
        },
        { model: User, as: "buyer", attributes: ["id", "name", "phone"] },
        {
          model: User,
          as: "sellerAssociate",
          attributes: ["id", "name", "login_id"],
        },
      ],
    });

    // ── 6. Recent 6 Commissions (unchanged) ───────────────────────────────
    const recentCommissions = await Commission.findAll({
      limit: 6,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "earner",
          attributes: ["id", "name", "login_id", "phone"],
        },
        {
          model: Transaction,
          as: "transaction",
          attributes: ["id", "amount", "plot_id"],
        },
      ],
    });

    // ── 7. Monthly Revenue Trend: CUSTOMER SALES ONLY ────────────────────
    // FIX: was {status:'completed'} — now also type:'sale'
    const revenueTrend = await Transaction.findAll({
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("deal_date"), "%Y-%m"),
          "month",
        ],
        [sequelize.fn("SUM", sequelize.col("amount")), "total"],
      ],
      where: { type: "sale", status: "completed" },
      group: ["month"],
      order: [[sequelize.literal("month"), "ASC"]],
      limit: 6,
      raw: true,
    });

    res.json({
      success: true,
      data: {
        // Revenue — customer sales only
        totalPropertySales: roundCurrency(totalPropertySales),
        totalRevenue: roundCurrency(totalRevenue),        // alias for legacy frontend key
        totalCollections: roundCurrency(totalCollections),
        outstandingCustomerPayments: roundCurrency(outstandingCustomerPayments),
        // Commission — network-wide, using paid_amount for actual cash
        totalCommissions: roundCurrency(totalCommissions),
        totalCommissionPaid: roundCurrency(totalCommissionPaid),
        commissionRemainingPayable: roundCurrency(commissionRemainingPayable),
        pendingCommissions: roundCurrency(pendingCommissions),
        approvedCommissions: roundCurrency(approvedCommissions),
        rejectedCommissions: roundCurrency(rejectedCommissions),
        reversedCommissions: roundCurrency(reversedCommissions),
        // Income / Expenses
        directIncome: roundCurrency(directIncome),
        totalIncome: roundCurrency(directIncome),         // alias
        totalExpense: roundCurrency(totalExpense),
        // Net profit = Customer Revenue − Commission Paid − Expenses
        netProfit: roundCurrency(netProfit),
        // Pending items
        unpaidTransactions,
        pendingPayouts,
        pendingPayoutAmount: roundCurrency(pendingPayoutAmount),
        totalWalletBalance: roundCurrency(totalWalletBalance),
        // Lists
        recentTransactions,
        recentCommissions,
        revenueTrend,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// B. ASSOCIATE ACCOUNTS (Section 6.B)
// =============================================================================
const getAssociatesAccountsList = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const where = { role: "associate" };
    if (status) where.status = status;
    if (search && search.trim()) {
      const q = search.trim();
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { login_id: { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
      ];
    }

    const associates = await User.findAll({
      where,
      attributes: [
        "id",
        "name",
        "login_id",
        "phone",
        "email",
        "commission_percent",
        "referral_commission_percent",
        "status",
        "referred_by",
        "createdAt",
      ],
      include: [
        { model: User, as: "referrer", attributes: ["id", "name", "login_id"] },
        { model: Wallet, as: "wallet", attributes: ["balance"] },
      ],
      order: [["name", "ASC"]],
    });

    // Compute sales & commission metrics per associate
    const result = await Promise.all(
      associates.map(async (assoc) => {
        const raw = assoc.toJSON();
        const assocId = assoc.id;

        // Personal sales closed (as seller or buyer associate)
        const salesWhere = {
          [Op.or]: [
            { seller_associate_id: assocId },
            { buyer_associate_id: assocId },
          ],
          status: "completed",
        };
        const salesCount = await Transaction.count({ where: salesWhere });
        const salesVolume = (await Transaction.sum("amount", { where: salesWhere })) || 0;

        // Commission earnings breakdown (differential commissions)
        const commEarned = (await Commission.sum("amount", { where: { user_id: assocId } })) || 0;
        const commPaid = (await Commission.sum("paid_amount", { where: { user_id: assocId } })) || 0;

        // Milestone rewards (from personal sales meeting self-target)
        const rewardEarned = (await RewardLog.sum("reward_amount", { where: { user_id: assocId } })) || 0;
        const rewardPaid = (await RewardLog.sum("reward_amount", { where: { user_id: assocId, status: "paid" } })) || 0;

        const totalEarned = roundCurrency(commEarned + rewardEarned);
        const totalPaid = roundCurrency(commPaid + rewardPaid);
        const pendingDues = roundCurrency(Math.max(0, totalEarned - totalPaid));

        // Direct downlines count
        const downlinesCount = await User.count({
          where: { referred_by: assocId, role: "associate", status: { [Op.ne]: "deleted" } },
        });

        const rate = raw.commission_percent ?? raw.referral_commission_percent ?? 5.0;

        return {
          ...raw,
          // Sponsor / Upline mapping
          sponsor: raw.referrer ? {
            id: raw.referrer.id,
            name: raw.referrer.name,
            login_id: raw.referrer.login_id
          } : null,
          referrer: raw.referrer,

          commission_percent: rate,
          commissionRate: rate,
          effective_commission_percent: rate,

          // Sales count & volume (provide all expected aliases)
          salesCount,
          totalSalesCount: salesCount,
          salesVolume: roundCurrency(salesVolume),
          totalSalesVolume: roundCurrency(salesVolume),

          // Total earned / generated
          commEarned: roundCurrency(commEarned),
          rewardEarned: roundCurrency(rewardEarned),
          totalEarned: roundCurrency(totalEarned),
          totalCommissionEarned: roundCurrency(totalEarned),
          commissionGenerated: roundCurrency(totalEarned),

          // Paid
          totalPaid: roundCurrency(totalPaid),
          paidCommission: roundCurrency(totalPaid),

          // Pending dues
          pendingDues: roundCurrency(pendingDues),
          pendingCommissions: roundCurrency(pendingDues),
          pendingAmount: roundCurrency(pendingDues),

          downlinesCount,
          walletBalance: roundCurrency(raw.wallet?.balance || 0),
        };
      }),
    );

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    next(error);
  }
};

// Get detailed associate statement / account details (Section 6.B)
const getAssociateAccountDetails = async (req, res, next) => {
  try {
    const assocId = req.params.id;
    const associate = await User.findByPk(assocId, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: User,
          as: "referrer",
          attributes: ["id", "name", "login_id", "phone", "email"],
        },
        { model: Wallet, as: "wallet" },
        { model: Slab, as: "currentSlab" },
      ],
    });
    if (!associate)
      return res
        .status(404)
        .json({ success: false, message: "Associate not found" });

    // Personal deals
    const personalDeals = await Transaction.findAll({
      where: {
        [Op.or]: [
          { seller_associate_id: assocId },
          { buyer_associate_id: assocId },
        ],
        status: "completed",
      },
      include: [
        { model: Plot, as: "plot" },
        { model: User, as: "buyer", attributes: ["id", "name", "phone"] },
      ],
      order: [["deal_date", "DESC"], ["createdAt", "DESC"]],
    });

    // Commission ledger entries for this associate
    const commissions = await Commission.findAll({
      where: { user_id: assocId },
      include: [
        {
          model: Transaction,
          as: "transaction",
          include: [
            { model: Plot, as: "plot" },
            { model: User, as: "buyer", attributes: ["name"] },
          ],
        },
        {
          model: User,
          as: "downlineAssociate",
          attributes: ["id", "name", "login_id"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Also fetch RewardLog entries for this associate
    const rewards = await RewardLog.findAll({
      where: { user_id: assocId },
      include: [
        { model: Slab, as: "slab" },
        { model: Transaction, as: "transaction" }
      ],
      order: [["createdAt", "DESC"]]
    });

    // Payout statements
    const payoutStatements = await PayoutStatement.findAll({
      where: { associate_id: assocId },
      order: [["payment_date", "DESC"]],
    });

    // Wallet transactions history
    const walletTransactions = await WalletTransaction.findAll({
      where: { user_id: assocId },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    // Calculation summary
    const commEarned = roundCurrency(commissions.reduce((acc, c) => acc + parseFloat(c.amount || 0), 0));
    const commPaid = roundCurrency(commissions.reduce((acc, c) => acc + parseFloat(c.paid_amount || 0), 0));
    const rewardEarned = roundCurrency(rewards.reduce((acc, r) => acc + parseFloat(r.reward_amount || 0), 0));
    const rewardPaid = roundCurrency(rewards.filter(r => r.status === 'paid').reduce((acc, r) => acc + parseFloat(r.reward_amount || 0), 0));

    const totalEarned = roundCurrency(commEarned + rewardEarned);
    const totalPaid = roundCurrency(commPaid + rewardPaid);
    const pendingAmount = roundCurrency(Math.max(0, totalEarned - totalPaid));
    const totalSalesVol = roundCurrency(personalDeals.reduce((acc, d) => acc + parseFloat(d.amount || 0), 0));

    res.json({
      success: true,
      data: {
        associate,
        summary: {
          totalEarned,
          totalPaid,
          pendingAmount,
          totalSalesVolume: totalSalesVol,
          salesVolume: totalSalesVol,
          commEarned,
          rewardEarned,
          walletBalance: roundCurrency(associate.wallet?.balance || 0),
          personalDealsCount: personalDeals.length,
          totalCommissionsCount: commissions.length,
          totalRewardsCount: rewards.length,
        },
        personalDeals,
        commissions,
        rewards,
        payoutStatements,
        walletTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// C. COMMISSION MANAGEMENT & WORKFLOW (Section 6.C)
// =============================================================================
const getCommissionLedger = async (req, res, next) => {
  try {
    const {
      status,
      type,
      user_id,
      transaction_id,
      is_flagged,
      start_date,
      end_date,
    } = req.query;
    const where = {};

    if (status && status !== "all") where.status = status;
    if (type === "direct") where.level = 0;
    if (type === "downline") where.level = { [Op.gt]: 0 };
    if (user_id) where.user_id = user_id;
    if (transaction_id) where.transaction_id = transaction_id;
    if (is_flagged !== undefined && is_flagged !== "")
      where.is_flagged = is_flagged === "true" || is_flagged === "1";

    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date)
        where.createdAt[Op.lte] = new Date(
          new Date(end_date).setHours(23, 59, 59, 999),
        );
    }

    const commissions = await Commission.findAll({
      where,
      include: [
        {
          model: User,
          as: "earner",
          attributes: [
            "id",
            "name",
            "login_id",
            "phone",
            "email",
            "commission_percent",
          ],
        },
        {
          model: User,
          as: "downlineAssociate",
          attributes: ["id", "name", "login_id", "phone"],
        },
        {
          model: Transaction,
          as: "transaction",
          include: [
            {
              model: Plot,
              as: "plot",
              attributes: ["id", "title", "location", "price"],
            },
            { model: User, as: "buyer", attributes: ["id", "name", "phone"] },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const totalAmount = roundCurrency(
      commissions.reduce((acc, c) => acc + parseFloat(c.amount || 0), 0),
    );
    const pendingCount = commissions.filter(
      (c) => c.status === "pending",
    ).length;
    const approvedCount = commissions.filter((c) =>
      ["approved", "credited"].includes(c.status),
    ).length;
    const paidCount = commissions.filter((c) => c.status === "paid").length;
    const flaggedCount = commissions.filter((c) => c.is_flagged).length;

    res.json({
      success: true,
      count: commissions.length,
      summary: {
        totalAmount,
        pendingCount,
        approvedCount,
        paidCount,
        flaggedCount,
      },
      data: commissions,
    });
  } catch (error) {
    next(error);
  }
};

// Update single commission status (Approve, Mark Paid, Reject, Reverse, Dispute)
const updateCommissionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { action, status, notes, reason } = req.body; // 'approve', 'mark_paid', 'reject', 'reverse', 'dispute' or direct status

    // Normalise status to action if sent directly from UI
    if (!action && status) {
      if (status === "approved") action = "approve";
      else if (status === "paid") action = "mark_paid";
      else if (status === "rejected") action = "reject";
      else if (status === "reversed") action = "reverse";
      else if (status === "disputed") action = "dispute";
    }

    const commission = await Commission.findByPk(id, {
      include: [
        { model: User, as: "earner", attributes: ["id", "name", "login_id"] },
      ],
    });
    if (!commission)
      return res
        .status(404)
        .json({ success: false, message: "Commission record not found" });

    const oldStatus = commission.status;
    let newStatus = oldStatus;
    const finalNotes = notes || reason || "";

    if (action === "approve") {
      newStatus = "approved";
      commission.approved_by = req.user.id;
      commission.approved_at = new Date();
    } else if (action === "mark_paid") {
      newStatus = "paid";
      commission.paid_at = new Date();
      // If commission has not yet been credited to the associate's wallet, credit it now upon payment
      if (oldStatus !== "credited" && oldStatus !== "paid") {
        await creditWallet(
          commission.user_id,
          commission.amount,
          `Commission Paid (${commission.percent}%) - Deal #${commission.transaction_id}`,
          null,
        );
      }
    } else if (action === "reject") {
      newStatus = "rejected";
      commission.reversal_reason = finalNotes || "Rejected by Accounts";
    } else if (action === "reverse") {
      newStatus = "reversed";
      commission.reversal_reason = finalNotes || "Reversed by Accounts";
    } else if (action === "dispute") {
      newStatus = "disputed";
      commission.reversal_reason = finalNotes || "Flagged for dispute";
    } else {
      return res.status(400).json({
        success: false,
        message: `Invalid action: ${action || status}`,
      });
    }

    commission.status = newStatus;
    await commission.save();

    // Traceable Audit Log
    await logAudit({
      userId: req.user.id,
      action: `COMMISSION_${action.toUpperCase()}`,
      entityType: "commission",
      entityId: commission.id,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      notes:
        finalNotes ||
        `Commission #${commission.id} marked as ${newStatus} by ${req.user.name}`,
      ipAddress: req.ip,
    });

    // Notify Associate
    await Notification.create({
      user_id: commission.user_id,
      title: `Commission ${newStatus.toUpperCase()}`,
      message: `Your commission of ₹${commission.amount} for Transaction #${commission.transaction_id} is now ${newStatus}.`,
      type: "deal",
    });

    res.json({
      success: true,
      message: `Commission #${id} status updated to ${newStatus}`,
      data: commission,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk commission action (Approve or Mark Paid for selected list)
const bulkUpdateCommissions = async (req, res, next) => {
  try {
    const { ids, action, notes } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of commission IDs",
      });
    }

    let targetStatus;
    if (action === "approve") targetStatus = "approved";
    else if (action === "mark_paid") targetStatus = "paid";
    else if (action === "reject") targetStatus = "rejected";
    else
      return res
        .status(400)
        .json({ success: false, message: "Invalid bulk action" });

    const updateFields = { status: targetStatus };
    if (action === "approve") {
      updateFields.approved_by = req.user.id;
      updateFields.approved_at = new Date();
    }
    if (action === "mark_paid") {
      updateFields.paid_at = new Date();
    }

    await Commission.update(updateFields, { where: { id: { [Op.in]: ids } } });

    await logAudit({
      userId: req.user.id,
      action: `BULK_COMMISSION_${action.toUpperCase()}`,
      entityType: "commission",
      entityId: null,
      oldValues: null,
      newValues: { ids, status: targetStatus },
      notes:
        notes || `Bulk updated ${ids.length} commissions to ${targetStatus}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Successfully updated ${ids.length} commissions to ${targetStatus}`,
    });
  } catch (error) {
    next(error);
  }
};

// Search associates for Commission Management (Section 5)
const searchAssociatesForCommission = async (req, res, next) => {
  try {
    const { q } = req.query;
    const where = { role: "associate" };
    if (q && q.trim()) {
      const search = q.trim();
      where[Op.or] = [
        { login_id: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const associates = await User.findAll({
      where,
      attributes: [
        "id",
        "name",
        "login_id",
        "phone",
        "email",
        "commission_percent",
        "status",
      ],
      include: [{ model: Wallet, as: "wallet", attributes: ["balance"] }],
      limit: 20,
      order: [["name", "ASC"]],
    });

    res.json({ success: true, count: associates.length, data: associates });
  } catch (error) {
    next(error);
  }
};

// Get specific associate's approved sales & commission ledger with payment balances (Section 5 & 6)
const getAssociateCommissionLedger = async (req, res, next) => {
  try {
    const { id } = req.params;
    const associate = await User.findByPk(id, {
      attributes: [
        "id",
        "name",
        "login_id",
        "phone",
        "email",
        "commission_percent",
        "status",
      ],
      include: [
        { model: Wallet, as: "wallet", attributes: ["balance"] },
        { model: User, as: "referrer", attributes: ["id", "name", "login_id"] },
      ],
    });
    if (!associate)
      return res
        .status(404)
        .json({ success: false, message: "Associate not found" });

    // Fetch all commissions for this associate with transaction, plot, and payments history
    const commissions = await Commission.findAll({
      where: { user_id: id },
      include: [
        {
          model: Transaction,
          as: "transaction",
          include: [
            {
              model: Plot,
              as: "plot",
              attributes: [
                "id",
                "plot_code",
                "plot_number",
                "title",
                "location",
                "size_sqft",
                "price",
                "basic_price",
              ],
            },
            { model: User, as: "buyer", attributes: ["id", "name", "phone"] },
          ],
        },
        {
          model: User,
          as: "downlineAssociate",
          attributes: ["id", "name", "login_id"],
        },
        {
          model: CommissionPayment,
          as: "payments",
          include: [
            { model: User, as: "recordedByUser", attributes: ["id", "name"] },
          ],
          order: [["payment_date", "DESC"]],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Authoritative totals derived directly from ledger
    const totalEarned = roundCurrency(
      commissions.reduce((acc, c) => acc + parseFloat(c.amount || 0), 0),
    );
    const approvedCommissions = commissions.filter((c) =>
      ["approved", "credited", "partial", "paid"].includes(c.status),
    );
    const approvedAmount = roundCurrency(
      approvedCommissions.reduce(
        (acc, c) => acc + parseFloat(c.amount || 0),
        0,
      ),
    );
    const pendingCommissions = commissions.filter(
      (c) => c.status === "pending",
    );
    const pendingAmount = roundCurrency(
      pendingCommissions.reduce((acc, c) => acc + parseFloat(c.amount || 0), 0),
    );
    const totalPaid = roundCurrency(
      commissions.reduce((acc, c) => acc + parseFloat(c.paid_amount || 0), 0),
    );
    const remainingPayable = roundCurrency(
      Math.max(0, approvedAmount - totalPaid),
    );
    const reversedAmount = roundCurrency(
      commissions
        .filter((c) => c.status === "reversed")
        .reduce((acc, c) => acc + parseFloat(c.amount || 0), 0),
    );

    res.json({
      success: true,
      data: {
        associate,
        summary: {
          totalEarned,
          approvedAmount,
          pendingAmount,
          totalPaid,
          remainingPayable,
          reversedAmount,
          walletBalance: roundCurrency(associate.wallet?.balance || 0),
          commissionsCount: commissions.length,
        },
        commissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Process commission payment to associate (Section 5, 7, 8: Partial payments, precision, overpayment protection, idempotency)
const payCommission = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      commission_id,
      amount,
      payment_method,
      payment_reference,
      payment_date,
      remarks,
      idempotency_key,
    } = req.body;

    const paymentAmount = roundCurrency(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than 0",
      });
    }

    if (!commission_id) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Commission ID is required" });
    }

    // Lock commission row to prevent concurrent race conditions
    const commission = await Commission.findByPk(commission_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!commission) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Commission record not found" });
    }

    // Verify status is payable
    if (["rejected", "reversed", "disputed"].includes(commission.status)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot pay commission in "${commission.status}" status`,
      });
    }

    // Calculate current remaining payable balance
    const totalCommission = roundCurrency(parseFloat(commission.amount || 0));
    const previouslyPaid = roundCurrency(
      parseFloat(commission.paid_amount || 0),
    );
    const currentRemaining = roundCurrency(
      Math.max(0, totalCommission - previouslyPaid),
    );

    if (currentRemaining <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `This commission is already fully paid (Remaining balance: ₹0.00)`,
      });
    }

    // Financial control: Attempt to pay more than remaining balance must be strictly rejected
    if (paymentAmount > currentRemaining) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Payment amount ₹${paymentAmount.toFixed(2)} exceeds remaining payable balance of ₹${currentRemaining.toFixed(2)}. Overpayment is strictly rejected.`,
      });
    }

    // Idempotency / Duplicate submission protection
    const paymentRef =
      payment_reference && payment_reference.trim()
        ? payment_reference.trim()
        : idempotency_key ||
          `COMM-PAY-${commission.id}-${Date.now().toString().slice(-6)}`;

    const existingPayment = await CommissionPayment.findOne({
      where: { payment_ref: paymentRef },
      transaction: t,
    });

    if (existingPayment) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: `Duplicate payment detected: Payment reference "${paymentRef}" has already been processed.`,
      });
    }

    // New balances
    const newPaidAmount = roundCurrency(previouslyPaid + paymentAmount);
    const newRemainingAmount = roundCurrency(
      Math.max(0, totalCommission - newPaidAmount),
    );
    const newStatus = newRemainingAmount <= 0 ? "paid" : "partial";

    // 1. Record CommissionPayment entry
    const createdPayment = await CommissionPayment.create(
      {
        payment_ref: paymentRef,
        commission_id: commission.id,
        associate_id: commission.user_id,
        transaction_id: commission.transaction_id,
        amount: paymentAmount,
        payment_method: payment_method || "Bank Transfer",
        payment_reference: payment_reference || null,
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        recorded_by: req.user.id,
        status: "completed",
        remarks:
          remarks ||
          `Commission payment for Deal #${commission.transaction_id}`,
      },
      { transaction: t },
    );

    // 2. Update commission record
    commission.paid_amount = newPaidAmount;
    commission.remaining_amount = newRemainingAmount;
    commission.status = newStatus;
    commission.approved_by = commission.approved_by || req.user.id;
    commission.approved_at = commission.approved_at || new Date();
    if (newStatus === "paid") {
      commission.paid_at = new Date();
    }
    await commission.save({ transaction: t });

    // 3. Credit Associate's Wallet/Commission account
    await creditWallet(
      commission.user_id,
      paymentAmount,
      `Commission payment received (${payment_method || "Bank Transfer"}) - Deal #${commission.transaction_id} [Ref: ${paymentRef}]`,
      t,
    );

    // 4. Audit Log
    await logAudit({
      userId: req.user.id,
      action: "COMMISSION_PAYMENT",
      entityType: "commission_payment",
      entityId: createdPayment.id,
      oldValues: {
        paid_amount: previouslyPaid,
        remaining_amount: currentRemaining,
        status: commission.status,
      },
      newValues: {
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        status: newStatus,
        payment: createdPayment.toJSON(),
      },
      notes: `Paid ₹${paymentAmount.toFixed(2)} to Associate #${commission.user_id} for Deal #${commission.transaction_id}. Balance: ₹${newRemainingAmount.toFixed(2)}.`,
      ipAddress: req.ip,
    });

    // 5. Notification to Associate
    await Notification.create(
      {
        user_id: commission.user_id,
        title: "Commission Payment Received! 💰",
        message: `₹${paymentAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} has been transferred towards your commission on Deal #${commission.transaction_id}. Remaining payable: ₹${newRemainingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.`,
        type: "payout",
      },
      { transaction: t },
    );

    await t.commit();

    res.status(200).json({
      success: true,
      message: `Commission payment of ₹${paymentAmount.toFixed(2)} processed successfully`,
      data: {
        payment: createdPayment,
        commission: {
          id: commission.id,
          total_amount: totalCommission,
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: newStatus,
        },
      },
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// =============================================================================
// D. INDIVIDUAL COMMISSION SLIP (Section 7)
// =============================================================================
const getCommissionSlipData = async (req, res, next) => {
  try {
    const { associate_id, start_date, end_date } = req.query;
    if (!associate_id) {
      return res.status(400).json({
        success: false,
        message: "associate_id query parameter is required",
      });
    }

    const associate = await User.findByPk(associate_id, {
      attributes: [
        "id",
        "name",
        "login_id",
        "phone",
        "email",
        "pan_number",
        "aadhar_number",
        "commission_percent",
        "createdAt",
      ],
    });
    if (!associate)
      return res
        .status(404)
        .json({ success: false, message: "Associate not found" });

    const appSettings = (await AppSettings.findOne()) || {
      company_name: "DEVOJAS REALTORS",
      company_logo_url: null,
    };

    const commWhere = { user_id: associate.id };
    if (start_date || end_date) {
      commWhere.createdAt = {};
      if (start_date) commWhere.createdAt[Op.gte] = new Date(start_date);
      if (end_date)
        commWhere.createdAt[Op.lte] = new Date(
          new Date(end_date).setHours(23, 59, 59, 999),
        );
    }

    const commissions = await Commission.findAll({
      where: commWhere,
      include: [
        {
          model: Transaction,
          as: "transaction",
          include: [
            {
              model: Plot,
              as: "plot",
              attributes: ["id", "title", "location", "plot_number", "price"],
            },
            { model: User, as: "buyer", attributes: ["id", "name", "phone"] },
          ],
        },
        {
          model: User,
          as: "downlineAssociate",
          attributes: ["id", "name", "login_id"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    const slipId = `SLIP-${associate.login_id || `DEV-${String(associate.id).padStart(4, "0")}`}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

    // Itemized table rows as defined in Section 7
    let totalCommissionableAmount = 0;
    let totalSellerCommission = 0;
    let totalUplineCommission = 0;
    let totalApprovedCommission = 0;
    let totalPaid = 0;

    const items = commissions.map((c) => {
      const baseAmt = parseFloat(c.base_amount || c.transaction?.amount || 0);
      const grossAmt = parseFloat(c.amount || 0);
      const isApproved = ["approved", "credited", "partial", "paid"].includes(
        c.status,
      );
      // BUG FIX: ledger ka saved paid_amount use karo (partial payment bhi dikhe)
      const paidAmt = Math.min(grossAmt, parseFloat(c.paid_amount || 0));
      const outstandingAmt = roundCurrency(Math.max(0, grossAmt - paidAmt));

      totalCommissionableAmount += baseAmt;
      if (c.level === 0) totalSellerCommission += grossAmt;
      else totalUplineCommission += grossAmt;

      if (isApproved) totalApprovedCommission += grossAmt;
      totalPaid += paidAmt;

      return {
        id: c.id,
        transaction_id: c.transaction_id,
        transaction_ref:
          c.transaction?.transaction_ref || `TX-${c.transaction_id}`,
        property_id: c.transaction?.plot?.id,
        property_name: c.transaction?.plot?.title || "Property Plot",
        plot_number: c.transaction?.plot?.plot_number || "—",
        customer_name: c.transaction?.buyer?.name || "Customer",
        booking_reference:
          c.transaction?.transaction_ref || `BK-${c.transaction_id}`,
        sale_date: c.transaction?.deal_date || c.createdAt,
        commissionable_amount: roundCurrency(baseAmt),
        assigned_rate: c.upline_percent || c.percent,
        upline_rate: c.upline_percent || c.percent,
        downline_rate: c.downline_percent || 0,
        differential_rate: c.differential_percent || c.percent,
        level: c.level,
        role_level: c.role_level,
        downline_name: c.downlineAssociate
          ? `${c.downlineAssociate.name} (${c.downlineAssociate.login_id})`
          : "— (Self Direct)",
        gross_commission: roundCurrency(grossAmt),
        approved_adjustments: 0.0,
        net_payable: roundCurrency(grossAmt),
        amount_paid: roundCurrency(paidAmt),
        outstanding_amount: roundCurrency(outstandingAmt),
        payment_status: c.status,
      };
    });

    const remainingPayableBalance = roundCurrency(
      Math.max(0, totalApprovedCommission - totalPaid),
    );

    res.json({
      success: true,
      data: {
        header: {
          company_name: appSettings.company_name || "DEVOJAS REALTORS",
          company_logo_url: appSettings.company_logo_url,
          slip_id: slipId,
          issue_date: new Date().toISOString().split("T")[0],
          commission_period: `${start_date || "Inception"} to ${end_date || "Current Date"}`,
          associate_name: associate.name,
          associate_id:
            associate.login_id ||
            `DEV-${String(associate.id).padStart(4, "0")}`,
          phone: associate.phone,
          email: associate.email,
          pan: associate.pan_number,
          assigned_rate: associate.commission_percent || 5.0,
        },
        items,
        summary: {
          total_commissionable_amount: roundCurrency(totalCommissionableAmount),
          total_seller_commission: roundCurrency(totalSellerCommission),
          total_upline_commission: roundCurrency(totalUplineCommission),
          total_adjustments: 0.0,
          total_approved_commission: roundCurrency(totalApprovedCommission),
          total_paid: roundCurrency(totalPaid),
          remaining_payable_balance: remainingPayableBalance,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// E. PROPERTY SALES & TRANSACTIONS (Section 6.D)
// =============================================================================
const getAccountsTransactions = async (req, res, next) => {
  try {
    const { status, payment_status, search } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;
    if (payment_status && payment_status !== "all")
      where.payment_status = payment_status;

    const transactions = await Transaction.findAll({
      where,
      include: [
        { model: Plot, as: "plot" },
        {
          model: User,
          as: "buyer",
          attributes: ["id", "name", "phone", "email"],
        },
        { model: User, as: "seller", attributes: ["id", "name", "phone"] },
        {
          model: User,
          as: "sellerAssociate",
          attributes: ["id", "name", "login_id", "phone"],
        },
        { model: Payment, as: "payments" },
        { model: Commission, as: "commissions" },
      ],
      order: [
        ["deal_date", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    const result = transactions.map((t) => {
      const raw = t.toJSON();
      const amt = parseFloat(raw.amount || 0);
      const paid = parseFloat(raw.paid_amount || 0);
      const outstanding = roundCurrency(Math.max(0, amt - paid));
      return {
        ...raw,
        outstanding_amount: outstanding,
      };
    });

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// F. CUSTOMER PAYMENTS & RECEIPTS (Section 6.E)
// =============================================================================
const recordCustomerPayment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { transaction_id, amount, payment_mode, reference_no, note } =
      req.body;
    const parsedAmount = roundCurrency(amount);

    if (!transaction_id || parsedAmount <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Valid transaction ID and payment amount are required",
      });
    }

    const transaction = await Transaction.findByPk(transaction_id, {
      transaction: t,
    });
    if (!transaction) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    // Generate unique receipt number
    const receiptNo = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const payment = await Payment.create(
      {
        transaction_id,
        amount: parsedAmount,
        payment_mode: payment_mode || "Cash",
        reference_no: reference_no || null,
        receipt_no: receiptNo,
        status: "verified",
        recorded_by: req.user.id,
        note: note || "Customer payment recorded by Accounts",
        paid_on: new Date(),
      },
      { transaction: t },
    );

    // Update Transaction paid_amount & status
    const currentPaid = parseFloat(transaction.paid_amount || 0);
    const updatedPaid = roundCurrency(currentPaid + parsedAmount);
    transaction.paid_amount = updatedPaid;

    if (updatedPaid >= parseFloat(transaction.amount)) {
      transaction.payment_status = "paid";
    } else if (updatedPaid > 0) {
      transaction.payment_status = "partial";
    }
    await transaction.save({ transaction: t });

    await t.commit();

    // Audit log
    await logAudit({
      userId: req.user.id,
      action: "PAYMENT_RECORDED",
      entityType: "payment",
      entityId: payment.id,
      oldValues: { previous_paid_amount: currentPaid },
      newValues: {
        new_payment_amount: parsedAmount,
        total_paid: updatedPaid,
        receipt_no: receiptNo,
      },
      notes: `Recorded payment of ₹${parsedAmount} for Transaction #${transaction_id} via ${payment_mode || "Cash"}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Payment of ₹${parsedAmount} recorded successfully. Receipt #${receiptNo} generated.`,
      data: { payment, transaction },
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

const getPaymentsLedger = async (req, res, next) => {
  try {
    const { payment_mode, status, start_date, end_date } = req.query;
    const where = {};
    if (payment_mode && payment_mode !== "all")
      where.payment_mode = payment_mode;
    if (status && status !== "all") where.status = status;
    if (start_date || end_date) {
      where.paid_on = {};
      if (start_date) where.paid_on[Op.gte] = new Date(start_date);
      if (end_date)
        where.paid_on[Op.lte] = new Date(
          new Date(end_date).setHours(23, 59, 59, 999),
        );
    }

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: Transaction,
          as: "transaction",
          include: [
            {
              model: Plot,
              as: "plot",
              attributes: ["id", "title", "location"],
            },
            { model: User, as: "buyer", attributes: ["id", "name", "phone"] },
          ],
        },
        { model: User, as: "recordedByUser", attributes: ["id", "name"] },
      ],
      order: [["paid_on", "DESC"]],
    });

    const totalCollected = roundCurrency(
      payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0),
    );

    res.json({
      success: true,
      count: payments.length,
      totalCollected,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// G. INCOME & EXPENSES (Section 6.G)
// =============================================================================
const getIncomeExpensesSummary = async (req, res, next) => {
  try {
    const { category, type, start_date, end_date } = req.query;
    const where = {};
    if (type && type !== "all") where.type = type;
    if (category && category !== "all") where.category = category;
    if (start_date || end_date) {
      where.record_date = {};
      if (start_date) where.record_date[Op.gte] = start_date;
      if (end_date) where.record_date[Op.lte] = end_date;
    }

    const records = await DailyRecord.findAll({
      where,
      order: [
        ["record_date", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    const totalIncome = roundCurrency(
      records
        .filter((r) => r.type === "income")
        .reduce((s, r) => s + parseFloat(r.amount || 0), 0),
    );
    const totalExpense = roundCurrency(
      records
        .filter((r) => r.type === "expense")
        .reduce((s, r) => s + parseFloat(r.amount || 0), 0),
    );
    const netProfit = roundCurrency(totalIncome - totalExpense);

    // Group expenses by category
    const categoryBreakdown = {};
    records
      .filter((r) => r.type === "expense")
      .forEach((r) => {
        const cat = r.category || "General";
        categoryBreakdown[cat] = roundCurrency(
          (categoryBreakdown[cat] || 0) + parseFloat(r.amount || 0),
        );
      });

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netProfit,
        categoryBreakdown,
        records,
      },
    });
  } catch (error) {
    next(error);
  }
};

const addIncomeExpense = async (req, res, next) => {
  try {
    const {
      type,
      title,
      amount,
      category,
      payment_mode,
      reference_no,
      party_name,
      party_phone,
      record_date,
      description,
    } = req.body;
    if (!title || !amount || !record_date) {
      return res.status(400).json({
        success: false,
        message: "Title, amount and record date are required",
      });
    }

    const record = await DailyRecord.create({
      type: type || "expense",
      title,
      amount: roundCurrency(amount),
      category: category || "General",
      payment_mode: payment_mode || "Cash",
      reference_no: reference_no || null,
      party_name: party_name || null,
      party_phone: party_phone || null,
      record_date,
      description: description || null,
      created_by: req.user.id,
    });

    await logAudit({
      userId: req.user.id,
      action: `${(type || "expense").toUpperCase()}_RECORDED`,
      entityType: "daily_record",
      entityId: record.id,
      oldValues: null,
      newValues: record.toJSON(),
      notes: `Recorded ${type || "expense"} of ₹${amount} under ${category || "General"}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Entry recorded successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// H. AUDIT LOGS (Section 6.I)
// =============================================================================
const getAuditLogsList = async (req, res, next) => {
  try {
    const { action, entity_type, limit } = req.query;
    const where = {};
    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;

    const auditLogs = await AuditLog.findAll({
      where,
      limit: parseInt(limit) || 100,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: User,
          as: "performer",
          attributes: ["id", "name", "role", "login_id"],
        },
      ],
    });

    // Also fetch Commission percentage changes from CommissionHistory
    const rateChanges = await CommissionHistory.findAll({
      limit: 50,
      order: [["effective_date", "DESC"]],
      include: [
        {
          model: User,
          as: "associate",
          attributes: ["id", "name", "login_id"],
        },
        {
          model: User,
          as: "adminUser",
          attributes: ["id", "name", "login_id"],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        auditLogs,
        rateChanges,
      },
      auditLogs,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// ORIGINAL COMPATIBILITY HANDLERS (Preserved)
// =============================================================================
const getPaymentVerifications = async (req, res, next) => {
  try {
    const { payment_status } = req.query;
    const where = {};
    if (payment_status) where.payment_status = payment_status;

    const transactions = await Transaction.findAll({
      where,
      include: [
        { model: Plot, as: "plot" },
        {
          model: User,
          as: "buyer",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: User,
          as: "seller",
          attributes: ["id", "name", "email", "phone"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    next(error);
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const { payment_status } = req.body;
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });

    transaction.payment_status = payment_status;
    await transaction.save();

    await Notification.create({
      user_id: null,
      title: "Payment Status Updated",
      message: `Transaction #${transaction.id} payment marked as ${payment_status} by Accounts.`,
      type: "deal",
    });

    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

const getPayoutRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { type: "withdrawal_request" };
    if (status) where.status = status;
    else where.status = "pending";

    const requests = await WalletTransaction.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone", "role"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

const processPayout = async (req, res, next) => {
  try {
    const { action } = req.body;
    const request = await WalletTransaction.findByPk(req.params.id);
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });

    if (action === "approve") {
      const wallet = await Wallet.findOne({
        where: { user_id: request.user_id },
      });
      if (!wallet || parseFloat(wallet.balance) < parseFloat(request.amount)) {
        return res
          .status(400)
          .json({ success: false, message: "Insufficient wallet balance" });
      }
      wallet.balance = parseFloat(wallet.balance) - parseFloat(request.amount);
      await wallet.save();

      request.status = "completed";
      request.type = "withdrawal_approved";
      await request.save();

      await Notification.create({
        user_id: request.user_id,
        title: "Withdrawal Approved",
        message: `Your withdrawal of ₹${request.amount} has been approved and processed by Accounts.`,
        type: "payout",
      });
    } else {
      request.status = "rejected";
      request.type = "withdrawal_rejected";
      await request.save();

      await Notification.create({
        user_id: request.user_id,
        title: "Withdrawal Rejected",
        message: `Your withdrawal request of ₹${request.amount} was rejected by Accounts.`,
        type: "payout",
      });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

const getInvoiceData = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.transactionId, {
      include: [
        { model: Plot, as: "plot" },
        {
          model: User,
          as: "buyer",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: User,
          as: "seller",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: Commission,
          as: "commissions",
          include: [{ model: User, as: "earner", attributes: ["id", "name"] }],
        },
      ],
    });
    if (!transaction)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

const getInvoiceList = async (req, res, next) => {
  try {
    const transactions = await Transaction.findAll({
      where: { status: "completed" },
      include: [
        { model: Plot, as: "plot" },
        { model: User, as: "buyer", attributes: ["id", "name"] },
        { model: User, as: "seller", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

const getFinancialReports = async (req, res, next) => {
  try {
    const revenueTrend = await Transaction.findAll({
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("deal_date"), "%Y-%m"),
          "month",
        ],
        [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
      ],
      where: { status: "completed" },
      group: ["month"],
      order: [[sequelize.literal("month"), "ASC"]],
      raw: true,
    });

    const commissionTrend = await Commission.findAll({
      attributes: [
        [
          sequelize.fn(
            "DATE_FORMAT",
            sequelize.col("Commission.created_at"),
            "%Y-%m",
          ),
          "month",
        ],
        [sequelize.fn("SUM", sequelize.col("amount")), "commission"],
      ],
      group: ["month"],
      order: [[sequelize.literal("month"), "ASC"]],
      raw: true,
    });

    const topEarners = await Commission.findAll({
      attributes: [
        "user_id",
        [sequelize.fn("SUM", sequelize.col("amount")), "total"],
      ],
      group: ["user_id"],
      order: [[sequelize.literal("total"), "DESC"]],
      limit: 5,
      include: [{ model: User, as: "earner", attributes: ["name"] }],
    });

    res.json({
      success: true,
      data: { revenueTrend, commissionTrend, topEarners },
    });
  } catch (error) {
    next(error);
  }
};

const getAllWallets = async (req, res, next) => {
  try {
    const wallets = await Wallet.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
      ],
      order: [["balance", "DESC"]],
    });
    res.json({ success: true, count: wallets.length, data: wallets });
  } catch (error) {
    next(error);
  }
};

const exportTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.findAll({
      include: [
        { model: Plot, as: "plot", attributes: ["title", "location"] },
        { model: User, as: "buyer", attributes: ["name"] },
        { model: User, as: "seller", attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

const createComplaint = async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    const complaint = await Complaint.create({
      user_id: req.user.id,
      subject,
      message,
    });
    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.findAll({
      where: { user_id: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: complaints });
  } catch (error) {
    next(error);
  }
};

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: null },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    const unreadCount = await Notification.count({
      where: { user_id: null, is_read: false },
    });
    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// Download official payment receipt PDF
const downloadPaymentReceiptPdf = async (req, res, next) => {
  try {
    const { generatePaymentReceiptPdf } = require("../services/pdfService");
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: Transaction,
          as: "transaction",
          include: [
            {
              model: Plot,
              as: "plot",
              include: [{ model: require("../models").Project, as: "project" }],
            },
            { model: User, as: "buyer" },
            { model: User, as: "sellerAssociate" },
          ],
        },
      ],
    });
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });

    // Strict Role-Based Isolation Check (Test Case G)
    if (req.user.role === "associate") {
      const isSellerAssoc =
        payment.transaction?.seller_associate_id === req.user.id;
      const isBuyerAssoc =
        payment.transaction?.buyer_associate_id === req.user.id;
      const isRecorder = payment.recorded_by === req.user.id;
      if (!isSellerAssoc && !isBuyerAssoc && !isRecorder) {
        return res.status(403).json({
          success: false,
          message:
            "Unauthorized access: You cannot view or download another associate's receipt",
        });
      }
    } else if (req.user.role === "client") {
      if (payment.transaction?.buyer_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message:
            "Unauthorized access: You cannot view another customer's receipt",
        });
      }
    }

    let settings = (await AppSettings.findOne()) || {};

    const pdfPath = await generatePaymentReceiptPdf({
      payment,
      transaction: payment.transaction,
      plot: payment.transaction?.plot,
      buyer: payment.transaction?.buyer,
      sellerAssociate: payment.transaction?.sellerAssociate,
      companySettings: settings,
    });

    res.download(pdfPath, `Receipt-${payment.receipt_no || payment.id}.pdf`);
  } catch (error) {
    next(error);
  }
};

// Download official payment receipt PDF for a Transaction
const downloadTransactionReceiptPdf = async (req, res, next) => {
  try {
    const { generatePaymentReceiptPdf } = require("../services/pdfService");
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        {
          model: Plot,
          as: "plot",
          include: [{ model: require("../models").Project, as: "project" }],
        },
        { model: User, as: "buyer" },
        { model: User, as: "sellerAssociate" },
      ],
    });
    if (!transaction)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });

    // Strict Role-Based Isolation Check
    if (req.user.role === "associate") {
      const isSellerAssoc = transaction.seller_associate_id === req.user.id;
      const isBuyerAssoc = transaction.buyer_associate_id === req.user.id;
      if (!isSellerAssoc && !isBuyerAssoc) {
        return res.status(403).json({
          success: false,
          message:
            "Unauthorized access: You cannot view or download another associate's transaction receipt",
        });
      }
    } else if (req.user.role === "client") {
      if (transaction.buyer_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message:
            "Unauthorized access: You cannot view another customer's transaction receipt",
        });
      }
    }

    let payment = await Payment.findOne({
      where: { transaction_id: transaction.id },
      order: [["id", "DESC"]],
    });

    if (!payment) {
      payment = {
        id: transaction.id,
        receipt_no: `REC-${transaction.transaction_ref || transaction.id}`,
        amount: transaction.paid_amount || 0,
        paid_on: transaction.deal_date || transaction.createdAt || new Date(),
        payment_mode: "Bank Transfer",
      };
    }

    let settings = (await AppSettings.findOne()) || {};

    const pdfPath = await generatePaymentReceiptPdf({
      payment,
      transaction,
      plot: transaction.plot,
      buyer: transaction.buyer,
      sellerAssociate: transaction.sellerAssociate,
      companySettings: settings,
    });

    res.download(
      pdfPath,
      `Receipt-${payment.receipt_no || transaction.transaction_ref || transaction.id}.pdf`,
    );
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// COMMISSION AUDIT & RECONCILIATION ENGINE (Section 4)
// Independently recalculates expected commission from saved hierarchy and rates,
// then compares against posted ledger entries. Flags any discrepancy.
// =============================================================================
const getCommissionAuditReport = async (req, res, next) => {
  try {
    const { transaction_id, associate_id, status_filter } = req.query;
    const {
      calculateExactCommission,
      roundCurrency: rc,
      roundPercent,
    } = require("../services/commissionEngine");

    // Build filter
    const txWhere = { type: "sale", status: "completed" };
    if (transaction_id) txWhere.id = transaction_id;
    if (associate_id) txWhere.seller_associate_id = associate_id;

    const transactions = await Transaction.findAll({
      where: txWhere,
      include: [
        {
          model: Plot,
          as: "plot",
          attributes: [
            "id",
            "plot_code",
            "plot_number",
            "title",
            "price",
            "basic_price",
          ],
        },
        {
          model: User,
          as: "sellerAssociate",
          attributes: [
            "id",
            "name",
            "login_id",
            "commission_percent",
            "referred_by",
          ],
        },
        {
          model: Commission,
          as: "commissions",
          include: [
            {
              model: User,
              as: "earner",
              attributes: ["id", "name", "login_id", "commission_percent"],
            },
            { model: CommissionPayment, as: "payments" },
          ],
        },
      ],
      order: [["deal_date", "DESC"]],
      limit: 500,
    });

    const auditRows = [];

    for (const txn of transactions) {
      const txnJson = txn.toJSON();
      const sellerAssoc = txnJson.sellerAssociate;
      if (!sellerAssoc) {
        // No associate on this transaction — skip
        auditRows.push({
          sale_id: txn.id,
          transaction_ref: txn.transaction_ref,
          plot_id: txnJson.plot?.id,
          plot_code: txnJson.plot?.plot_code || txnJson.plot?.plot_number,
          selling_associate: null,
          commission_recipient: null,
          expected_percent: 0,
          expected_commission: 0,
          posted_commission: 0,
          variance: 0,
          approved_amount: 0,
          paid_amount: 0,
          remaining_payable: 0,
          status: "Missing Ledger Entry",
          notes: "No selling associate recorded on transaction",
        });
        continue;
      }

      // Build upline chain from DB
      const chain = [];
      let currentId = sellerAssoc.id;
      let currentPercent = roundPercent(sellerAssoc.commission_percent || 0);
      let highestPercent = 0;
      const visited = new Set();

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const u = await User.findByPk(currentId, {
          attributes: [
            "id",
            "name",
            "login_id",
            "commission_percent",
            "referred_by",
            "role",
          ],
        });
        if (!u) break;
        chain.push(u.toJSON());
        currentId = u.referred_by;
      }

      // Add admin if not in chain
      const adminUser = await User.findOne({
        where: { role: "admin" },
        order: [["id", "ASC"]],
        attributes: ["id", "name", "login_id", "commission_percent", "role"],
      });
      if (adminUser && !visited.has(adminUser.id)) {
        chain.push(adminUser.toJSON());
      }

      // Calculate eligible difference (prefer stored eligible_difference from commission record)
      const firstComm = txnJson.commissions && txnJson.commissions[0];
      const eligibleDiff =
        firstComm && Number(firstComm.eligible_difference) > 0
          ? parseFloat(firstComm.eligible_difference)
          : basePrice > 0 && salePrice > basePrice
            ? roundCurrency(salePrice - basePrice)
            : salePrice;

      // Build expected distribution
      let prevHighestPercent = 0;
      const expectedEntries = [];

      for (const member of chain) {
        const memberPercent = roundPercent(member.commission_percent || 0);
        if (memberPercent > prevHighestPercent) {
          const diffPercent = roundPercent(memberPercent - prevHighestPercent);
          const expectedAmt = calculateExactCommission(
            eligibleDiff,
            diffPercent,
          );
          expectedEntries.push({
            user_id: member.id,
            name: member.name,
            login_id: member.login_id,
            cumulative_percent: memberPercent,
            differential_percent: diffPercent,
            expected_commission: expectedAmt,
          });
          prevHighestPercent = memberPercent;
        } else if (
          memberPercent < prevHighestPercent &&
          member.role !== "admin"
        ) {
          // Flagged hierarchy anomaly — lower rate upline
          expectedEntries.push({
            user_id: member.id,
            name: member.name,
            login_id: member.login_id,
            cumulative_percent: memberPercent,
            differential_percent: 0,
            expected_commission: 0,
            flag: `Hierarchy anomaly: ${member.name} (${memberPercent}%) lower than downline`,
          });
        }
      }

      // Match posted commissions vs expected
      const postedCommissions = txnJson.commissions || [];

      // Union of all people expected or posted
      const allUserIds = new Set([
        ...expectedEntries.map((e) => e.user_id),
        ...postedCommissions.map((p) => p.user_id),
      ]);

      for (const uid of allUserIds) {
        const expected = expectedEntries.find((e) => e.user_id === uid);
        const posted = postedCommissions.filter((p) => p.user_id === uid);
        const postedAmt = rc(
          posted.reduce((s, p) => s + parseFloat(p.amount || 0), 0),
        );
        const approvedAmt = rc(
          posted
            .filter((p) =>
              ["approved", "credited", "partial", "paid"].includes(p.status),
            )
            .reduce((s, p) => s + parseFloat(p.amount || 0), 0),
        );
        const paidAmt = rc(
          posted.reduce((s, p) => s + parseFloat(p.paid_amount || 0), 0),
        );
        const remainingAmt = rc(
          posted.reduce((s, p) => s + parseFloat(p.remaining_amount || 0), 0),
        );
        const expectedAmt = expected ? expected.expected_commission : 0;
        const variance = rc(postedAmt - expectedAmt);

        let reconcStatus;
        if (posted.length === 0) {
          reconcStatus = "Missing Ledger Entry";
        } else if (posted.length > 1) {
          reconcStatus = "Duplicate Entry";
        } else if (posted[0]?.is_flagged) {
          reconcStatus = "Requires Review";
        } else if (posted[0]?.status === "reversed") {
          reconcStatus = "Reversed";
        } else if (Math.abs(variance) < 0.01) {
          if (paidAmt >= postedAmt && postedAmt > 0) reconcStatus = "Matched";
          else if (paidAmt > 0 && paidAmt < postedAmt)
            reconcStatus = "Pending Payment";
          else if (posted[0]?.status === "pending")
            reconcStatus = "Pending Approval";
          else reconcStatus = "Matched";
        } else if (variance > 0) {
          reconcStatus = "Overpaid";
        } else {
          reconcStatus = "Underpaid";
        }

        // Apply status filter if requested
        if (status_filter && reconcStatus !== status_filter) continue;

        // Find earner name
        const recipientUser = expected
          ? { name: expected.name, login_id: expected.login_id }
          : posted[0]?.earner || {};

        auditRows.push({
          sale_id: txn.id,
          transaction_ref: txn.transaction_ref,
          plot_id: txnJson.plot?.id,
          plot_code: txnJson.plot?.plot_code || txnJson.plot?.plot_number,
          selling_associate: sellerAssoc
            ? {
                id: sellerAssoc.id,
                name: sellerAssoc.name,
                login_id: sellerAssoc.login_id,
              }
            : null,
          commission_recipient: {
            id: uid,
            name: recipientUser.name,
            login_id: recipientUser.login_id,
          },
          eligible_difference: eligibleDiff,
          expected_percent: expected ? expected.differential_percent : 0,
          expected_commission: expectedAmt,
          posted_commission: postedAmt,
          variance,
          approved_amount: approvedAmt,
          paid_amount: paidAmt,
          remaining_payable: remainingAmt,
          commission_ids: posted.map((p) => p.id),
          commission_statuses: posted.map((p) => p.status),
          status: reconcStatus,
          flag_reason: expected?.flag || posted[0]?.flag_reason || null,
        });
      }
    }

    // Summary counts
    const summary = {
      total_rows: auditRows.length,
      matched: auditRows.filter((r) => r.status === "Matched").length,
      pending_approval: auditRows.filter((r) => r.status === "Pending Approval")
        .length,
      pending_payment: auditRows.filter((r) => r.status === "Pending Payment")
        .length,
      underpaid: auditRows.filter((r) => r.status === "Underpaid").length,
      overpaid: auditRows.filter((r) => r.status === "Overpaid").length,
      missing: auditRows.filter((r) => r.status === "Missing Ledger Entry")
        .length,
      duplicate: auditRows.filter((r) => r.status === "Duplicate Entry").length,
      reversed: auditRows.filter((r) => r.status === "Reversed").length,
      requires_review: auditRows.filter((r) => r.status === "Requires Review")
        .length,
    };

    res.json({
      success: true,
      summary,
      count: auditRows.length,
      data: auditRows,
    });
  } catch (error) {
    next(error);
  }
};

// Reprocess (fill missing) commissions for a completed sale transaction
// Only creates NEW commission entries — never modifies existing ones
const reprocessSaleCommissions = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { transaction_id } = req.params;
    const {
      processCommissionForAssociate,
    } = require("../services/commissionEngine");

    const txn = await Transaction.findByPk(transaction_id, {
      include: [
        { model: Plot, as: "plot", attributes: ["id", "basic_price", "price"] },
        {
          model: User,
          as: "sellerAssociate",
          attributes: [
            "id",
            "name",
            "login_id",
            "commission_percent",
            "referred_by",
          ],
        },
      ],
      transaction: t,
    });

    if (!txn) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }
    if (txn.type !== "sale") {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Commission reprocessing only applies to sale transactions",
      });
    }
    if (!txn.seller_associate_id) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "No selling associate on this transaction",
      });
    }

    const salePrice = parseFloat(txn.amount || 0);
    const basePrice = parseFloat(txn.plot?.basic_price || 0);

    const created = await processCommissionForAssociate(
      txn.seller_associate_id,
      salePrice,
      txn.id,
      "seller_side",
      false,
      t,
      "pending",
      { basePrice, salePrice },
    );

    await logAudit({
      userId: req.user.id,
      action: "COMMISSION_REPROCESS",
      entityType: "transaction",
      entityId: txn.id,
      newValues: { created_count: created.length },
      notes: `Admin ${req.user.name} reprocessed commissions for Transaction #${txn.id}`,
      ipAddress: req.ip,
    });

    await t.commit();
    res.json({
      success: true,
      message: `Reprocessed ${created.length} commission entries for Transaction #${txn.id}. Only missing entries were created.`,
      data: created,
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAssociatesAccountsList,
  getAssociateAccountDetails,
  getCommissionLedger,
  searchAssociatesForCommission,
  getAssociateCommissionLedger,
  payCommission,
  updateCommissionStatus,
  bulkUpdateCommissions,
  getCommissionSlipData,
  getAccountsTransactions,
  recordCustomerPayment,
  getPaymentsLedger,
  getIncomeExpensesSummary,
  addIncomeExpense,
  getAuditLogsList,
  getPaymentVerifications,
  updatePaymentStatus,
  getPayoutRequests,
  processPayout,
  getInvoiceData,
  getInvoiceList,
  getFinancialReports,
  getAllWallets,
  exportTransactions,
  createComplaint,
  getMyComplaints,
  getMyNotifications,
  downloadPaymentReceiptPdf,
  downloadTransactionReceiptPdf,
  getCommissionAuditReport,
  reprocessSaleCommissions,
};
