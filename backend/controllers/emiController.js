/**
 * EMI CONTROLLER
 * Admin/Accounts creates an EMI plan for a transaction — remaining amount
 * is split into equal monthly installments, auto-generated. Nothing here
 * is hardcoded; all numbers come from what's entered when the plan is made.
 */
const { Op } = require('sequelize');
const { EmiPlan, EmiInstallment, Transaction, User } = require('../models');
const Plot = require('../models/Plot');

// Helper: compute live status for each installment row
const computeInstallmentStatus = (inst) => {
  if (inst.status === 'paid') return 'paid';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(inst.due_date);
  due.setHours(0, 0, 0, 0);
  if (due < today) return 'overdue';
  return 'pending';
};

// @desc  Get all EMI plans (with live status)
// @route GET /api/emi-plans
const getAllEmiPlans = async (req, res, next) => {
  try {
    const plans = await EmiPlan.findAll({
      include: [
        { model: EmiInstallment, as: 'installments', order: [['month_number', 'ASC']] },
        {
          model: Transaction, as: 'transaction',
          include: [
            { model: User, as: 'buyer' },
            { model: User, as: 'sellerAssociate' },
            { model: Plot, as: 'plot' }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Attach live computed status
    const data = plans.map(p => {
      const plain = p.toJSON();
      plain.installments = plain.installments.map(inst => ({
        ...inst,
        computed_status: inst.status === 'paid' ? 'paid' : computeInstallmentStatus(inst)
      }));
      return plain;
    });

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

// @desc  Get transactions eligible for EMI (no existing plan, payment_status != 'paid')
// @route GET /api/emi-eligible-transactions
const getEligibleTransactions = async (req, res, next) => {
  try {
    // Find all transaction IDs that already have an EMI plan
    const existing = await EmiPlan.findAll({ attributes: ['transaction_id'] });
    const usedIds = existing.map(e => e.transaction_id);

    const transactions = await Transaction.findAll({
      where: {
        id: usedIds.length > 0 ? { [Op.notIn]: usedIds } : { [Op.gte]: 0 },
        payment_status: { [Op.ne]: 'paid' }
      },
      include: [
        { model: User, as: 'buyer', attributes: ['id', 'name', 'login_id', 'phone', 'email', 'address'] },
        { model: User, as: 'sellerAssociate', attributes: ['id', 'name', 'login_id', 'phone'] },
        { model: Plot, as: 'plot', attributes: ['id', 'plot_number', 'size_sqft', 'block', 'dimensions', 'facing'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: transactions });
  } catch (error) { next(error); }
};

// @desc  Create EMI plan for a transaction + auto-generate installment rows
// @route POST /api/transactions/:id/emi
const createEmiPlan = async (req, res, next) => {
  try {
    const { down_payment, num_months, start_date } = req.body;
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        { model: User, as: 'buyer' },
        { model: User, as: 'sellerAssociate' },
        { model: Plot, as: 'plot' }
      ]
    });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const existing = await EmiPlan.findOne({ where: { transaction_id: transaction.id } });
    if (existing) return res.status(400).json({ success: false, message: 'EMI plan already exists for this transaction' });

    const totalAmount = parseFloat(transaction.amount);
    const alreadyPaid = parseFloat(transaction.paid_amount) || 0;
    const downPayment = parseFloat(down_payment) || 0;
    const remaining = totalAmount - alreadyPaid - downPayment;
    if (remaining <= 0) {
      return res.status(400).json({ success: false, message: 'No remaining balance to split into EMI' });
    }
    const months = parseInt(num_months);
    if (months < 1) return res.status(400).json({ success: false, message: 'Number of months must be at least 1' });
    const monthlyAmount = Math.round((remaining / months) * 100) / 100;

    const plan = await EmiPlan.create({
      transaction_id: transaction.id,
      total_amount: totalAmount,
      down_payment: downPayment,
      num_months: months,
      monthly_amount: monthlyAmount,
      start_date,
      created_by: req.user.id
    });

    // Auto-generate installment rows
    const installments = [];
    const baseDate = new Date(start_date);
    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      const isLast = i === months;
      // Last installment absorbs any rounding difference
      const amt = isLast
        ? Math.round((remaining - monthlyAmount * (months - 1)) * 100) / 100
        : monthlyAmount;
      installments.push({
        emi_plan_id: plan.id,
        month_number: i,
        due_date: dueDate.toISOString().split('T')[0],
        amount: amt,
        paid_amount: 0,
        status: 'pending'
      });
    }
    await EmiInstallment.bulkCreate(installments);

    // If a down payment is given, add it to the transaction paid_amount
    if (downPayment > 0) {
      transaction.paid_amount = alreadyPaid + downPayment;
      transaction.payment_status = transaction.paid_amount >= totalAmount ? 'paid' : 'unpaid';
      await transaction.save();
    }

    const fullPlan = await EmiPlan.findByPk(plan.id, {
      include: [
        { model: EmiInstallment, as: 'installments', order: [['month_number', 'ASC']] },
        {
          model: Transaction, as: 'transaction',
          include: [
            { model: User, as: 'buyer' },
            { model: User, as: 'sellerAssociate' },
            { model: Plot, as: 'plot' }
          ]
        }
      ]
    });
    res.status(201).json({ success: true, data: fullPlan });
  } catch (error) { next(error); }
};

// @desc  Get EMI plan + installments for a transaction
// @route GET /api/transactions/:id/emi
const getEmiPlan = async (req, res, next) => {
  try {
    const plan = await EmiPlan.findOne({
      where: { transaction_id: req.params.id },
      include: [
        { model: EmiInstallment, as: 'installments', order: [['month_number', 'ASC']] },
        {
          model: Transaction, as: 'transaction',
          include: [
            { model: User, as: 'buyer' },
            { model: User, as: 'sellerAssociate' },
            { model: Plot, as: 'plot' }
          ]
        }
      ]
    });
    if (!plan) return res.json({ success: true, data: null });
    res.json({ success: true, data: plan });
  } catch (error) { next(error); }
};

// @desc  Get a single EMI plan by plan ID
// @route GET /api/emi-plans/:id
const getEmiPlanById = async (req, res, next) => {
  try {
    const plan = await EmiPlan.findByPk(req.params.id, {
      include: [
        { model: EmiInstallment, as: 'installments', order: [['month_number', 'ASC']] },
        {
          model: Transaction, as: 'transaction',
          include: [
            { model: User, as: 'buyer' },
            { model: User, as: 'sellerAssociate' },
            { model: Plot, as: 'plot' }
          ]
        }
      ]
    });
    if (!plan) return res.status(404).json({ success: false, message: 'EMI plan not found' });
    res.json({ success: true, data: plan });
  } catch (error) { next(error); }
};

// @desc  Record payment for a specific installment (full or partial)
// @route PUT /api/emi/installments/:id/pay
const markInstallmentPaid = async (req, res, next) => {
  try {
    const { amount_paid, paid_on } = req.body;

    const installment = await EmiInstallment.findByPk(req.params.id, {
      include: [{ model: EmiPlan, as: 'emiPlan' }]
    });
    if (!installment) return res.status(404).json({ success: false, message: 'Installment not found' });
    if (installment.status === 'paid') return res.status(400).json({ success: false, message: 'Already marked as paid' });

    const instAmount = parseFloat(installment.amount);
    const alreadyPaid = parseFloat(installment.paid_amount || 0);
    const paying = parseFloat(amount_paid || instAmount); // default: full amount

    if (paying <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be positive' });
    if (paying > (instAmount - alreadyPaid)) {
      return res.status(400).json({ success: false, message: `Cannot overpay. Remaining: ₹${instAmount - alreadyPaid}` });
    }

    const newPaid = alreadyPaid + paying;
    installment.paid_amount = newPaid;
    installment.paid_on = paid_on ? new Date(paid_on) : new Date();
    installment.recorded_by = req.user.id;

    if (newPaid >= instAmount) {
      installment.status = 'paid';
    } else {
      installment.status = 'pending'; // partial — still pending balance
    }
    await installment.save();

    // Update transaction paid_amount
    const transaction = await Transaction.findByPk(installment.emiPlan.transaction_id);
    transaction.paid_amount = parseFloat(transaction.paid_amount || 0) + paying;
    transaction.payment_status = transaction.paid_amount >= parseFloat(transaction.amount) ? 'paid' : 'unpaid';
    await transaction.save();

    res.json({ success: true, data: installment });
  } catch (error) { next(error); }
};

module.exports = {
  createEmiPlan,
  getEmiPlan,
  getEmiPlanById,
  markInstallmentPaid,
  getAllEmiPlans,
  getEligibleTransactions
};
