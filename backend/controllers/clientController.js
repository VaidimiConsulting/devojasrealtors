/**
 * CLIENT CONTROLLER
 * Har function me "ownership check" hai — client sirf apna hi
 * data dekh/edit/delete kar sakta hai, kisi aur ka nahi.
 */
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Plot, User, Transaction, Notification, Complaint, Wallet, Payment, EmiPlan, EmiInstallment, AppSettings, BookingForm } = require('../models');

// @desc  Client's own dashboard stats
// @route GET /api/client/dashboard-stats
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const totalMyPlots = await Plot.count({ where: { owner_id: userId } });
    const soldMyPlots = await Plot.count({ where: { owner_id: userId, status: 'sold' } });
    const pendingMyPlots = await Plot.count({ where: { owner_id: userId, status: 'pending' } });

    const totalPurchases = await Transaction.count({ where: { buyer_id: userId, status: 'completed' } });
    const totalSales = await Transaction.count({ where: { seller_id: userId, status: 'completed' } });

    const totalSpent = await Transaction.sum('amount', { where: { buyer_id: userId, status: 'completed' } }) || 0;
    const totalEarned = await Transaction.sum('amount', { where: { seller_id: userId, status: 'completed' } }) || 0;

    const unreadNotifications = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.json({
      success: true,
      data: {
        totalMyPlots, soldMyPlots, pendingMyPlots,
        totalPurchases, totalSales,
        totalSpent, totalEarned,
        unreadNotifications
      }
    });
  } catch (error) { next(error); }
};

// @desc  Get only MY plots
// @route GET /api/client/my-plots
const getMyPlots = async (req, res, next) => {
  try {
    const plots = await Plot.findAll({
      where: { owner_id: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: plots.length, data: plots });
  } catch (error) { next(error); }
};

// @desc  Add a new plot (owner is always the logged-in client)
// @route POST /api/client/plots
const createMyPlot = async (req, res, next) => {
  try {
    const { title, description, location, city, size_sqft, price, image_url } = req.body;

    const plot = await Plot.create({
      title, description, location, city, size_sqft, price, image_url,
      owner_id: req.user.id,   // FORCE owner to be logged-in user — cannot be spoofed
      status: 'pending'         // Always starts pending, admin will approve
    });

    await Notification.create({
      user_id: null, // notify admin
      title: 'New Plot Submitted',
      message: `${req.user.name} submitted a new plot "${title}" for approval.`,
      type: 'plot'
    });

    res.status(201).json({ success: true, data: plot });
  } catch (error) { next(error); }
};

// @desc  Update MY plot (only if I own it, and it's not sold)
// @route PUT /api/client/plots/:id
const updateMyPlot = async (req, res, next) => {
  try {
    const plot = await Plot.findByPk(req.params.id);
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found' });

    if (plot.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit your own plots' });
    }
    if (plot.status === 'sold') {
      return res.status(400).json({ success: false, message: 'Cannot edit a plot that is already sold' });
    }

    const { title, description, location, city, size_sqft, price, image_url } = req.body;
    await plot.update({ title, description, location, city, size_sqft, price, image_url, status: 'pending' });

    res.json({ success: true, data: plot });
  } catch (error) { next(error); }
};

// @desc  Delete MY plot (only if I own it, and it's not sold)
// @route DELETE /api/client/plots/:id
const deleteMyPlot = async (req, res, next) => {
  try {
    const plot = await Plot.findByPk(req.params.id);
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found' });

    if (plot.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own plots' });
    }
    if (plot.status === 'sold') {
      return res.status(400).json({ success: false, message: 'Cannot delete a plot that is already sold' });
    }

    await plot.destroy();
    res.json({ success: true, message: 'Plot deleted successfully' });
  } catch (error) { next(error); }
};

// @desc  Browse all available plots (marketplace — everyone's listings)
// @route GET /api/client/browse-plots
const browsePlots = async (req, res, next) => {
  try {
    const { search, city, min_price, max_price } = req.query;
    const where = { status: 'available' };

    if (city) where.city = city;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }
    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price[Op.gte] = min_price;
      if (max_price) where.price[Op.lte] = max_price;
    }

    const plots = await Plot.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'name'] }],
      order: [['is_featured', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({ success: true, count: plots.length, data: plots });
  } catch (error) { next(error); }
};

