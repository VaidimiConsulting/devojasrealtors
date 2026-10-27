/**
 * DAILY REPORT CONTROLLER
 * Serves the complete Accounts Daily Records & Reporting system.
 *
 * Data sources (read-only, never duplicated):
 *   - transactions  →  bookings / plot sales
 *   - payments      →  payment collections
 *   - emi_installments (where paid_on matches date)  →  EMI collections
 *   - daily_records →  manual expense / other records
 *   - daily_reports →  submitted report metadata & approval state
 */
const { Op, fn, col, literal } = require('sequelize');
const {
  DailyReport, DailyRecord, Transaction, Payment,
  EmiInstallment, EmiPlan, User, Plot, Project
} = require('../models');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dateRange = (dateStr) => {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { [Op.between]: [start, end] };
};

const BANK_MODES = ['UPI', 'Bank Transfer (NEFT/RTGS)', 'Cheque', 'NEFT', 'RTGS', 'Online'];
const isBankMode = (m) => BANK_MODES.some(b => (m || '').toLowerCase().includes(b.toLowerCase()));

// ─── 1. GET DAILY SUMMARY DATA ────────────────────────────────────────────────
// @route GET /api/daily-reports/summary?date=YYYY-MM-DD
exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'date query param required (YYYY-MM-DD)' });

    const dr = dateRange(date);

    // ── Transactions (bookings/sales) on this date ──
    const transactions = await Transaction.findAll({
      where: { deal_date: dr },
      include: [
        { model: User, as: 'buyer', attributes: ['id', 'name', 'login_id', 'phone'] },
        { model: User, as: 'sellerAssociate', attributes: ['id', 'name', 'login_id'] },
        { model: Plot, as: 'plot', attributes: ['id', 'plot_number', 'size_sqft', 'block', 'price'] },
      ],
      order: [['deal_date', 'DESC']]
    });

    // ── Payments on this date ──
    const payments = await Payment.findAll({
      where: { paid_on: dr },
      include: [
        {
          model: Transaction, as: 'transaction',
          include: [
            { model: User, as: 'buyer', attributes: ['id', 'name', 'login_id', 'phone'] },
            { model: Plot, as: 'plot', attributes: ['id', 'plot_number', 'block'] },
          ]
        },
        { model: User, as: 'recordedByUser', attributes: ['id', 'name', 'login_id'] }
      ],
      order: [['paid_on', 'DESC']]
    });

    // ── EMI installments paid on this date ──
    const emiInstallments = await EmiInstallment.findAll({
      where: { paid_on: dr },
      include: [
        {
          model: EmiPlan, as: 'emiPlan',
          include: [
            {
              model: Transaction, as: 'transaction',
              include: [
                { model: User, as: 'buyer', attributes: ['id', 'name', 'login_id', 'phone'] },
                { model: Plot, as: 'plot', attributes: ['id', 'plot_number', 'block'] },
              ]
            }
          ]
        }
      ],
      order: [['paid_on', 'DESC']]
    });

    // ── Manual expenses/records for this date ──
    const dailyRecords = await DailyRecord.findAll({
      where: { record_date: date },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'login_id'] }],
      order: [['createdAt', 'DESC']]
    });

    // ── Calculate summary ──
    const successPayments = payments.filter(p => ['verified', 'pending'].includes(p.status));
    const failedPayments  = payments.filter(p => ['rejected', 'refunded'].includes(p.status));

    // Separate transaction-level booking payments vs EMI
    // EMI paid_on matches: we identify them by emi_installments. Don't double count.
    const emiPlanIds = new Set(emiInstallments.map(i => i.emi_plan_id));

    // Booking/downpayment = payments whose transaction does NOT have matching EMI installments paid today
    const bookingPayments = successPayments.filter(p => {
      // If the transaction has an EMI plan AND an installment was paid today, it's EMI money
      // Otherwise it's a booking/down-payment
      return true; // all payments from payments table are booking/down-payment collections
    });
    // EMI money collected = from emi_installments paid today (these update transaction.paid_amount too,
    // but the PAYMENT row is not in payments table — it's tracked only in emi_installments)
    const emiCollectedToday = emiInstallments.reduce((s, i) => s + parseFloat(i.paid_amount || 0), 0);

    const totalPaymentCollections = bookingPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const totalCollections = totalPaymentCollections + emiCollectedToday;

    const cashPayments = successPayments.filter(p => !isBankMode(p.payment_mode));
    const bankPayments = successPayments.filter(p => isBankMode(p.payment_mode));
    const cashCollection = cashPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const bankCollection = bankPayments.reduce((s, p) => s + parseFloat(p.amount), 0);

    const expenses = dailyRecords.filter(r => r.type === 'expense');
    const totalExpenses = expenses.reduce((s, r) => s + parseFloat(r.amount), 0);

    const overdueEmi = emiInstallments.filter(i => {
      const due = new Date(i.due_date); due.setHours(0,0,0,0);
      const paid = new Date(i.paid_on); paid.setHours(0,0,0,0);
      return paid > due;
    });

    const salesValue = transactions.reduce((s, t) => s + parseFloat(t.amount), 0);

    const summary = {
      date,
      new_bookings:        transactions.length,
      sales_value:         salesValue,
      total_collections:   totalCollections,
      booking_collections: totalPaymentCollections,
      emi_collections:     emiCollectedToday,
      other_collections:   0,
      cash_collections:    cashCollection,
      bank_collections:    bankCollection,
      total_expenses:      totalExpenses,
      pending_count:       failedPayments.length,
      overdue_emi_count:   overdueEmi.length,
    };

    // ── Check existing report for this date (submitted by this user) ──
    const existingReport = await DailyReport.findOne({
      where: { report_date: date, submitted_by: req.user.id },
      include: [
        { model: User, as: 'submitter', attributes: ['id', 'name', 'login_id'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name', 'login_id'] }
      ]
    });

    res.json({
      success: true,
      data: {
        summary,
        transactions: transactions.map(t => t.toJSON()),
        payments: payments.map(p => p.toJSON()),
        emi_installments: emiInstallments.map(i => i.toJSON()),
        daily_records: dailyRecords.map(r => r.toJSON()),
        existing_report: existingReport ? existingReport.toJSON() : null
      }
    });
  } catch (error) {
    console.error('getDailySummary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 2. SAVE / UPDATE DRAFT ───────────────────────────────────────────────────
// @route POST /api/daily-reports/draft
exports.saveDraft = async (req, res) => {
  try {
    const { report_date, remarks, summary } = req.body;
    if (!report_date) return res.status(400).json({ success: false, message: 'report_date required' });

    let report = await DailyReport.findOne({
      where: { report_date, submitted_by: req.user.id }
    });

    const snap = summary || {};
    const fields = {
      report_date,
      remarks,
      snap_new_bookings:        snap.new_bookings || 0,
      snap_sales_value:         snap.sales_value || 0,
      snap_total_collections:   snap.total_collections || 0,
      snap_booking_collections: snap.booking_collections || 0,
      snap_emi_collections:     snap.emi_collections || 0,
      snap_other_collections:   snap.other_collections || 0,
      snap_cash_collections:    snap.cash_collections || 0,
      snap_bank_collections:    snap.bank_collections || 0,
      snap_expenses:            snap.total_expenses || 0,
      snap_pending_count:       snap.pending_count || 0,
      snap_overdue_emi_count:   snap.overdue_emi_count || 0,
    };

    if (report) {
      if (['approved'].includes(report.status)) {
        return res.status(400).json({ success: false, message: 'Cannot edit an approved report.' });
      }
      if (report.status === 'submitted') {
        // Allow editing draft fields if not yet reviewed
        report.status = 'draft';
      }
      await report.update({ ...fields, status: report.status === 'submitted' ? 'draft' : report.status });
    } else {
      report = await DailyReport.create({
        ...fields,
        status: 'draft',
        submitted_by: req.user.id
      });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 3. SUBMIT REPORT ─────────────────────────────────────────────────────────
// @route POST /api/daily-reports/submit
exports.submitReport = async (req, res) => {
  try {
    const { report_date, remarks, summary } = req.body;
    if (!report_date) return res.status(400).json({ success: false, message: 'report_date required' });

    let report = await DailyReport.findOne({
      where: { report_date, submitted_by: req.user.id }
    });

    if (report && report.status === 'approved') {
      return res.status(400).json({ success: false, message: 'An approved report for this date already exists. Contact Admin.' });
    }

    const snap = summary || {};
    const fields = {
      report_date,
      remarks,
      status: 'submitted',
      submitted_at: new Date(),
      snap_new_bookings:        snap.new_bookings || 0,
      snap_sales_value:         snap.sales_value || 0,
      snap_total_collections:   snap.total_collections || 0,
      snap_booking_collections: snap.booking_collections || 0,
      snap_emi_collections:     snap.emi_collections || 0,
      snap_other_collections:   snap.other_collections || 0,
      snap_cash_collections:    snap.cash_collections || 0,
      snap_bank_collections:    snap.bank_collections || 0,
      snap_expenses:            snap.total_expenses || 0,
      snap_pending_count:       snap.pending_count || 0,
      snap_overdue_emi_count:   snap.overdue_emi_count || 0,
      // clear previous rejection
      reviewed_by: null,
      reviewed_at: null,
      reject_reason: null
    };

    if (report) {
      await report.update(fields);
    } else {
      report = await DailyReport.create({ ...fields, submitted_by: req.user.id });
    }

    const full = await DailyReport.findByPk(report.id, {
      include: [
        { model: User, as: 'submitter', attributes: ['id', 'name', 'login_id'] }
      ]
    });

    res.json({ success: true, message: 'Report submitted successfully. Pending Admin review.', data: full });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 4. GET REPORT HISTORY (Accounts sees own, Admin sees all) ────────────────
// @route GET /api/daily-reports
exports.getReports = async (req, res) => {
  try {
    const { status, from, to, accounts_user } = req.query;
    const where = {};

    if (req.user.role !== 'admin') {
      where.submitted_by = req.user.id;
    } else if (accounts_user) {
      where.submitted_by = accounts_user;
    }

    if (status && status !== 'all') where.status = status;
    if (from || to) {
      where.report_date = {};
      if (from) where.report_date[Op.gte] = from;
      if (to)   where.report_date[Op.lte] = to;
    }

    const reports = await DailyReport.findAll({
      where,
      include: [
        { model: User, as: 'submitter', attributes: ['id', 'name', 'login_id'] },
        { model: User, as: 'reviewer',  attributes: ['id', 'name', 'login_id'] }
      ],
      order: [['report_date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 5. GET SINGLE REPORT (with live data) ────────────────────────────────────
// @route GET /api/daily-reports/:id
exports.getReportById = async (req, res) => {
  try {
    const report = await DailyReport.findByPk(req.params.id, {
      include: [
        { model: User, as: 'submitter', attributes: ['id', 'name', 'login_id'] },
        { model: User, as: 'reviewer',  attributes: ['id', 'name', 'login_id'] }
      ]
    });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    // Authorization: accounts can only see their own
    if (req.user.role !== 'admin' && report.submitted_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Fetch live data for the report date
    const date = report.report_date;
    const dr = dateRange(date);

    const [transactions, payments, emiInstallments, dailyRecords] = await Promise.all([
      Transaction.findAll({
        where: { deal_date: dr },
        include: [
          { model: User, as: 'buyer', attributes: ['id', 'name', 'login_id', 'phone'] },
          { model: User, as: 'sellerAssociate', attributes: ['id', 'name', 'login_id'] },
          { model: Plot, as: 'plot', attributes: ['id', 'plot_number', 'size_sqft', 'block', 'price'] },
        ]
      }),
      Payment.findAll({
        where: { paid_on: dr },
        include: [
          { model: Transaction, as: 'transaction',
            include: [
              { model: User, as: 'buyer', attributes: ['id', 'name', 'login_id', 'phone'] },
              { model: Plot, as: 'plot', attributes: ['id', 'plot_number', 'block'] }
            ]
          },
          { model: User, as: 'recordedByUser', attributes: ['id', 'name', 'login_id'] }
        ]
      }),
      EmiInstallment.findAll({
        where: { paid_on: dr },
        include: [{
          model: EmiPlan, as: 'emiPlan',
          include: [{
            model: Transaction, as: 'transaction',
            include: [
              { model: User, as: 'buyer', attributes: ['id', 'name', 'login_id', 'phone'] },
              { model: Plot, as: 'plot', attributes: ['id', 'plot_number', 'block'] }
            ]
          }]
        }]
      }),
      DailyRecord.findAll({ where: { record_date: date }, include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'login_id'] }] })
    ]);

    res.json({
      success: true,
      data: {
        report: report.toJSON(),
        transactions: transactions.map(t => t.toJSON()),
        payments: payments.map(p => p.toJSON()),
        emi_installments: emiInstallments.map(i => i.toJSON()),
        daily_records: dailyRecords.map(r => r.toJSON())
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 6. ADMIN — APPROVE REPORT ────────────────────────────────────────────────
// @route PUT /api/daily-reports/:id/approve
exports.approveReport = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can approve reports' });
    }
    const report = await DailyReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.status !== 'submitted') {
      return res.status(400).json({ success: false, message: `Report is currently '${report.status}'. Can only approve 'submitted' reports.` });
    }

    await report.update({
      status: 'approved',
      reviewed_by: req.user.id,
      reviewed_at: new Date(),
      reject_reason: null
    });

    const full = await DailyReport.findByPk(report.id, {
      include: [
        { model: User, as: 'submitter', attributes: ['id', 'name', 'login_id'] },
        { model: User, as: 'reviewer',  attributes: ['id', 'name', 'login_id'] }
      ]
    });

    res.json({ success: true, message: 'Report approved.', data: full });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 7. ADMIN — REJECT REPORT ─────────────────────────────────────────────────
// @route PUT /api/daily-reports/:id/reject
exports.rejectReport = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can reject reports' });
    }
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }
    const report = await DailyReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!['submitted', 'approved'].includes(report.status)) {
      return res.status(400).json({ success: false, message: `Cannot reject a report with status '${report.status}'` });
    }

    await report.update({
      status: 'rejected',
      reviewed_by: req.user.id,
      reviewed_at: new Date(),
      reject_reason: reason
    });

    const full = await DailyReport.findByPk(report.id, {
      include: [
        { model: User, as: 'submitter', attributes: ['id', 'name', 'login_id'] },
        { model: User, as: 'reviewer',  attributes: ['id', 'name', 'login_id'] }
      ]
    });

    res.json({ success: true, message: 'Report rejected.', data: full });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 8. GET ACCOUNTS USERS (Admin filter helper) ──────────────────────────────
// @route GET /api/daily-reports/accounts-users
exports.getAccountsUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const users = await User.findAll({
      where: { role: 'accounts', status: 'active' },
      attributes: ['id', 'name', 'login_id', 'email']
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
