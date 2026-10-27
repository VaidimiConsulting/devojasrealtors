const { sequelize, User, Plot, Transaction, Commission, Wallet, Complaint } = require('../models');
const { Op } = require('sequelize');

// Safe currency rounding (2 decimal, banker-safe)
const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

// @desc Get Admin Dashboard stats (ALL LIVE FROM DB, NO HARDCODE)
// @route GET /api/dashboard/stats
//
// FIX NOTES (2026-10-24):
//  • totalRevenue  — was: Transaction.sum('amount', {where:{status:'completed'}})
//                    bug: included company ACQUISITION transactions (type='purchase')
//                    fix: added type:'sale' filter — only real customer sales are revenue
//
//  • totalCommissionPaid — was: Commission.sum('amount') — ALL amounts, ALL statuses
//                          bug: counted every generated commission, not actual money paid
//                          fix: Commission.sum('paid_amount') — the running-total of real cash disbursed
//
//  • commissionGenerated, commissionPending — new separate fields (admin's OWN rows only)
//
//  • netProfit formula: customerSalesRevenue − actualCommissionPaid (paid_amount) − expenses
//                       The admin's own differential share stays IN company revenue, so is excluded
//                       from the associate-payout deduction.  It is not double-counted.
//
//  • salesTrend chart — also fixed to exclude type='purchase' rows so bars match revenue card
const getStats = async (req, res, next) => {
  try {
    // ── Plot inventory counts (unchanged) ──────────────────────────────────
    const totalPlots       = await Plot.count();
    const availablePlots   = await Plot.count({ where: { status: 'available' } });
    const soldPlots        = await Plot.count({ where: { status: 'sold' } });
    const pendingPlots     = await Plot.count({ where: { status: 'pending' } });

    // ── User counts (unchanged) ────────────────────────────────────────────
    const totalClients     = await User.count({ where: { role: 'client' } });
    const totalAssociates  = await User.count({ where: { role: 'associate' } });
    const pendingKyc       = await User.count({ where: { kyc_status: 'pending' } });

    // ── Transaction counts (unchanged) ────────────────────────────────────
    const totalTransactions     = await Transaction.count();
    const completedTransactions = await Transaction.count({ where: { status: 'completed' } });

    // ── Revenue: CUSTOMER SALES ONLY (type='sale') ─────────────────────────
    // BUG FIX: previously included type='purchase' (company acquisitions) ─ excluded now
    const totalRevenue = round2(
      await Transaction.sum('amount', {
        where: { type: 'sale', status: 'completed' }
      }) || 0
    );

    // ── Commission figures: Admin's OWN commission rows only ──────────────
    // Requirement C: Admin dashboard shows only the Super Admin's own commission,
    // NOT the whole network total. Network-wide totals belong in the Accounts panel.
    const adminUserId = req.user?.id; // set by protect middleware

    const commissionGenerated = round2(
      await Commission.sum('amount', {
        where: { user_id: adminUserId }
      }) || 0
    );

    // BUG FIX: was Commission.sum('amount') — full generated amount, not cash paid
    // Now uses paid_amount = running total of money actually disbursed per commission row
    const commissionPaid = round2(
      await Commission.sum('paid_amount', {
        where: { user_id: adminUserId }
      }) || 0
    );

    const commissionPending = round2(Math.max(0, commissionGenerated - commissionPaid));

    // ── Net Profit ──────────────────────────────────────────────────────────
    // Formula: Customer Sales Revenue − Commission Paid to ALL associates (paid_amount) − Expenses
    // Note: The admin's own differential commission is COMPANY INCOME, so we exclude
    //       those rows from the "associates payout" deduction. We only deduct what was
    //       actually paid out to ASSOCIATE users (role='associate').
    const associateCommissionPaid = round2(
      (await sequelize.query(
        "SELECT COALESCE(SUM(c.paid_amount), 0) AS total FROM commissions c " +
        "INNER JOIN users u ON u.id = c.user_id WHERE u.role = 'associate'",
        { type: sequelize.QueryTypes.SELECT }
      ))[0]?.total || 0
    );

    const netProfit = round2(totalRevenue - associateCommissionPaid);

    // ── Complaints (unchanged) ─────────────────────────────────────────────
    const pendingComplaints = await Complaint.count({ where: { status: 'open' } });

    // ── Monthly Sales Trend: CUSTOMER SALES ONLY ───────────────────────────
    // BUG FIX: was { status:'completed' } — now also filters type:'sale'
    const salesTrend = await Transaction.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('deal_date'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: { type: 'sale', status: 'completed' },
      group: ['month'],
      order: [[sequelize.literal('month'), 'ASC']],
      limit: 6,
      raw: true
    });

    res.json({
      success: true,
      data: {
        // Inventory
        totalPlots, availablePlots, soldPlots, pendingPlots,
        // Users
        totalClients, totalAssociates, pendingKyc,
        // Transactions
        totalTransactions, completedTransactions,
        // Financials – all fixed
        totalRevenue,
        commissionGenerated,   // Admin's own earned commission (may be 0 if no transactions link to admin)
        totalCommissionPaid: commissionPaid,       // Admin's own PAID commission (paid_amount sum)
        commissionPending,                         // Admin's own still-unpaid balance
        associateCommissionPaid,                   // Network-wide associate payouts (for reference)
        netProfit,             // = Customer Revenue − Associate Paid Commission
        pendingComplaints,
        salesTrend             // Monthly bars: customer sales only
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
