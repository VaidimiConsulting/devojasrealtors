const { Op } = require('sequelize');
const { sequelize, Plot, Project, User, Notification, Transaction, Payment, AuditLog, BookingForm } = require('../models');

// Helper to round currency
const roundCurrency = (amount) => Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;

// @desc Get all plots with project details and search
// @route GET /api/plots
const getPlots = async (req, res, next) => {
  try {
    const { status, search, city, project_id, sector_number } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (city) where.city = city;
    if (project_id && project_id !== 'all') where.project_id = project_id;
    if (sector_number) where.sector_number = sector_number;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { plot_code: { [Op.like]: `%${search}%` } },
        { plot_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const plots = await Plot.findAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone', 'login_id'] },
        { model: Project, as: 'project', attributes: ['id', 'project_id', 'name', 'location'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: plots.length, data: plots });
  } catch (error) {
    next(error);
  }
};

// @desc Get single plot
// @route GET /api/plots/:id
const getPlot = async (req, res, next) => {
  try {
    const plot = await Plot.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone', 'login_id'] },
        { model: Project, as: 'project', attributes: ['id', 'project_id', 'name', 'location', 'developer_name'] }
      ]
    });
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found' });
    res.json({ success: true, data: plot });
  } catch (error) {
    next(error);
  }
};

// Calculate plot pricing breakdown
const calculatePlotPricing = (data) => {
  const size_sqft = parseFloat(data.size_sqft || 0);
  const rate_per_sqft = parseFloat(data.rate_per_sqft || 0);
  let basic_price = parseFloat(data.basic_price || 0);
  if (size_sqft > 0 && rate_per_sqft > 0) {
    basic_price = roundCurrency(size_sqft * rate_per_sqft);
  }

  const is_corner = Boolean(data.is_corner);
  let corner_charge = parseFloat(data.corner_charge || 0);
  if (is_corner && data.corner_percent) {
    corner_charge = roundCurrency(basic_price * (parseFloat(data.corner_percent) / 100));
  }

  const is_park_facing = Boolean(data.is_park_facing || data.facing === 'park');
  let park_facing_charge = parseFloat(data.park_facing_charge || 0);
  if (is_park_facing && data.park_facing_percent) {
    park_facing_charge = roundCurrency(basic_price * (parseFloat(data.park_facing_percent) / 100));
  }

  const additional_charges = parseFloat(data.additional_charges || 0);
  const discount = parseFloat(data.discount || 0);

  let final_price = roundCurrency(basic_price + corner_charge + park_facing_charge + additional_charges - discount);
  if (final_price <= 0 && data.price) {
    final_price = roundCurrency(parseFloat(data.price));
  }

  return {
    size_sqft,
    rate_per_sqft,
    basic_price,
    is_corner,
    corner_charge,
    is_park_facing,
    park_facing_charge,
    additional_charges,
    discount,
    price: final_price
  };
};

// @desc Create plot
// @route POST /api/plots
const createPlot = async (req, res, next) => {
  try {
    const payload = { ...req.body };
        // Owner Client hata diya gaya hai: khali / 0 owner_id hata do (warna FK error aata hai)
    if (!payload.owner_id || Number(payload.owner_id) === 0) delete payload.owner_id;
    const pricing = calculatePlotPricing(payload);
    Object.assign(payload, pricing);

    // Auto-generate plot_code if not supplied
    if (!payload.plot_code) {
      payload.plot_code = `PLOT-${Date.now().toString().slice(-5)}`;
    }

    // Check duplicate plot_code
    const existingCode = await Plot.findOne({ where: { plot_code: payload.plot_code } });
    if (existingCode) {
      return res.status(400).json({ success: false, message: `Plot code "${payload.plot_code}" already exists` });
    }

    // Default status if empty
    if (!payload.status) payload.status = 'available';

    // If project_id provided, sync project location/title defaults if needed
    if (payload.project_id) {
      const proj = await Project.findByPk(payload.project_id);
      if (proj) {
        if (!payload.location) payload.location = proj.location;
        if (!payload.city) payload.city = proj.city;
        if (!payload.title) {
          payload.title = `${proj.name} - Plot ${payload.plot_number || payload.plot_code}`;
        }
      }
    }

    if (!payload.title) {
      payload.title = `Plot ${payload.plot_number || payload.plot_code}`;
    }
    if (!payload.location) {
      payload.location = payload.city || 'Project Site';
    }

    const plot = await Plot.create(payload);

    await Notification.create({
      user_id: null,
      title: 'New Plot Added',
      message: `Plot "${plot.title}" (${plot.plot_code}) added to inventory.`,
      type: 'plot'
    });

    res.status(201).json({ success: true, message: 'Plot created successfully', data: plot });
  } catch (error) {
    next(error);
  }
};

