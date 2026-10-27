const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Wallet, WalletTransaction, CommissionHistory } = require('../models');
const generateReferralCode = require('../utils/generateReferralCode');
const generatePassword = require('../utils/generatePassword');
const { sendAssociateCredentials, sendCredentialsEmail } = require('../services/emailService');
const { sendCredentialsSMS, cleanPhoneNumber, maskPhone } = require('../services/smsService');
const generateNextDevId = require('../utils/generateNextDevId');
const generateNextAccountsId = require('../utils/generateNextAccountsId');

// @desc Get all users (filter by role via query ?role=client/associate)
// @route GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const { role, status, kyc_status, search } = req.query;
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (kyc_status) where.kyc_status = kyc_status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { login_id: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: User, as: 'referrer', attributes: ['id', 'name', 'login_id', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc Get single user
// @route GET /api/users/:id
const getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: User, as: 'referrer', attributes: ['id', 'name', 'login_id', 'email', 'phone'] },
        { model: User, as: 'referrals', attributes: ['id', 'name', 'login_id', 'email', 'role'] },
        { model: Wallet, as: 'wallet' }
      ]
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc Create user (Admin adds a user manually)
// @route POST /api/users
const createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, referred_by, pan_number, aadhar_number, referral_commission_percent, login_id: customLoginId } = req.body;

    // 1. Mobile number validation (mandatory 10-digit Indian mobile number)
    const validPhone = cleanPhoneNumber(phone);
    if (!validPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number (e.g. 9876543210).'
      });
    }

    // 2. PAN & Aadhar validation for associates
    if (role === 'associate') {
      if (!pan_number || !aadhar_number) {
        return res.status(400).json({
          success: false,
          message: 'PAN number and Aadhar number are mandatory for Associates.'
        });
      }
    }

    // 3. Duplicate checks
    const existingPhone = await User.findOne({ where: { phone: validPhone } });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'This mobile number is already registered. Existing user passwords will not be overwritten.'
      });
    }

    if (email && email.trim()) {
      const existingEmail = await User.findOne({ where: { email: email.trim() } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'This email address is already registered.'
        });
      }
    }

    if (customLoginId && customLoginId.trim()) {
      const existingLogin = await User.findOne({ where: { login_id: customLoginId.trim() } });
      if (existingLogin) {
        return res.status(400).json({
          success: false,
          message: `Login ID / Associate ID "${customLoginId.trim()}" is already registered. Please use a unique ID.`
        });
      }
    }

    // 4. Sponsor validation (if sponsor specified)
    let validatedReferredBy = null;
    if (referred_by && referred_by !== '') {
      const sponsor = await User.findByPk(referred_by);
      if (!sponsor || sponsor.role !== 'associate') {
        return res.status(400).json({
          success: false,
          message: 'Selected sponsor is invalid or is not an Associate.'
        });
      }
      if (sponsor.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Selected sponsor "${sponsor.name}" is inactive or blocked.`
        });
      }
      validatedReferredBy = sponsor.id;
    }

    // 5. Secure initial credentials
    const isAssociate = role === 'associate';
    const plainPassword = (password && password.trim().length >= 6) ? password.trim() : generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const referral_code = generateReferralCode(name);

    // Initial commission rate for associate
    const initialCommPercent = isAssociate
      ? (referral_commission_percent !== undefined && referral_commission_percent !== '' && !isNaN(parseFloat(referral_commission_percent))
          ? parseFloat(referral_commission_percent)
          : 5.0)
      : null;

    // 6. Create user record with temporary password flag
    const user = await User.create({
      name: name.trim(),
      email: email ? email.trim() : null,
      phone: validPhone,
      password: hashedPassword,
      plain_password: plainPassword,
      role: role || 'client',
      referred_by: validatedReferredBy,
      referral_commission_percent: initialCommPercent,
      commission_percent: isAssociate ? (initialCommPercent !== null ? initialCommPercent : 5.0) : 0,
      commission_set_by: 'admin',
      pan_number: pan_number ? pan_number.trim().toUpperCase() : null,
      aadhar_number: aadhar_number ? aadhar_number.trim() : null,
      referral_code,
      kyc_status: isAssociate ? 'approved' : 'not_submitted',
      is_temporary_password: true,
      temporary_password_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours expiry
    });

    // 7. Generate or set unique login ID
    const login_id = (customLoginId && customLoginId.trim())
      ? customLoginId.trim()
      : (role === 'accounts'
          ? await generateNextAccountsId()
          : await generateNextDevId());
    await user.update({ login_id });

    // 8. Auto create wallet
    await Wallet.create({ user_id: user.id, balance: 0 });

    // 8. If associate, create initial CommissionHistory audit entry
    if (isAssociate && initialCommPercent !== null) {
      await CommissionHistory.create({
        user_id: user.id,
        previous_percent: 0,
        new_percent: initialCommPercent,
        changed_by: req.user ? req.user.id : null,
        effective_date: new Date(),
        reason: 'Initial commission percentage set at registration'
      });
    }

    // 9. Dispatch Login Credentials to the REGISTERED mobile number
    const smsResult = await sendCredentialsSMS(validPhone, login_id, plainPassword, user.id);

    // Update delivery status on user record
    await user.update({
      last_sms_sent_at: new Date(),
      last_sms_status: smsResult.success ? (smsResult.mock ? 'mock_delivered' : 'sent') : 'failed'
    });

    // 10. Optional Email delivery if email provided
    let emailSent = false;
    if (user.email) {
      try {
        const emailResult = await sendCredentialsEmail(user, login_id, plainPassword);
        emailSent = Boolean(emailResult && emailResult.success && !emailResult.mock);
      } catch (e) {
        console.error('[User Registration] Email sending failed (non-blocking):', e.message);
      }
    }

    const { password: _, plain_password: __, ...userData } = user.toJSON();

    res.status(201).json({
      success: true,
      message: `User ${user.name} created successfully. Credentials dispatched to registered mobile number.`,
      data: userData,
      login_id,
      generatedPassword: plainPassword, // Shown only once in the modal response to the admin performing registration
      smsDelivery: {
        success: smsResult.success,
        mock: smsResult.mock || false,
        provider: smsResult.provider || 'mock',
        phone: smsResult.phone || maskPhone(validPhone),
        message: smsResult.message || (smsResult.success ? 'Credentials sent via SMS' : smsResult.error)
      },
      emailSent
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update user
// @route PUT /api/users/:id
// @desc Update user
// @route PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const {
      name, email, phone, role, status, referred_by,
      pan_number, aadhar_number, password, confirm_password,
      login_id, commission_percent, referral_commission_percent
    } = req.body;

    // Sponsor validation and circular hierarchy check
    let validatedReferredBy = user.referred_by;
    if (referred_by !== undefined) {
      if (!referred_by || referred_by === '') {
        validatedReferredBy = null;
      } else {
        const sponsorId = parseInt(referred_by);
        if (sponsorId === parseInt(user.id)) {
          return res.status(400).json({
            success: false,
            message: 'An Associate cannot be their own sponsor / upline.'
          });
        }

        const sponsor = await User.findByPk(sponsorId);
        if (!sponsor || (sponsor.role !== 'associate' && sponsor.role !== 'admin')) {
          return res.status(400).json({
            success: false,
            message: 'Selected sponsor is invalid or is not an Associate or Admin.'
          });
        }
        if (sponsor.status !== 'active') {
          return res.status(400).json({
            success: false,
            message: `Selected sponsor "${sponsor.name}" is inactive or blocked.`
          });
        }

        // Circular loop check: traverse upline from proposed sponsor
        let curr = sponsor;
        const visited = new Set([parseInt(user.id)]);
        while (curr && curr.referred_by) {
          if (visited.has(curr.referred_by)) {
            return res.status(400).json({
              success: false,
              message: 'Circular sponsor relationship detected! An associate cannot have their own downline as their sponsor.'
            });
          }
          visited.add(curr.referred_by);
          curr = await User.findByPk(curr.referred_by, { attributes: ['id', 'referred_by'] });
        }

        validatedReferredBy = sponsorId;
      }
    }

    // Check unique login_id if changed
    if (login_id && login_id.trim() && login_id.trim() !== user.login_id) {
      const existingLogin = await User.findOne({ where: { login_id: login_id.trim() } });
      if (existingLogin && existingLogin.id !== user.id) {
        return res.status(400).json({
          success: false,
          message: `Login ID "${login_id.trim()}" is already in use.`
        });
      }
    }

    // Commission percentage validation & audit trail for associates
    const effectiveRole = role ?? user.role;
    let commissionUpdated = false;
    let prevComm = parseFloat(user.commission_percent || 0);
    let newComm = null;

    const commInput = commission_percent !== undefined ? commission_percent : referral_commission_percent;
    if (effectiveRole === 'associate' && commInput !== undefined && commInput !== null && String(commInput).trim() !== '') {
      newComm = parseFloat(commInput);
      if (isNaN(newComm) || newComm < 0 || newComm > 100) {
        return res.status(400).json({
          success: false,
          message: 'Commission percentage must be a valid number between 0% and 100%.'
        });
      }
      newComm = Math.round((newComm + Number.EPSILON) * 10000) / 10000;
      if (Math.abs(newComm - prevComm) > 0.0001) {
        commissionUpdated = true;
      }
    }

    const updateFields = {
      name: name !== undefined && name !== null ? String(name).trim() : user.name,
      email: email !== undefined ? (email ? String(email).trim() : null) : user.email,
      phone: phone !== undefined && phone !== null ? String(phone).trim() : user.phone,
      login_id: login_id !== undefined ? (login_id ? String(login_id).trim() : user.login_id) : user.login_id,
      role: role ?? user.role,
      status: status ?? user.status,
      referred_by: validatedReferredBy,
      pan_number: pan_number !== undefined ? (pan_number ? String(pan_number).trim().toUpperCase() : null) : user.pan_number,
      aadhar_number: aadhar_number !== undefined ? (aadhar_number ? String(aadhar_number).trim() : null) : user.aadhar_number,
    };

    if (commissionUpdated && newComm !== null) {
      updateFields.commission_percent = newComm;
      updateFields.referral_commission_percent = newComm;
      updateFields.commission_set_by = req.user?.role || 'admin';
    }

    await user.update(updateFields);

    // Save audit entry in CommissionHistory
    if (commissionUpdated && newComm !== null) {
      await CommissionHistory.create({
        user_id: user.id,
        previous_percent: prevComm,
        new_percent: newComm,
        changed_by: req.user ? req.user.id : null,
        effective_date: new Date(),
        reason: req.body.reason || 'Admin updated commission percentage in User Management'
      });
    }

    // Secure password update if provided
    if (password && password.trim() !== '') {
      const plainPwd = password.trim();
      if (plainPwd.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters.'
        });
      }
      if (confirm_password !== undefined && confirm_password !== null && confirm_password.trim() !== '') {
        if (plainPwd !== confirm_password.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Password and Confirm Password do not match.'
          });
        }
      }
      user.password = await bcrypt.hash(plainPwd, 10);
      user.plain_password = plainPwd;
      user.is_temporary_password = false;
      await user.save();
      // Send email on password update if they have an email
      if (user.email) {
        try {
          await sendCredentialsEmail(user, user.login_id || user.phone, plainPwd);
        } catch (_) {}
      }
    }

    const { password: _, ...userData } = user.toJSON();
    res.json({
      success: true,
      message: commissionUpdated
        ? `Associate updated successfully. Commission rate set to ${newComm}%.`
        : 'User updated successfully.',
      data: userData
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete user (complete cascade-safe deletion for Admin)
// @route DELETE /api/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);

    // 1. Only Super Admin (ID: 1) is completely protected from deletion
    if (targetId === 1) {
      return res.status(403).json({
        success: false,
        message: 'Super Admin account is protected and cannot be deleted.'
      });
    }

    // 2. Prevent self-deletion
    if (req.user && req.user.id === targetId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete your own account.'
      });
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const deletedName = user.name;
    const {
      Transaction, Commission, CommissionPayment, CommissionHistory,
      PayoutStatement, RewardLog, BookingForm, Payment, Complaint,
      Notification, AuditLog, SmsLog, DailyRecord, Plot
    } = require('../models');

    // 3. Clean up all foreign key references before deleting user
    // A. Downline network: unlink referred_by
    await User.update({ referred_by: null }, { where: { referred_by: targetId } });

    // B. Wallets & transactions
    await WalletTransaction.destroy({ where: { user_id: targetId } }).catch(() => {});
    await Wallet.destroy({ where: { user_id: targetId } }).catch(() => {});

    // C. Notifications, complaints, rewards, logs
    await Notification.destroy({ where: { user_id: targetId } }).catch(() => {});
    await Complaint.destroy({ where: { user_id: targetId } }).catch(() => {});
    if (RewardLog) await RewardLog.destroy({ where: { user_id: targetId } }).catch(() => {});
    if (AuditLog) await AuditLog.destroy({ where: { user_id: targetId } }).catch(() => {});
    if (SmsLog) await SmsLog.destroy({ where: { user_id: targetId } }).catch(() => {});

    // D. Commission records
    if (CommissionPayment) {
      await CommissionPayment.destroy({ where: { associate_id: targetId } }).catch(() => {});
      await CommissionPayment.destroy({ where: { recorded_by: targetId } }).catch(() => {});
    }
    if (CommissionHistory) {
      await CommissionHistory.destroy({ where: { user_id: targetId } }).catch(() => {});
      await CommissionHistory.destroy({ where: { changed_by: targetId } }).catch(() => {});
    }
    if (Commission) {
      await Commission.destroy({ where: { user_id: targetId } }).catch(() => {});
      await Commission.destroy({ where: { downline_user_id: targetId } }).catch(() => {});
    }

    // E. Payout statements
    if (PayoutStatement) {
      await PayoutStatement.destroy({ where: { associate_id: targetId } }).catch(() => {});
      await PayoutStatement.destroy({ where: { created_by: targetId } }).catch(() => {});
    }

    // F. Booking forms
    if (BookingForm) {
      await BookingForm.destroy({ where: { associate_id: targetId } }).catch(() => {});
      await BookingForm.destroy({ where: { client_id: targetId } }).catch(() => {});
      await BookingForm.update({ approved_by: 1 }, { where: { approved_by: targetId } }).catch(() => {});
    }

    // G. Daily records & payments
    if (DailyRecord) {
      await DailyRecord.update({ created_by: 1 }, { where: { created_by: targetId } }).catch(() => {});
      await DailyRecord.update({ updated_by: 1 }, { where: { updated_by: targetId } }).catch(() => {});
    }
    if (Payment) {
      await Payment.update({ recorded_by: 1 }, { where: { recorded_by: targetId } }).catch(() => {});
    }

    // H. Plots owner
    if (Plot) {
      await Plot.update({ owner_id: 1 }, { where: { owner_id: targetId } }).catch(() => {});
    }

    // I. Transactions: unlink associate or transfer to admin
    if (Transaction) {
      await Transaction.update({ seller_associate_id: null }, { where: { seller_associate_id: targetId } }).catch(() => {});
      await Transaction.update({ buyer_associate_id: null }, { where: { buyer_associate_id: targetId } }).catch(() => {});
      await Transaction.update({ buyer_id: 1 }, { where: { buyer_id: targetId } }).catch(() => {});
      await Transaction.update({ seller_id: 1 }, { where: { seller_id: targetId } }).catch(() => {});
    }

    // 4. Now safe to delete user record completely
    await user.destroy();

    console.log(`[ADMIN ACTION] User deleted successfully: ID=${targetId} Name="${deletedName}" by Admin ID=${req.user?.id}`);

    res.json({
      success: true,
      message: `${deletedName} has been deleted successfully.`
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting user'
    });
  }
};


// @desc Update KYC status
// @route PUT /api/users/:id/kyc
const updateKycStatus = async (req, res, next) => {
  try {
    const { kyc_status } = req.body; // approved / rejected
    const user = await User.findByPk(req.params.id);
    const updates = { kyc_status };
    if (kyc_status === 'approved' && !user.login_id) {
      updates.login_id = `DEV-${String(user.id).padStart(4, '0')}`;
    }
    await user.update(updates);
    res.json({ success: true, message: `KYC ${kyc_status}`, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc Toggle block/unblock
// @route PUT /api/users/:id/status
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.status = user.status === 'active' ? 'blocked' : 'active';
    await user.save();

    res.json({ success: true, message: `User is now ${user.status}`, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc Get referral tree of an associate (Associates only)
// @route GET /api/users/:id/referral-tree
const getReferralTree = async (req, res, next) => {
  try {
    const referrals = await User.findAll({
      where: {
        referred_by: req.params.id,
        role: 'associate',
        status: { [Op.ne]: 'deleted' }
      },
      attributes: { exclude: ['password'] }
    });
    res.json({ success: true, data: referrals });
  } catch (error) {
    next(error);
  }
};

// @desc  Approve a pending user registration (admin action)
// @route POST /api/users/:id/approve
const approveAssociate = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // We now allow approving any user in pending_approval state
    if (user.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'User is not pending approval' });
    }

    await user.update({ 
      kyc_status: 'approved', 
      status: 'active',
      approved_by: req.user.id,
      approved_at: new Date()
    });

    // Ensure login_id is set if not already
    if (!user.login_id) {
      const login_id = `DEV-${String(user.id).padStart(4, '0')}`;
      await user.update({ login_id });
    }

    const { password, ...userData } = user.toJSON();
    res.json({ success: true, message: `${user.name} has been approved and can now login.`, data: userData });
  } catch (error) {
    next(error);
  }
};

// @desc Reject a pending associate registration (admin action)
// @route POST /api/users/:id/reject
const rejectAssociate = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const { rejection_reason } = req.body;
    await user.update({
      status: 'blocked',
      kyc_status: 'rejected',
      rejection_reason
    });

    res.json({ success: true, message: `${user.name} rejected.` });
  } catch (error) {
    next(error);
  }
};

// @desc Generate a JWT to login as a specific user (Admin impersonation)
// @route POST /api/users/:id/impersonate
const generateToken = require('../utils/generateToken');
const impersonateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot impersonate another admin' });
    }

    // Generate JWT with standard user ID payload
    // To identify it as an impersonation token, we could inject impersonated_by, but standard generateToken only takes userId.
    // Instead we'll use a custom jsonwebtoken sign here to include the impersonator.
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, impersonated_by: req.user.id },
      process.env.JWT_SECRET || 'devojas_secret_123', // matching standard token generation
      { expiresIn: '1h' } // Short lived
    );

    res.json({ 
      success: true, 
      token,
      user: {
        id: user.id,
        login_id: user.login_id,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get 6 fixed associate accounts
// @route GET /api/users/fixed-associates
const getFixedAssociates = async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: { is_fixed_associate: true },
      attributes: ['id', 'login_id', 'name', 'email', 'phone', 'role', 'status', 'commission_percent', 'plain_password'],
      order: [['login_id', 'ASC']]
    });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc Admin resets password for any user
// @route POST /api/users/:id/admin-reset-password
const adminResetPassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { new_password } = req.body;
    const plainPwd = (new_password && new_password.trim().length >= 4)
      ? new_password.trim()
      : generatePassword();

    user.password = await bcrypt.hash(plainPwd, 10);
    user.plain_password = plainPwd;
    user.is_temporary_password = true;
    user.temporary_password_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    res.json({
      success: true,
      message: `Password reset for ${user.name}`,
      newPassword: plainPwd,
      login_id: user.login_id
    });
  } catch (error) {
    next(error);
  }
};

// @desc Reset password for fixed associate
// @route POST /api/users/:id/reset-fixed-associate
const resetFixedAssociatePassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.params.id, is_fixed_associate: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Fixed associate not found' });
    
    const newPassword = generatePassword();
    user.password = await bcrypt.hash(newPassword, 10);
    user.plain_password = newPassword;
    await user.save();
    
    if (user.email) {
      await sendCredentialsEmail(user, user.login_id, newPassword);
    }
    
    res.json({ success: true, message: 'Password reset successfully', newPassword });
  } catch (error) {
    next(error);
  }
};

// @desc Resend login credentials via SMS to the registered mobile number
// @route POST /api/users/:id/resend-credentials
const resendCredentials = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Rate limiting: check last_sms_sent_at (minimum 60 seconds interval)
    if (user.last_sms_sent_at) {
      const timeSinceLastSms = Date.now() - new Date(user.last_sms_sent_at).getTime();
      if (timeSinceLastSms < 60000) {
        const remainingSeconds = Math.ceil((60000 - timeSinceLastSms) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} seconds before requesting another SMS.`
        });
      }
    }

    const validPhone = cleanPhoneNumber(user.phone);
    if (!validPhone) {
      return res.status(400).json({
        success: false,
        message: `Registered phone number (${user.phone}) is not a valid 10-digit mobile number.`
      });
    }

    // Generate fresh secure temporary credential
    const tempPassword = generatePassword();
    user.password = await bcrypt.hash(tempPassword, 10);
    user.plain_password = tempPassword;
    user.is_temporary_password = true;
    user.temporary_password_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const loginId = user.login_id || `DEV-${String(user.id).padStart(4, '0')}`;
    if (!user.login_id) user.login_id = loginId;

    const smsResult = await sendCredentialsSMS(validPhone, loginId, tempPassword, user.id);

    user.last_sms_sent_at = new Date();
    user.last_sms_status = smsResult.success ? (smsResult.mock ? 'mock_delivered' : 'sent') : 'failed';
    await user.save();

    res.json({
      success: smsResult.success,
      message: smsResult.success
        ? `Credentials successfully dispatched to registered mobile number ${maskPhone(validPhone)}.`
        : `SMS delivery failed: ${smsResult.error}`,
      smsDelivery: smsResult
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Admin: register an Associate through the SAME shared registration service used by public + associate panels
// @route POST /api/users/register-associate
const registerAssociateByAdmin = async (req, res, next) => {
  try {
    const { registerAssociateRecord, deliverCredentials, buildResponse, RegistrationError } = require('../services/associateRegistrationService');
    try {
      const raw = req.body.sponsor_code ? String(req.body.sponsor_code).trim() : '';
      let sponsorId = null;
      if (raw) {
        const rawUpper = raw.toUpperCase();
        const sponsor = await User.findOne({
          where: {
            [Op.or]: [
              { login_id: raw },
              { login_id: rawUpper },
              { referral_code: raw },
              { referral_code: rawUpper }
            ],
            role: { [Op.in]: ['associate', 'admin'] }
          }
        });
        if (!sponsor) return res.status(400).json({ success: false, message: 'Sponsor code not found. Leave blank to place directly under company.' });
        if (sponsor.status !== 'active') return res.status(400).json({ success: false, message: `Sponsor "${sponsor.name}" is not active.` });
        sponsorId = sponsor.id;
      }
      const { user, sponsor, password } = await registerAssociateRecord(req.body, sponsorId, req.user);
      const sms = await deliverCredentials(user, password);
      return res.status(201).json(buildResponse(user, sponsor, sms, 'Associate registered successfully.'));
    } catch (e) {
      if (e instanceof RegistrationError) return res.status(e.status).json({ success: false, message: e.message });
      throw e;
    }
  } catch (error) { next(error); }
};

// @desc  Admin: register an Accounts user through Admin Panel
// @route POST /api/users/register-accounts-user
const registerAccountsUser = async (req, res, next) => {
  try {
    const { name, email, phone, address, pan_number, aadhar_number, password, confirm_password } = req.body;

    // Required field validation
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, message: 'Email Address is required.' });
    }
    // Basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ success: false, message: 'Mobile Number is required.' });
    }
    const validPhone = cleanPhoneNumber(phone);
    if (!validPhone) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }
    if (!pan_number || !String(pan_number).trim()) {
      return res.status(400).json({ success: false, message: 'PAN Number is required.' });
    }
    const pan = String(pan_number).trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      return res.status(400).json({ success: false, message: 'PAN Number must be in format ABCDE1234F.' });
    }
    if (!aadhar_number || !String(aadhar_number).trim()) {
      return res.status(400).json({ success: false, message: 'Aadhaar Number is required.' });
    }
    const aadhar = String(aadhar_number).replace(/\D/g, '');
    if (aadhar.length !== 12) {
      return res.status(400).json({ success: false, message: 'Aadhaar Number must be exactly 12 digits.' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (confirm_password !== undefined && String(password) !== String(confirm_password)) {
      return res.status(400).json({ success: false, message: 'Password and Confirm Password do not match.' });
    }

    // Duplicate checks
    const existingPhone = await User.findOne({ where: { phone: validPhone } });
    if (existingPhone) {
      return res.status(400).json({ success: false, message: 'This mobile number is already registered.' });
    }
    const existingEmail = await User.findOne({ where: { email: String(email).trim() } });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'This email address is already registered.' });
    }
    const existingPan = await User.findOne({ where: { pan_number: pan } });
    if (existingPan) {
      return res.status(400).json({ success: false, message: 'This PAN number is already registered.' });
    }
    const existingAadhar = await User.findOne({ where: { aadhar_number: aadhar } });
    if (existingAadhar) {
      return res.status(400).json({ success: false, message: 'This Aadhaar number is already registered.' });
    }

    // Hash password (never store plaintext)
    const hashedPassword = await bcrypt.hash(String(password), 10);
    const referral_code = generateReferralCode(name);

    // Generate unique ACCOUNTS-XXXX ID
    const login_id = await generateNextAccountsId();

    // Create user with accounts role
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: validPhone,
      address: address ? String(address).trim() : null,
      password: hashedPassword,
      plain_password: null, // Never expose plaintext for accounts users
      role: 'accounts',
      pan_number: pan,
      aadhar_number: aadhar,
      referral_code,
      login_id,
      kyc_status: 'approved',
      status: 'active',
      commission_percent: 0,
      commission_set_by: 'admin',
      is_temporary_password: false
    });

    // Auto create wallet
    await Wallet.create({ user_id: user.id, balance: 0 });

    // Send credentials via SMS if possible
    let smsResult = { success: false, mock: true };
    try {
      smsResult = await sendCredentialsSMS(validPhone, login_id, String(password), user.id);
      await user.update({
        last_sms_sent_at: new Date(),
        last_sms_status: smsResult.success ? (smsResult.mock ? 'mock_delivered' : 'sent') : 'failed'
      });
    } catch (_) {}

    // Send credentials via email if possible
    let emailSent = false;
    try {
      const emailResult = await sendCredentialsEmail(user, login_id, String(password));
      emailSent = Boolean(emailResult && emailResult.success && !emailResult.mock);
    } catch (_) {}

    const { password: _, plain_password: __, ...userData } = user.toJSON();

    res.status(201).json({
      success: true,
      message: `Accounts user "${user.name}" created successfully. Login ID: ${login_id}`,
      data: userData,
      login_id,
      smsDelivery: { success: smsResult.success, mock: smsResult.mock || false },
      emailSent
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerAssociateByAdmin, registerAccountsUser,
  getUsers, getUser, createUser, updateUser, deleteUser,
  updateKycStatus, toggleUserStatus, getReferralTree, 
  approveAssociate, rejectAssociate, impersonateUser,
  getFixedAssociates, resetFixedAssociatePassword,
  resendCredentials, adminResetPassword
};
