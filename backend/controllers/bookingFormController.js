const { 
  sequelize, BookingForm, Plot, Project, User, Transaction, Payment, Notification, AppSettings 
} = require('../models');
const { processCommissionForAssociate, reverseCommissionForTransaction } = require('../services/commissionEngine');

// Is `candidateId` the same as, or somewhere below, `rootId` in the sponsor tree?
const isInDownline = async (rootId, candidateId, t) => {
  let current = await User.findByPk(candidateId, { transaction: t });
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    if (current.id === rootId) return true;
    seen.add(current.id);
    if (!current.referred_by) return false;
    current = await User.findByPk(current.referred_by, { transaction: t });
  }
  return false;
};
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Safe round helper
const roundCurrency = (amount) => Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;

// @desc Auto-retrieve associate referral chain info for Section C
// @route GET /api/booking-forms/associate-details/:id
const getAssociateDetailsAndUpline = async (req, res, next) => {
  try {
    const identifier = req.params.id;
    const where = isNaN(identifier) ? { login_id: identifier } : { id: identifier };
    
    const associate = await User.findOne({
      where,
      attributes: ['id', 'name', 'login_id', 'phone', 'email', 'commission_percent', 'referred_by', 'status']
    });

    if (!associate) {
      return res.status(404).json({ success: false, message: 'Associate not found' });
    }
    if (req.user?.role === 'associate') {
      const allowed = associate.id === req.user.id
        || await isInDownline(associate.id, req.user.id)   // associate is in my upline
        || await isInDownline(req.user.id, associate.id);  // associate is in my downline
      if (!allowed) return res.status(403).json({ success: false, message: 'Not authorized to view this associate' });
    } else if (!['admin', 'accounts'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Direct sponsor
    let directSponsor = null;
    if (associate.referred_by) {
      directSponsor = await User.findByPk(associate.referred_by, {
        attributes: ['id', 'name', 'login_id', 'phone', 'email', 'commission_percent', 'referred_by']
      });
    }

    // Full upline chain
    const uplineChain = [];
    let currentSponsorId = associate.referred_by;
    const visited = new Set([associate.id]);
    let level = 1;

    while (currentSponsorId && !visited.has(currentSponsorId) && level <= 10) {
      visited.add(currentSponsorId);
      const uplineUser = await User.findByPk(currentSponsorId, {
        attributes: ['id', 'name', 'login_id', 'commission_percent', 'referred_by']
      });
      if (!uplineUser) break;

      uplineChain.push({
        level,
        id: uplineUser.id,
        name: uplineUser.name,
        login_id: uplineUser.login_id,
        commission_percent: uplineUser.commission_percent
      });

      currentSponsorId = uplineUser.referred_by;
      level++;
    }

    res.json({
      success: true,
      data: {
        associate: {
          id: associate.id,
          name: associate.name,
          login_id: associate.login_id,
          phone: associate.phone,
          email: associate.email,
          commission_percent: associate.commission_percent
        },
        directSponsor: directSponsor ? {
          id: directSponsor.id,
          name: directSponsor.name,
          login_id: directSponsor.login_id,
          phone: directSponsor.phone,
          email: directSponsor.email,
          commission_percent: directSponsor.commission_percent
        } : null,
        uplineChain
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create a new booking form / purchase
// @route POST /api/booking-forms
const createBookingForm = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const formData = { ...req.body };

    // 1. Inventory & Double-booking Protection
    if (!formData.plot_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Plot selection is required' });
    }

    const plot = await Plot.findByPk(formData.plot_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!plot) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Selected plot does not exist' });
    }

    // Only genuinely available inventory can be sold (booked / sold / reserved / pending / rejected are blocked)
    if (!['available', 'approved'].includes(plot.status)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Plot ${plot.plot_number || plot.plot_code || plot.id} is not available (status: ${plot.status}).` });
    }
    // Prevent double booking
    if (['booked', 'sold'].includes(plot.status)) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Plot ${plot.plot_number || plot.plot_code || plot.id} is already ${plot.status}. Simultaneous bookings are strictly prevented.` 
      });
    }

    // 2. Validate / Link Client
    let clientId = formData.client_id;
    if (!clientId && formData.applicant_phone) {
      // Find or create test/demo client
      let client = await User.findOne({ 
        where: { 
          [Op.or]: [
            { phone: formData.applicant_phone },
            ...(formData.applicant_email ? [{ email: formData.applicant_email }] : [])
          ] 
        }, 
        transaction: t 
      });
      if (!client) {
        client = await User.create({
          name: formData.applicant_name || 'Client',
          phone: formData.applicant_phone,
          email: formData.applicant_email || `client_${Date.now()}@example.com`,
          role: 'client',
          // BUG FIX: User.password is NOT NULL; auto-created clients got no password and the sale failed with a 500.
          // Random unguessable hash — client can log in only after an admin/password reset.
          password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
          address: formData.applicant_address || 'Address',
          login_id: formData.client_code || `CLIENT-${Date.now().toString().slice(-4)}`,
          status: 'active'
        }, { transaction: t });
      }
      clientId = client.id;
      formData.client_id = clientId;
      formData.client_code = client.login_id;
    }

    // 3. Selling Associate & Referral Lookup
    // ---- Selling Associate (Sold By / Associate ID) and Referred By are SEPARATE identities ----
    //  Selling associate:  associate role -> always the logged-in associate (cannot impersonate).
    //                      admin/accounts -> must choose an active associate (associate_id).
    //  Referred By:        validated associate/admin; stored in booking_forms.referred_id.
    const findActiveUser = async (value) => {
      if (value === undefined || value === null || String(value).trim() === '') return null;
      const v = String(value).trim();
      const where = /^\d+$/.test(v) ? { id: v } : { login_id: v };
      const u = await User.findOne({ where, transaction: t });
      if (!u || !['associate', 'admin'].includes(u.role) || ['blocked', 'inactive'].includes(u.status)) return undefined;
      return u;
    };
    let associateId = null;
    if (req.user?.role === 'associate') {
      associateId = req.user.id;
    } else {
      const seller = await findActiveUser(formData.associate_id || formData.selling_associate_ref_id);
      if (!seller) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Selling Associate is required and must be an existing active associate' });
      }
      associateId = seller.id;
    }
    const sellerRow = await User.findByPk(associateId, { transaction: t });
    const referralInput = (formData.referral_id || formData.referred_by_code || '').toString().trim();
    let referredId = null;
    if (referralInput) {
      const ref = await findActiveUser(referralInput);
      if (!ref) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Invalid Referral ID: associate not found or not active' });
      }
      if (req.user?.role === 'associate') {
        // an associate may name themselves, someone in their upline, or someone in their downline - nobody else
        const inUpline = await isInDownline(ref.id, req.user.id, t);
        const inDownline = await isInDownline(req.user.id, ref.id, t);
        if (!(inUpline || inDownline)) {
          await t.rollback();
          return res.status(403).json({ success: false, message: 'Referral ID must be you or an associate in your own upline/downline network' });
        }
      }
      referredId = ref.login_id || String(ref.id);
    } else if (sellerRow && sellerRow.referred_by) {
      // explicit default: the seller's direct sponsor is the referring associate
      const sp = await User.findByPk(sellerRow.referred_by, { transaction: t });
      referredId = sp ? (sp.login_id || String(sp.id)) : null;
    } else {
      referredId = 'DIRECT'; // root associate: direct sale, no referring associate
    }
    formData.referred_id = referredId;
    if (associateId) {
      const sellingAssoc = await User.findByPk(associateId, { transaction: t });
      if (sellingAssoc) {
        formData.associate_id = sellingAssoc.id;
        formData.selling_associate_name = sellingAssoc.name;
        formData.selling_associate_code = sellingAssoc.login_id;
        formData.selling_associate_ref_id = sellingAssoc.login_id;

        if (sellingAssoc.referred_by) {
          const sponsor = await User.findByPk(sellingAssoc.referred_by, { transaction: t });
          if (sponsor) {
            formData.direct_sponsor_id = sponsor.id;
            formData.direct_sponsor_name = sponsor.name;
            formData.direct_sponsor_code = sponsor.login_id;
            formData.direct_sponsor_ref_id = sponsor.login_id;
          }
        }
      }
    }

    // 4. Calculate Final Prices & Remaining Balances
    // PRICE FIX: Always derive base price from size × rate (authoritative formula).
    // plot.basic_price holds the historical acquisition cost — NOT the customer sale price.
    if (req.user?.role === 'associate') {
      formData.discount_amount = 0;
    }
    const plotSize = parseFloat(formData.plot_size || plot.size_sqft || 0);
    const plotRate = parseFloat(plot.rate_per_sqft || 0) > 0
      ? parseFloat(plot.rate_per_sqft)
      : parseFloat(formData.rate_per_sqft || 0);

    // Authoritative base: size × rate. Fall back to plot.price only if both are 0.
    const basicPrice = (plotSize > 0 && plotRate > 0)
      ? roundCurrency(plotSize * plotRate)
      : roundCurrency(parseFloat(plot.price || plot.basic_price || 0));

    // Corner Charge: Base Plot Price × Corner Percentage / 100 (only when corner is applicable)
    const isCorner = Boolean(formData.is_corner || plot.is_corner);
    const cornerPercent = isCorner ? parseFloat(formData.corner_percent || 10) : 0;
    const cornerAmt = (isCorner && cornerPercent > 0)
      ? roundCurrency(basicPrice * (cornerPercent / 100))
      : 0;

    // Park-Facing Charge: Base Plot Price × Park-Facing Percentage / 100 (only when park-facing is applicable)
    const isParkFacing = Boolean(formData.is_park_facing || plot.is_park_facing || plot.facing === 'park');
    const parkFacingPercent = isParkFacing ? parseFloat(formData.park_facing_percent || 10) : 0;
    const parkAmt = (isParkFacing && parkFacingPercent > 0)
      ? roundCurrency(basicPrice * (parkFacingPercent / 100))
      : 0;

    const otherCharges = roundCurrency(parseFloat(formData.other_approved_charges || 0));
    const discount = req.user?.role === 'associate' ? 0 : roundCurrency(parseFloat(formData.discount_amount || 0));

    const totalPlotPrice = roundCurrency(basicPrice + cornerAmt + parkAmt + otherCharges - discount);

    formData.plot_size = String(plotSize);
    formData.rate_per_sqft = plotRate;
    formData.basic_plot_price = basicPrice;
    formData.is_corner = isCorner;
    formData.corner_percent = cornerPercent;
    formData.corner_charge_amount = cornerAmt;
    formData.is_park_facing = isParkFacing;
    formData.park_facing_percent = parkFacingPercent;
    formData.park_facing_charge_amount = parkAmt;
    formData.total_plot_price = totalPlotPrice;


    const isFullPayment = formData.payment_plan_type === 'full';
    let initialPaid = 0;
    if (isFullPayment) {
      initialPaid = formData.total_plot_price;
      formData.booking_amount = formData.total_plot_price;
      formData.down_payment_amt = 0;
      formData.remaining_balance = 0;
    } else {
      const bookingAmt = parseFloat(formData.booking_amount || 0);
      const downPaymentAmt = parseFloat(formData.down_payment_amt || 0);
      initialPaid = roundCurrency(bookingAmt + downPaymentAmt);
      formData.remaining_balance = roundCurrency(Math.max(0, formData.total_plot_price - initialPaid));
    }

    // 5. Generate unique booking reference
    if (!formData.booking_ref) {
      formData.booking_ref = `BK-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    }

    // 6. Set status
    const isImmediateSale = req.body.mark_confirmed || isFullPayment;
    formData.status = isImmediateSale ? 'approved' : 'pending';
    formData.allotment_status = isImmediateSale ? 'provisional' : 'none';

    const form = await BookingForm.create(formData, { transaction: t });

    // Update Plot status to prevent race conditions
    await plot.update({
      status: isFullPayment ? 'sold' : 'booked',
      owner_id: clientId || plot.owner_id,
      booking_date: new Date(),
      allotment_status: isImmediateSale ? 'provisional' : 'none'
    }, { transaction: t });

    // 7. If booking amount was paid or transaction reference specified, create Transaction record
    let createdTxn = null;
    let createdPayment = null;

    if (initialPaid > 0 || isImmediateSale) {
      const txnRef = formData.transaction_ref || `SALE-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
      const isPaidFull = initialPaid >= formData.total_plot_price;
      const isPartiallyPaid = initialPaid > 0 && initialPaid < formData.total_plot_price;
      const paymentStatus = isPaidFull ? 'paid' : (isPartiallyPaid ? 'partially_paid' : 'unpaid');
      
      createdTxn = await Transaction.create({
        transaction_ref: txnRef,
        plot_id: plot.id,
        buyer_id: clientId || 1,
        seller_id: plot.owner_id || 1,
        seller_associate_id: associateId || null,
        buyer_associate_id: associateId || null,
        amount: formData.total_plot_price,
        paid_amount: initialPaid,
        status: isImmediateSale ? 'completed' : 'pending',
        payment_status: paymentStatus,
        deal_date: new Date()
      }, { transaction: t });

      if (initialPaid > 0) {
        const receiptNo = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        createdPayment = await Payment.create({
          transaction_id: createdTxn.id,
          amount: initialPaid,
          payment_mode: formData.payment_mode || 'Cash',
          reference_no: formData.check_no || formData.upi_id || txnRef,
          receipt_no: receiptNo,
          status: 'verified',
          recorded_by: req.user?.id || 1,
          note: `Booking payment for Plot ${plot.plot_number || plot.plot_code || plot.id}`,
          paid_on: new Date()
        }, { transaction: t });
      }

      // If approved transaction and selling associate present, calculate differential commission
      if (isImmediateSale && associateId) {
        // Run commission engine with base price and sale price for exact differential
        await processCommissionForAssociate(
          associateId, 
          formData.total_plot_price, 
          createdTxn.id, 
          'seller_side', 
          true, 
          t, 
          'pending', // starts in pending for Accounts verification
          {
            basePrice: plot.basic_price || formData.basic_plot_price || 0,
            salePrice: formData.total_plot_price
          }
        );
      }
    }

    await t.commit();

    res.status(201).json({
      success: true,
      message: 'Plot booking application processed successfully',
      data: {
        bookingForm: form,
        transaction: createdTxn,
        payment: createdPayment
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// @desc Get all booking forms
// @route GET /api/booking-forms
const getBookingForms = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'associate') {
      where.associate_id = req.user.id;
    }

    const forms = await BookingForm.findAll({
      where,
      include: [
        { model: User, as: 'associate', attributes: ['id', 'name', 'phone', 'login_id'] },
        { model: User, as: 'client', attributes: ['id', 'name', 'phone', 'email', 'login_id'] },
        { model: Plot, as: 'plot', attributes: ['id', 'plot_code', 'plot_number', 'size_sqft', 'price', 'status'] },
        { model: User, as: 'approver', attributes: ['id', 'name', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: forms.length, data: forms });
  } catch (error) {
    next(error);
  }
};

// @desc Get a single booking form
// @route GET /api/booking-forms/:id
const getBookingForm = async (req, res, next) => {
  try {
    const form = await BookingForm.findByPk(req.params.id, {
      include: [
        { model: User, as: 'associate', attributes: ['id', 'name', 'phone', 'login_id', 'email'] },
        { model: User, as: 'client', attributes: ['id', 'name', 'phone', 'email', 'login_id', 'address'] },
        { model: Plot, as: 'plot', attributes: ['id', 'plot_code', 'title', 'location', 'plot_number', 'sector_number', 'size_sqft', 'price', 'status'] },
        { model: User, as: 'approver', attributes: ['id', 'name', 'role'] }
      ]
    });

    if (!form) return res.status(404).json({ success: false, message: 'Booking form not found' });

    if (req.user.role === 'associate' && form.associate_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: form });
  } catch (error) {
    next(error);
  }
};

// @desc Update booking form
// @route PUT /api/booking-forms/:id
const updateBookingForm = async (req, res, next) => {
  try {
    const form = await BookingForm.findByPk(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Booking form not found' });

    if (req.user.role === 'associate') {
      if (form.associate_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      if (form.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Cannot edit processed form' });
      }
    }

    await form.update(req.body);
    res.json({ success: true, message: 'Booking form updated', data: form });
  } catch (error) {
    next(error);
  }
};

// @desc Delete booking form
// @route DELETE /api/booking-forms/:id
const deleteBookingForm = async (req, res, next) => {
  try {
    const form = await BookingForm.findByPk(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Booking form not found' });

    if (req.user.role === 'associate') {
      if (form.associate_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      if (form.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Cannot delete processed form' });
      }
    }

    // Release plot if booked
    if (form.plot_id) {
      await Plot.update({ status: 'available' }, { where: { id: form.plot_id } });
    }

    await form.destroy();
    res.json({ success: true, message: 'Booking form deleted and plot released' });
  } catch (error) {
    next(error);
  }
};

// @desc Approve/Reject/Allot/Cancel booking form (Admin/Accounts only)
// @route PUT /api/booking-forms/:id/status
const updateBookingFormStatus = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { status, rejection_reason, allotment_status, cancellation_reason, refund_amount } = req.body;
    const form = await BookingForm.findByPk(req.params.id, { transaction: t });
    if (!form) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Booking form not found' });
    }

    const updateData = {
      approved_by: req.user.id,
      approved_at: new Date()
    };
    if (status) updateData.status = status;
    if (rejection_reason) updateData.rejection_reason = rejection_reason;
    if (allotment_status) updateData.allotment_status = allotment_status;
    if (cancellation_reason) updateData.cancellation_reason = cancellation_reason;
    if (refund_amount) updateData.refund_amount = refund_amount;

    await form.update(updateData, { transaction: t });

    // Synchronize plot status
    if (form.plot_id) {
      const plot = await Plot.findByPk(form.plot_id, { transaction: t });
      if (plot) {
        if (status === 'approved') {
          plot.status = form.payment_plan_type === 'full' ? 'sold' : 'booked';
          if (allotment_status) plot.allotment_status = allotment_status;
        } else if (status === 'rejected' || status === 'cancelled') {
          plot.status = 'available';
          plot.allotment_status = 'cancelled';

          // Reverse any commissions associated with transactions for this booking/plot
          const txns = await Transaction.findAll({ where: { plot_id: form.plot_id }, transaction: t });
          for (const txn of txns) {
            await txn.update({ status: 'cancelled' }, { transaction: t });
            await reverseCommissionForTransaction(txn.id, cancellation_reason || rejection_reason || 'Booking rejected/cancelled', t);
          }
        }
        await plot.save({ transaction: t });
      }
    }

    // When a booking is approved, make sure the sale transaction exists and commission is credited exactly once
    // (engine itself de-duplicates on transaction + user + role).
    if (status === 'approved' && form.associate_id && form.plot_id) {
      let txn = await Transaction.findOne({
        where: { plot_id: form.plot_id, type: 'sale', seller_associate_id: form.associate_id },
        order: [['id', 'DESC']],
        transaction: t
      });
      const salePrice = roundCurrency(form.total_plot_price || 0);
      if (!txn && salePrice > 0) {
        txn = await Transaction.create({
          transaction_ref: form.transaction_ref || `SALE-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
          plot_id: form.plot_id,
          buyer_id: form.client_id || 1,
          seller_id: 1,
          seller_associate_id: form.associate_id,
          buyer_associate_id: form.associate_id,
          amount: salePrice,
          paid_amount: 0,
          status: 'completed',
          payment_status: 'unpaid',
          deal_date: new Date()
        }, { transaction: t });
      } else if (txn && txn.status !== 'completed') {
        await txn.update({ status: 'completed' }, { transaction: t });
      }
      if (txn) {
        await processCommissionForAssociate(
          form.associate_id, salePrice || parseFloat(txn.amount), txn.id,
          'seller_side', true, t, 'pending', { basePrice: 0, salePrice: salePrice || parseFloat(txn.amount) }
        );
      }
    }

    await t.commit();
    res.json({ success: true, message: `Booking form updated to ${status || allotment_status}`, data: form });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

module.exports = {
  getAssociateDetailsAndUpline,
  createBookingForm,
  getBookingForms,
  getBookingForm,
  updateBookingForm,
  deleteBookingForm,
  updateBookingFormStatus
};