// @desc Update plot
// @route PUT /api/plots/:id
const updatePlot = async (req, res, next) => {
  try {
    const plot = await Plot.findByPk(req.params.id);
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found' });

    const payload = { ...req.body };
    if (payload.size_sqft || payload.rate_per_sqft || payload.corner_charge || payload.discount) {
      const pricing = calculatePlotPricing({ ...plot.toJSON(), ...payload });
      Object.assign(payload, pricing);
    }

    await plot.update(payload);
    res.json({ success: true, message: 'Plot updated successfully', data: plot });
  } catch (error) {
    next(error);
  }
};

// @desc Delete plot
// @route DELETE /api/plots/:id
const deletePlot = async (req, res, next) => {
  try {
    const plot = await Plot.findByPk(req.params.id);
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found' });

    if (['booked', 'sold'].includes(plot.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plot with status "${plot.status}". Please cancel or transfer booking first.`
      });
    }

    // Check if this plot has linked transactions (FK: transactions.plot_id → plots.id ON DELETE NO ACTION)
    const linkedTxnCount = await Transaction.count({ where: { plot_id: plot.id } });

    if (linkedTxnCount > 0) {
      // Soft-delete: mark as inactive/rejected so it no longer appears in available inventory
      // This preserves all historical transaction, payment, commission, and booking records.
      await plot.update({ status: 'rejected' });
      return res.json({
        success: true,
        message: `Plot deactivated (marked inactive). It had ${linkedTxnCount} linked transaction record(s) that must be preserved. The plot no longer appears in available inventory.`,
        soft_deleted: true
      });
    }

    // No linked transactions: safe to hard-delete
    await plot.destroy();
    res.json({ success: true, message: 'Plot deleted successfully', soft_deleted: false });
  } catch (error) {
    next(error);
  }
};

// @desc Approve/Reject plot
// @route PUT /api/plots/:id/approval
const updatePlotApproval = async (req, res, next) => {
  try {
    const { status } = req.body;
    const plot = await Plot.findByPk(req.params.id);
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found' });

    plot.status = status === 'approved' ? 'available' : 'rejected';
    await plot.save();

    res.json({ success: true, data: plot });
  } catch (error) {
    next(error);
  }
};

// @desc Toggle featured
// @route PUT /api/plots/:id/feature
const toggleFeatured = async (req, res, next) => {
  try {
    const plot = await Plot.findByPk(req.params.id);
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found' });

    plot.is_featured = !plot.is_featured;
    await plot.save();

    res.json({ success: true, data: plot });
  } catch (error) {
    next(error);
  }
};

// @desc Admin Plot Purchasing Workflow (Section 2)
// Distinct from customer sale: Company/Admin acquires plot into inventory
// @route POST /api/plots/purchase
const purchasePlot = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      plot_id,
      purchase_price,
      purchase_date,
      payment_mode,
      amount_paid,
      payment_reference,
      notes,
      vendor_name,
      vendor_phone
    } = req.body;

    if (!plot_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Please select a plot to purchase' });
    }

    const plot = await Plot.findByPk(plot_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
      include: [{ model: Project, as: 'project' }]
    });

    if (!plot) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }

    // Check if plot is already sold or booked to prevent duplicate purchases
    if (['booked', 'sold'].includes(plot.status)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Plot ${plot.plot_number || plot.plot_code} is already ${plot.status}. Simultaneous or duplicate purchases are strictly rejected.`
      });
    }

    // Check if plot already has an active acquisition purchase transaction
    const existingPurchase = await Transaction.findOne({
      where: { plot_id: plot.id, type: 'purchase', status: 'completed' },
      transaction: t
    });

    if (existingPurchase) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Plot ${plot.plot_number || plot.plot_code} was already acquired under transaction ${existingPurchase.transaction_ref}. Duplicate purchase prevented.`
      });
    }

    const price = roundCurrency(purchase_price || plot.price);
    // BUG FIX: `amount_paid || price` incorrectly treated 0 as falsy and defaulted
    // to full price even for partial payments. Now uses explicit null/undefined check.
    const paidRaw = (amount_paid != null && amount_paid !== '') ? Number(amount_paid) : price;
    const paid = roundCurrency(paidRaw);
    const pending = roundCurrency(Math.max(0, price - paid));
    const txnRef = (payment_reference && payment_reference.trim())
      ? payment_reference.trim()
      : `PUR-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    // Create purchase transaction (Company is buyer)
    const transaction = await Transaction.create({
      transaction_ref: txnRef,
      type: 'purchase',
      plot_id: plot.id,
      buyer_id: req.user.id,
      seller_id: 1, // Landowner / Acquisition seller
      amount: price,
      paid_amount: paid,
      status: 'completed',
      payment_status: paid >= price ? 'paid' : (paid > 0 ? 'partially_paid' : 'unpaid'),
      deal_date: purchase_date ? new Date(purchase_date) : new Date(),
      notes: notes || `Plot acquisition: ${plot.title || plot.plot_code} from ${vendor_name || 'Owner'}`
    }, { transaction: t });

    // Record payment receipt if money was paid
    let payment = null;
    if (paid > 0) {
      const receiptNo = `REC-PUR-${Date.now().toString().slice(-6)}`;
      payment = await Payment.create({
        transaction_id: transaction.id,
        amount: paid,
        payment_mode: payment_mode || 'Bank Transfer',
        reference_no: txnRef,
        receipt_no: receiptNo,
        status: 'verified',
        recorded_by: req.user.id,
        note: `Acquisition payment for Plot ${plot.plot_number || plot.plot_code}`,
        paid_on: purchase_date ? new Date(purchase_date) : new Date()
      }, { transaction: t });
    }

    // Update plot: Mark available in company inventory, update basic_price / acquisition cost
    await plot.update({
      status: 'available',
      owner_id: req.user.id,
      basic_price: price, // Set approved base acquisition price
      allotment_status: 'none'
    }, { transaction: t });

    // Record audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'PLOT_PURCHASE',
      entity_type: 'plot',
      entity_id: plot.id,
      new_values: JSON.stringify({
        plot_id: plot.id,
        purchase_price: price,
        paid_amount: paid,
        pending_amount: pending,
        transaction_id: transaction.id,
        transaction_ref: txnRef
      }),
      notes: `Admin ${req.user.name} purchased Plot #${plot.id} (${plot.plot_code}) into company inventory`,
      ip_address: req.ip
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      success: true,
      message: `Plot ${plot.plot_number || plot.plot_code} successfully purchased into inventory!`,
      data: {
        plot,
        transaction,
        payment,
        purchase_summary: {
          purchase_price: price,
          amount_paid: paid,
          pending_amount: pending,
          transaction_ref: txnRef,
          status: 'completed'
        }
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// @desc Get list of plot purchase transactions (All Plot Purchases page)
// Displays actual plot purchase transactions saved through the purchase workflow.
// Maps genuine customer details (never displays Admin/Super Admin when a customer is linked).
// @route GET /api/plots/purchases
const getPlotPurchases = async (req, res, next) => {
  try {
    const { search } = req.query;

    const where = { type: { [Op.in]: ['sale', 'purchase'] } };
    if (req.user && req.user.role === 'associate') {
      where[Op.or] = [
        { seller_associate_id: req.user.id },
        { buyer_associate_id: req.user.id }
      ];
    }

    const allPurchases = await Transaction.findAll({
      where,
      include: [
        {
          model: Plot,
          as: 'plot',
          include: [{ model: Project, as: 'project', attributes: ['id', 'project_id', 'name', 'location'] }]
        },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'login_id', 'email', 'phone'] },
        { model: User, as: 'sellerAssociate', attributes: ['id', 'name', 'login_id', 'email'] },
        { model: Payment, as: 'payments' }
      ],
      order: [['deal_date', 'DESC'], ['createdAt', 'DESC']]
    });

    // For associates, also find any approved/submitted BookingForms for this associate that might not have a Transaction record
    let additionalBookings = [];
    if (req.user && req.user.role === 'associate') {
      const existingPlotIds = new Set(allPurchases.map(t => t.plot_id).filter(Boolean));
      const existingRefs = new Set(allPurchases.map(t => t.transaction_ref).filter(Boolean));
      const bookingWhere = { associate_id: req.user.id };
      if (existingPlotIds.size > 0) {
        bookingWhere.plot_id = { [Op.notIn]: Array.from(existingPlotIds) };
      }
      const orphanBookings = await BookingForm.findAll({
        where: bookingWhere,
        include: [
          {
            model: Plot,
            as: 'plot',
            include: [{ model: Project, as: 'project', attributes: ['id', 'project_id', 'name', 'location'] }]
          },
          { model: User, as: 'client', attributes: ['id', 'name', 'login_id', 'email', 'phone'] },
          { model: User, as: 'associate', attributes: ['id', 'name', 'login_id', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      additionalBookings = orphanBookings
        .filter(b => !existingRefs.has(b.booking_ref))
        .map(b => {
          const total = parseFloat(b.total_plot_price || 0);
          const bookingAmt = parseFloat(b.booking_amount || 0);
          return {
            id: b.id,
            transaction_ref: b.booking_ref || `BK-${b.id}`,
            type: 'sale',
            plot_id: b.plot_id,
            plot: b.plot,
            buyer_id: b.client_id,
            buyer: b.client,
            sellerAssociate: b.associate,
            amount: total,
            paid_amount: bookingAmt,
            status: b.status === 'approved' ? 'completed' : (b.status === 'rejected' ? 'cancelled' : 'pending'),
            payment_status: bookingAmt >= total && total > 0 ? 'paid' : (bookingAmt > 0 ? 'partially_paid' : 'unpaid'),
            deal_date: b.applicant_date || b.createdAt,
            createdAt: b.createdAt,
            customer_name: b.applicant_name || b.client?.name || 'Customer',
            customer_phone: b.applicant_phone || b.client?.phone || '—',
            customer_email: b.applicant_email || b.client?.email || '',
            booking_ref: b.booking_ref,
            payments: []
          };
        });
    }

    // Plots with customer sale transactions to exclude duplicate inward acquisitions
    const plotIdsWithSale = new Set(
      allPurchases.filter(t => t.type === 'sale' && t.plot_id).map(t => t.plot_id)
    );

    // Filter to customer plot purchase transactions
    const customerPurchases = allPurchases.filter(t => {
      if (t.type === 'sale') return true;
      // If legacy 'purchase' type, only keep if there is no separate 'sale' record for this plot
      return !plotIdsWithSale.has(t.plot_id);
    });

    // Enrich transactions with genuine customer details from buyer or BookingForm
    const enriched = await Promise.all(customerPurchases.map(async (txn) => {
      const plain = txn.toJSON();
      let customerName = plain.buyer?.name;
      let customerPhone = plain.buyer?.phone;
      let customerEmail = plain.buyer?.email;
      let bookingRef = null;

      // If buyer is missing, or defaulted to Super Admin (ID 1), resolve actual customer from BookingForm
      if (!customerName || plain.buyer?.id === 1 || customerName === 'Super Admin') {
        const booking = await BookingForm.findOne({
          where: {
            [Op.or]: [
              { plot_id: plain.plot_id },
              { booking_ref: plain.transaction_ref }
            ]
          },
          order: [['id', 'DESC']]
        });
        if (booking) {
          bookingRef = booking.booking_ref;
          if (booking.applicant_name) customerName = booking.applicant_name;
          if (booking.applicant_phone) customerPhone = booking.applicant_phone;
          if (booking.applicant_email) customerEmail = booking.applicant_email;
        }
      }

      plain.customer_name = customerName || (plain.type === 'sale' ? 'Customer' : 'Company');
      plain.customer_phone = customerPhone || '—';
      plain.customer_email = customerEmail || '';
      plain.booking_ref = bookingRef || plain.transaction_ref;

      // Calculate effective rate per sq.ft. if not stored directly on plot
      if (plain.plot) {
        const size = parseFloat(plain.plot.size_sqft || 0);
        const storedRate = parseFloat(plain.plot.rate_per_sqft || 0);
        plain.plot.effective_rate = storedRate > 0
          ? storedRate
          : (size > 0 && plain.amount ? Math.round(parseFloat(plain.amount) / size) : 0);
      }

      return plain;
    }));

    const combined = [...enriched, ...additionalBookings];

    // If search filter query provided, filter on server as well
    let finalData = combined;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      finalData = enriched.filter(p => {
        return (
          String(p.transaction_ref || '').toLowerCase().includes(q) ||
          String(p.customer_name || '').toLowerCase().includes(q) ||
          String(p.customer_phone || '').toLowerCase().includes(q) ||
          String(p.plot?.plot_code || '').toLowerCase().includes(q) ||
          String(p.plot?.plot_number || '').toLowerCase().includes(q) ||
          String(p.plot?.title || '').toLowerCase().includes(q) ||
          String(p.plot?.project?.name || '').toLowerCase().includes(q) ||
          String(p.sellerAssociate?.name || '').toLowerCase().includes(q)
        );
      });
    }

    res.json({
      success: true,
      count: finalData.length,
      data: finalData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlots,
  getPlot,
  createPlot,
  updatePlot,
  deletePlot,
  updatePlotApproval,
  toggleFeatured,
  purchasePlot,
  getPlotPurchases
};
