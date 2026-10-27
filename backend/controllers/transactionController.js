const { Op } = require('sequelize');
const { sequelize, Transaction, Plot, User, Commission, Wallet, WalletTransaction, Notification, Payment, EmiPlan, EmiInstallment, AppSettings, BookingForm, RewardLog, Slab } = require('../models');
const { processCommissionForAssociate, reverseCommissionForTransaction } = require('../services/commissionEngine');
const { generateBookingPdf } = require('../services/pdfService');
const { sendBookingPdf } = require('../services/emailService');

// @desc Get all transactions
// @route GET /api/transactions
const getTransactions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const transactions = await Transaction.findAll({
      where,
      include: [
        { model: Plot, as: 'plot' },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'sellerAssociate', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'buyerAssociate', attributes: ['id', 'name', 'email'] },
        { model: Commission, as: 'commissions' }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    next(error);
  }
};

// @desc Get single transaction
// @route GET /api/transactions/:id
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        { model: Plot, as: 'plot' },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: Commission, as: 'commissions', include: [{ model: User, as: 'earner', attributes: ['id', 'name'] }] }
      ]
    });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// @desc Create transaction + AUTO CALCULATE & CREDIT COMMISSIONS
// @route POST /api/transactions
const createTransaction = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { plot_id, buyer_id, seller_id, seller_associate_id, buyer_associate_id, amount } = req.body;

    // 1. Create the transaction — payment starts as unpaid (cash payments
    //    are recorded separately over time via the Payment model)
    const transaction = await Transaction.create({
      plot_id, buyer_id, seller_id, seller_associate_id, buyer_associate_id,
      amount, status: 'completed', payment_status: 'unpaid', paid_amount: 0
    }, { transaction: t });

    // 2. Mark plot as sold
    await Plot.update({ status: 'sold' }, { where: { id: plot_id }, transaction: t });

    // 3. Run the slab + upline-chain commission engine for each
    //    closing associate involved in this deal (seller-side & buyer-side)
    let allCommissions = [];
    if (seller_associate_id) {
      // isSelfSale = true for seller-side: the seller associate personally closed this sale
      const isSelfSale = seller_associate_id === buyer_associate_id ? false : true;
      const results = await processCommissionForAssociate(seller_associate_id, amount, transaction.id, 'seller_side', isSelfSale, t);
      allCommissions = allCommissions.concat(results);
    }
    if (buyer_associate_id) {
      // isSelfSale = false for buyer-side: buyer associate helps the buyer, not the seller
      const results = await processCommissionForAssociate(buyer_associate_id, amount, transaction.id, 'buyer_side', false, t);
      allCommissions = allCommissions.concat(results);
    }

    // 4. Notify admin of new completed deal
    await Notification.create({
      user_id: null,
      title: 'New Deal Completed',
      message: `Transaction #${transaction.id} completed for ₹${amount}`,
      type: 'deal'
    }, { transaction: t });

    await t.commit();

    const fullTransaction = await Transaction.findByPk(transaction.id, {
      include: [{ model: Commission, as: 'commissions' }]
    });

    // ---------- Generate the "Plot Price Details" booking PDF & email it ----------
    // Client ne plot purchase kiya — PDF generate karke unke email par bhej do.
    // Isse purchase flow fail nahi hota agar PDF/email me koi issue aaye
    // (best-effort — logged, response abhi bhi success jayega).
    let pdfUrl = null;
    try {
      const plotForPdf = await Plot.findByPk(plot_id);
      const buyerForPdf = await User.findByPk(buyer_id);
      const bookingForm = await BookingForm.findOne({
        where: { plot_id: plot_id },
        order: [['createdAt', 'DESC']]
      });
      let settings = await AppSettings.findOne();
      if (!settings) settings = await AppSettings.create({});

      const pdfPath = await generateBookingPdf({
        transaction: fullTransaction,
        plot: plotForPdf,
        buyer: buyerForPdf,
        companySettings: settings,
        emiPlan: null,
        bookingForm
      });

      pdfUrl = `/uploads/receipts/${require('path').basename(pdfPath)}`;

      if (buyerForPdf?.email) {
        await sendBookingPdf(buyerForPdf, pdfPath, plotForPdf?.title);
      }
    } catch (pdfErr) {
      console.error('Booking PDF generation/email failed (non-blocking):', pdfErr.message);
    }

    res.status(201).json({ success: true, data: fullTransaction, pdf_url: pdfUrl });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// @desc  Generate/download the "Plot Price Details" booking PDF for a transaction