// @desc  Get single plot detail (for browse view)
// @route GET /api/client/plots/:id
const getPlotDetail = async (req, res, next) => {
  try {
    const plot = await Plot.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'kyc_status'] }]
    });
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found' });

    // Privacy: only show seller contact info if the plot owner's KYC is approved
    const responseData = plot.toJSON();
    if (plot.owner?.kyc_status !== 'approved') {
      responseData.owner = { id: plot.owner.id, name: plot.owner.name, verified: false };
    } else {
      responseData.owner.verified = true;
    }

    res.json({ success: true, data: responseData });
  } catch (error) { next(error); }
};

// @desc  Get MY transactions (purchases + sales)
// @route GET /api/client/my-transactions
const getMyTransactions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type } = req.query; // 'purchases' or 'sales'

    const where = {};
    if (type === 'purchases') where.buyer_id = userId;
    else if (type === 'sales') where.seller_id = userId;
    else where[Op.or] = [{ buyer_id: userId }, { seller_id: userId }];

    const transactions = await Transaction.findAll({
      where,
      include: [
        { model: Plot, as: 'plot' },
        { model: User, as: 'buyer', attributes: ['id', 'name'] },
        { model: User, as: 'seller', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) { next(error); }
};

// @desc  Update MY profile
// @route PUT /api/client/profile
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
// @route PUT /api/client/change-password
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

// @desc  Submit KYC document (URL-based for now — file upload can be wired later)
// @route POST /api/client/kyc
const submitKyc = async (req, res, next) => {
  try {
    const { document_url } = req.body;
    const user = await User.findByPk(req.user.id);
    await user.update({ kyc_document_url: document_url, kyc_status: 'pending' });

    await Notification.create({
      user_id: null,
      title: 'New KYC Submission',
      message: `${user.name} submitted KYC documents for review.`,
      type: 'kyc'
    });

    res.json({ success: true, message: 'KYC submitted for review', data: user });
  } catch (error) { next(error); }
};

// @desc  Get MY notifications
// @route GET /api/client/notifications
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

// @desc  Mark my notification as read
// @route PUT /api/client/notifications/:id/read
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
// @route POST /api/client/complaints
const createComplaint = async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    const complaint = await Complaint.create({ user_id: req.user.id, subject, message });
    res.status(201).json({ success: true, data: complaint });
  } catch (error) { next(error); }
};

// @desc  Get MY complaints
// @route GET /api/client/complaints
const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: complaints });
  } catch (error) { next(error); }
};

module.exports = {
  getDashboardStats, getMyPlots, createMyPlot, updateMyPlot, deleteMyPlot,
  browsePlots, getPlotDetail, getMyTransactions, updateProfile, changePassword,
  submitKyc, getMyNotifications, markNotificationRead, createComplaint, getMyComplaints,
  getMyReceipt, getMyEmiSchedule, getMyBookingPdf
};

// @desc  Client downloads receipt for their OWN transaction only (ownership checked)
//        Includes EMI schedule (if any) + company name/logo for the PDF
// @route GET /api/client/transactions/:id/receipt
async function getMyReceipt(req, res, next) {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        { model: Plot, as: 'plot' },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'phone', 'email', 'pan_number', 'aadhar_number'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'email'] },
        { model: Payment, as: 'payments' },
        {
          model: EmiPlan, as: 'emiPlan',
          include: [{ model: EmiInstallment, as: 'installments' }]
        }
      ]
    });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const isOwner = transaction.buyer_id === req.user.id || transaction.seller_id === req.user.id;
    if (!isOwner) return res.status(403).json({ success: false, message: 'You can only view your own receipts' });

    let settings = await AppSettings.findOne();
    if (!settings) settings = await AppSettings.create({});

    const pendingAmount = parseFloat(transaction.amount) - parseFloat(transaction.paid_amount);
    res.json({
      success: true,
      data: { ...transaction.toJSON(), pending_amount: pendingAmount, companySettings: settings }
    });
  } catch (error) { next(error); }
}