// @route GET /api/transactions/:id/pdf
const getTransactionPdf = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const plot = await Plot.findByPk(transaction.plot_id);
    let buyer = await User.findByPk(transaction.buyer_id);
    const bookingForm = await BookingForm.findOne({
      where: {
        [Op.or]: [
          { plot_id: transaction.plot_id },
          { client_id: transaction.buyer_id }
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    // If buyer name was missing or defaulted to Super Admin (1) for a sale transaction, check bookingForm
    if (bookingForm && bookingForm.applicant_name && (!buyer || buyer.id === 1)) {
      buyer = {
        ...(buyer ? buyer.toJSON() : {}),
        name: bookingForm.applicant_name,
        phone: bookingForm.applicant_phone || buyer?.phone,
        email: bookingForm.applicant_email || buyer?.email,
        address: bookingForm.applicant_address || buyer?.address
      };
    }

    const emiPlan = await EmiPlan.findOne({ where: { transaction_id: transaction.id } });
    let settings = await AppSettings.findOne();
    if (!settings) settings = await AppSettings.create({});

    const pdfPath = await generateBookingPdf({ transaction, plot, buyer, companySettings: settings, emiPlan, bookingForm });
    res.download(pdfPath, 'Plot-Booking-Details.pdf');
  } catch (error) {
    next(error);
  }
};

// @desc Update transaction status
// @route PUT /api/transactions/:id
const updateTransaction = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const transaction = await Transaction.findByPk(req.params.id, { transaction: t });
    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const oldStatus = transaction.status;
    const newStatus = req.body.status;

    await transaction.update(req.body, { transaction: t });

    if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
      await reverseCommissionForTransaction(transaction.id, req.body.cancellation_reason || 'Transaction status set to cancelled', t);
      if (transaction.plot_id) {
        await Plot.update({ status: 'available' }, { where: { id: transaction.plot_id }, transaction: t });
      }
    }

    await t.commit();
    res.json({ success: true, data: transaction });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// @desc Delete/cancel transaction
// @route DELETE /api/transactions/:id
const deleteTransaction = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const transaction = await Transaction.findByPk(req.params.id, { transaction: t });
    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    await reverseCommissionForTransaction(transaction.id, 'Transaction deleted', t);
    if (transaction.plot_id) {
      await Plot.update({ status: 'available' }, { where: { id: transaction.plot_id }, transaction: t });
    }
    await transaction.destroy({ transaction: t });
    await t.commit();
    res.json({ success: true, message: 'Transaction cancelled and deleted successfully' });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// @desc  Record a cash payment against a transaction (partial or full)
// @route POST /api/transactions/:id/payments
const recordPayment = async (req, res, next) => {
  try {
    const { amount, note } = req.body;
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    await Payment.create({
      transaction_id: transaction.id,
      amount,
      recorded_by: req.user.id,
      note: note || null
    });

    const newPaidAmount = parseFloat(transaction.paid_amount) + parseFloat(amount);
    transaction.paid_amount = newPaidAmount;
    transaction.payment_status = newPaidAmount >= parseFloat(transaction.amount) ? 'paid' : 'unpaid';
    await transaction.save();

    res.status(201).json({ success: true, data: transaction });
  } catch (error) { next(error); }
};

// @desc  Get full receipt data for a transaction (company, client, associate, payment history)
// @route GET /api/transactions/:id/receipt
const getReceipt = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        { model: Plot, as: 'plot' },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'phone', 'email', 'pan_number', 'aadhar_number'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'email'] },
        { model: User, as: 'sellerAssociate', attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'buyerAssociate', attributes: ['id', 'name', 'phone'] },
        { model: Payment, as: 'payments', include: [{ model: User, as: 'recordedByUser', attributes: ['id', 'name'] }] },
        { model: EmiPlan, as: 'emiPlan', include: [{ model: EmiInstallment, as: 'installments' }] }
      ]
    });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    let settings = await AppSettings.findOne();
    if (!settings) settings = await AppSettings.create({});

    const pendingAmount = parseFloat(transaction.amount) - parseFloat(transaction.paid_amount);
    res.json({ success: true, data: { ...transaction.toJSON(), pending_amount: pendingAmount, companySettings: settings } });
  } catch (error) { next(error); }
};

module.exports = { getTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction, recordPayment, getReceipt, getTransactionPdf };