// @desc  Client downloads the actual "Plot Price Details" booking PDF for
//        their OWN transaction only (ownership checked)
// @route GET /api/client/transactions/:id/pdf
async function getMyBookingPdf(req, res, next) {
  try {
    const { generateBookingPdf } = require('../services/pdfService');
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const isOwner = transaction.buyer_id === req.user.id;
    if (!isOwner) return res.status(403).json({ success: false, message: 'You can only download your own booking PDF' });

    const plot = await Plot.findByPk(transaction.plot_id);
    const buyer = await User.findByPk(transaction.buyer_id);
    const bookingForm = await BookingForm.findOne({
      where: {
        [Op.or]: [
          { plot_id: transaction.plot_id },
          { client_id: transaction.buyer_id }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
    const emiPlan = await EmiPlan.findOne({ where: { transaction_id: transaction.id } });
    let settings = await AppSettings.findOne();
    if (!settings) settings = await AppSettings.create({});

    const pdfPath = await generateBookingPdf({ transaction, plot, buyer, companySettings: settings, emiPlan, bookingForm });
    res.download(pdfPath, 'Plot-Booking-Details.pdf');
  } catch (error) { next(error); }
}

// @desc  Client's EMI schedule for their OWN transaction only (ownership checked)
// @route GET /api/client/transactions/:id/emi
async function getMyEmiSchedule(req, res, next) {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const isOwner = transaction.buyer_id === req.user.id || transaction.seller_id === req.user.id;
    if (!isOwner) return res.status(403).json({ success: false, message: 'You can only view your own EMI schedule' });

    const plan = await EmiPlan.findOne({
      where: { transaction_id: transaction.id },
      include: [{ model: EmiInstallment, as: 'installments' }]
    });

    res.json({ success: true, data: plan });
  } catch (error) { next(error); }
}

// @desc  Client downloads official payment receipt PDF for their own payment
// @route GET /api/client/payments/:id/receipt-pdf
async function getMyPaymentReceiptPdf(req, res, next) {
  try {
    const { generatePaymentReceiptPdf } = require('../services/pdfService');
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: Transaction,
          as: 'transaction',
          include: [
            { model: Plot, as: 'plot', include: [{ model: require('../models').Project, as: 'project' }] },
            { model: User, as: 'buyer' },
            { model: User, as: 'sellerAssociate' }
          ]
        }
      ]
    });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });

    if (payment.transaction?.buyer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only download receipts for your own payments' });
    }

    let settings = await AppSettings.findOne() || {};

    const pdfPath = await generatePaymentReceiptPdf({
      payment,
      transaction: payment.transaction,
      plot: payment.transaction?.plot,
      buyer: payment.transaction?.buyer,
      sellerAssociate: payment.transaction?.sellerAssociate,
      companySettings: settings
    });

    res.download(pdfPath, `Receipt-${payment.receipt_no || payment.id}.pdf`);
  } catch (error) { next(error); }
}

module.exports = {
  getDashboardStats, getMyPlots, createMyPlot, updateMyPlot, deleteMyPlot,
  browsePlots, getPlotDetail, getMyTransactions, updateProfile, changePassword,
  submitKyc, getMyNotifications, markNotificationRead, createComplaint, getMyComplaints,
  getMyReceipt, getMyEmiSchedule, getMyBookingPdf, getMyPaymentReceiptPdf
};
