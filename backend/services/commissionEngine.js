/**
 * SINGLE AUTHORITATIVE COMMISSION ENGINE - REAL ESTATE MLM SYSTEM
 * ====================================================================================
 * PART 1 - THE EXACT COMMISSION FORMULA
 * ====================================================================================
 * Definitions:
 *  - V  = sale value of the plot (full sale value; never "sale price minus base price").
 *  - Chain = seller U0, then seller's sponsor U1, then U2 ... up to Super Admin.
 *    Walk upward using users.referred_by only. Detect and stop on cycles.
 *  - r(U) = that user's saved commission percentage = users.commission_percent.
 *    This is THE single authoritative column. Never overwrite it automatically.
 *    (Note: users.referral_commission_percent is a legacy duplicate; never used for calculation).
 *  - Admin assigns each new associate a rate from the slab menu; rate does not change by itself.
 *  - H = running maximum of r() over the chain below the current person.
 *
 * Rules (decimal-safe, round every amount to 2 decimals, store amounts as DECIMAL):
 *  1. Seller:                 C0 = V x r(U0) / 100
 *  2. Each upline Ui (i>=1):  Ci = V x max(0, r(Ui) - H) / 100, then H = max(H, r(Ui)).
 *     An upline whose rate is <= H gets 0 and does not raise H.
 *  3. Total paid on one sale = V x (highest rate in the chain) / 100. Never exceeds that pool.
 *  4. Commission goes ONLY upward in the chain. Siblings and unrelated associates get nothing.
 *     Nobody is paid twice for the same sale (unique key: sale + beneficiary).
 *  5. Super Admin is a normal member of the chain: if the Super Admin is above the seller
 *     and has the highest rate, he receives the remaining difference.
 *
 * Commission status: pending -> approved -> paid/partial.
 * Cancelling or correcting a sale reverses/adjusts its commission rows
 * (never silently edit paid rows; create a negative adjustment entry instead).
 * ====================================================================================
 */

const { User, Slab, Commission, RewardLog, Wallet, WalletTransaction, Notification } = require('../models');
const { Op } = require('sequelize');

// Safe 2-decimal currency rounding (banker-safe)
const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const roundCurrency = round2;

// Safe 4-decimal percentage rounding
const roundPercent = (p) => Math.round((Number(p || 0) + Number.EPSILON) * 10000) / 10000;

/**
 * Pure calculation function: builds upline chain and calculates exact commission
 * for seller and every eligible upline according to Part 1 rules.
 *
 * @param {number|object} sellerInput - User model instance or seller user id
 * @param {number} saleValue - Total sale value V
 * @param {object} options - Optional dbTransaction, etc.
 * @returns {Promise<object>} Calculation breakdown and summary
 */
const calculateCommissionChain = async (sellerInput, saleValue, options = {}) => {
  const tx = options.transaction || null;
  const V = round2(saleValue);
  if (V <= 0) {
    throw new Error('Sale value must be greater than 0');
  }

  // 1. Resolve seller user
  let seller = null;
  if (typeof sellerInput === 'object' && sellerInput !== null && sellerInput.id) {
    seller = sellerInput;
  } else {
    seller = await User.findByPk(sellerInput, {
      attributes: ['id', 'name', 'login_id', 'phone', 'role', 'commission_percent', 'referred_by'],
      transaction: tx
    });
  }
  if (!seller) {
    throw new Error(`Seller associate not found: ID ${sellerInput}`);
  }
  if (seller.role === 'client') {
    throw new Error(`Clients cannot receive associate commission calculations`);
  }

  // 2. Build the upward chain using users.referred_by ONLY (detect & stop on cycles)
  const chain = [seller];
  const visited = new Set([seller.id]);
  let current = seller;

  while (current.referred_by) {
    const parentId = current.referred_by;
    if (visited.has(parentId)) {
      console.warn(`[CommissionEngine] Cycle detected at User ID ${parentId} in sponsor chain of ${seller.id}`);
      break;
    }
    visited.add(parentId);

    const parent = await User.findByPk(parentId, {
      attributes: ['id', 'name', 'login_id', 'phone', 'role', 'commission_percent', 'referred_by'],
      transaction: tx
    });
    if (!parent) break;

    // Safety: only legitimate associates or admin can be uplines in commission chain
    if (parent.role === 'admin' || parent.role === 'associate') {
      chain.push(parent);
    }
    current = parent;

    // Safety limit to prevent infinite loops in damaged data
    if (chain.length > 50) break;
  }

  // 3. Apply exact Part 1 mathematical formulas along the chain
  const breakdown = [];
  const sellerRate = roundPercent(seller.commission_percent || 0);

  // --- Rule 1: Seller (U0) ---
  // When an associate sells a plot personally:
  // Direct-sale commission is NOT awarded to the selling associate.
  // Instead, the associate is eligible for a slab-based milestone reward when their personal sales meet the self-sales target.
  // The seller rate is used as the differential baseline H for uplines.
  let H = sellerRate;

  breakdown.push({
    beneficiary_id: seller.id,
    beneficiary_name: seller.name,
    beneficiary_login_id: seller.login_id,
    beneficiary_role: seller.role,
    level: 0,
    role_level: 'seller_associate',
    seller_id: seller.id,
    seller_rate: sellerRate,
    beneficiary_rate: sellerRate,
    downline_user_id: null,
    downline_percent: 0,
    differential_percent: 0,
    amount: 0,
    is_eligible: false,
    reason: 'Personal / self-sale: direct commission not awarded; eligible for slab-based milestone reward'
  });

  // --- Rule 2: Each upline Ui (i >= 1) ---
  // Ci = V x max(0, r(Ui) - H) / 100, then H = max(H, r(Ui)).
  // An upline whose rate is <= H gets 0 and does not raise H.
  for (let i = 1; i < chain.length; i++) {
    const upline = chain[i];
    const uplineRate = roundPercent(upline.commission_percent || 0);
    const downlineUser = chain[i - 1];

    if (uplineRate > H) {
      const diffPercent = roundPercent(uplineRate - H);
      const ci = round2((V * diffPercent) / 100);

      breakdown.push({
        beneficiary_id: upline.id,
        beneficiary_name: upline.name,
        beneficiary_login_id: upline.login_id,
        beneficiary_role: upline.role,
        level: i,
        role_level: upline.role === 'admin' ? 'admin_override' : 'seller_referrer',
        seller_id: seller.id,
        seller_rate: sellerRate,
        beneficiary_rate: uplineRate,
        downline_user_id: downlineUser.id,
        downline_percent: H,
        differential_percent: diffPercent,
        amount: ci,
        is_eligible: true
      });

      H = uplineRate;
    } else {
      // uplineRate <= H: gets 0 and does NOT raise H
      breakdown.push({
        beneficiary_id: upline.id,
        beneficiary_name: upline.name,
        beneficiary_login_id: upline.login_id,
        beneficiary_role: upline.role,
        level: i,
        role_level: upline.role === 'admin' ? 'admin_override' : 'seller_referrer',
        seller_id: seller.id,
        seller_rate: sellerRate,
        beneficiary_rate: uplineRate,
        downline_user_id: downlineUser.id,
        downline_percent: H,
        differential_percent: 0,
        amount: 0,
        is_eligible: false,
        reason: `Rate ${uplineRate}% <= running maximum ${H}%`
      });
    }
  }

  // --- Rule 3: Total paid = V x (highest rate in the chain) / 100 ---
  const highestRateInChain = H;
  const expectedPool = round2((V * highestRateInChain) / 100);
  const totalDistributedAmount = round2(
    breakdown.filter(b => b.is_eligible).reduce((sum, b) => sum + b.amount, 0)
  );
  const totalDistributedPercent = roundPercent(
    breakdown.filter(b => b.is_eligible).reduce((sum, b) => sum + b.differential_percent, 0)
  );

  return {
    sale_value: V,
    seller: {
      id: seller.id,
      name: seller.name,
      login_id: seller.login_id,
      rate: sellerRate
    },
    chain_length: chain.length,
    highest_rate_in_chain: highestRateInChain,
    expected_pool: expectedPool,
    total_distributed_amount: totalDistributedAmount,
    total_distributed_percent: totalDistributedPercent,
    breakdown
  };
};

/**
 * Preview / simulate commission distribution across the upline chain
 * for an associate and transaction amount without saving to DB.
 */
const previewCommissionDistribution = async (closingAssociateId, dealAmount) => {
  const result = await calculateCommissionChain(closingAssociateId, dealAmount);
  return {
    deal_amount: result.sale_value,
    sale_value: result.sale_value,
    seller: result.seller,
    highest_rate: result.highest_rate_in_chain,
    total_distributed_amount: result.total_distributed_amount,
    total_distributed_percent: result.total_distributed_percent,
    breakdown: result.breakdown.map(b => ({
      user_id: b.beneficiary_id,
      name: b.beneficiary_name,
      login_id: b.beneficiary_login_id,
      role: b.role_level,
      level: b.level,
      own_percent: b.beneficiary_rate,
      downline_percent: b.downline_percent,
      differential_percent: b.differential_percent,
      amount: b.amount,
      base_amount: result.sale_value,
      eligible_difference: result.sale_value,
      is_eligible: b.is_eligible,
      reason: b.reason || null
    }))
  };
};

/**
 * Processes and persists commission for a completed sale transaction.
 * - Single authoritative calculation
 * - Persists each eligible beneficiary row into table `commissions`
 * - De-duplicates on (transaction_id, user_id)
 * - Stores all required ledger audit fields
 *
 * @param {number} sellerAssociateId - The selling associate ID (transaction.seller_associate_id)
 * @param {number} dealAmount - Full sale value V
 * @param {number} transactionId - Transaction ID
 * @param {string} sideLabel - 'seller_side' (kept for API signature compatibility)
 * @param {boolean} isSelfSale - Ignored (kept for signature compatibility)
 * @param {object} dbTransaction - Active Sequelize transaction
 * @param {string} initialStatus - 'pending' (default) | 'approved' | 'paid'
 */
const processCommissionForAssociate = async (
  sellerAssociateId,
  dealAmount,
  transactionId,
  sideLabel = 'seller_side',
  isSelfSale = true,
  dbTransaction = null,
  initialStatus = 'pending'
) => {
  // Commission goes ONLY to the seller and the seller's upline chain.
  // Ignore buyer_side calls to prevent pool doubling.
  if (sideLabel === 'buyer_side') {
    return [];
  }

  const calculation = await calculateCommissionChain(sellerAssociateId, dealAmount, { transaction: dbTransaction });
  const results = [];
  const V = calculation.sale_value;
  const seller = calculation.seller;

  // 1. Update seller's running business volume
  const sellerRow = await User.findByPk(seller.id, { transaction: dbTransaction });
  if (sellerRow) {
    sellerRow.total_business_volume = round2(parseFloat(sellerRow.total_business_volume || 0) + V);
    sellerRow.self_business_volume  = round2(parseFloat(sellerRow.self_business_volume || 0) + V);
    await sellerRow.save({ transaction: dbTransaction });
  }

  // 1b. Check & record self-sale slab reward for seller
  await syncSelfSaleReward(seller.id, dbTransaction);

  // 2. Persist each eligible beneficiary commission row
  for (const item of calculation.breakdown) {
    if (!item.is_eligible || item.amount <= 0) continue;

    // Rule 4: Nobody is paid twice for the same sale (unique key: transaction_id + user_id)
    const existing = await Commission.findOne({
      where: {
        transaction_id: transactionId,
        user_id: item.beneficiary_id
      },
      transaction: dbTransaction
    });
    if (existing) {
      continue;
    }

    const isPaid = ['credited', 'paid'].includes(initialStatus);
    const slipNumber = `SLIP-TX${transactionId}-U${item.beneficiary_id}-L${item.level}`;

    const comm = await Commission.create({
      transaction_id: transactionId,
      seller_id: seller.id,
      user_id: item.beneficiary_id,
      downline_user_id: item.downline_user_id,
      level: item.level,
      role_level: item.role_level,
      base_amount: V,
      sale_price: V,
      base_price: 0,
      eligible_difference: V,
      seller_rate: item.seller_rate,
      upline_percent: item.beneficiary_rate,
      downline_percent: item.downline_percent,
      differential_percent: item.differential_percent,
      percent: item.differential_percent,
      amount: item.amount,
      paid_amount: isPaid ? item.amount : 0,
      remaining_amount: isPaid ? 0 : item.amount,
      status: initialStatus,
      slip_number: slipNumber,
      is_flagged: false,
      flag_reason: null
    }, { transaction: dbTransaction });

    results.push(comm);

    if (isPaid) {
      await creditWallet(
        item.beneficiary_id,
        item.amount,
        `Commission (${item.differential_percent}%) on Deal #${transactionId}`,
        dbTransaction
      );
    }

    // Create notification for earner
    await Notification.create({
      user_id: item.beneficiary_id,
      title: initialStatus === 'pending' ? 'Commission Generated (Pending Approval) ⏳' : 'Commission Credited! 💰',
      message: `You earned ₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${item.differential_percent}% differential) on Sale #${transactionId}. Status: ${initialStatus}.`,
      type: 'deal'
    }, { transaction: dbTransaction });
  }

  return results;
};

/**
 * Reverses/adjusts commission rows when a sale transaction is cancelled or corrected.
 * - If unpaid: sets status to 'reversed' and remaining to 0.
 * - If paid: creates negative adjustment entry (never silently overwrites paid rows)
 *   and debits user wallet accordingly.
 *
 * @param {number} transactionId - Sale transaction ID
 * @param {string} reason - Reversal reason
 * @param {object} dbTransaction - Active Sequelize transaction
 */
const reverseCommissionForTransaction = async (transactionId, reason = 'Sale cancelled', dbTransaction = null) => {
  const comms = await Commission.findAll({
    where: {
      transaction_id: transactionId,
      status: { [Op.notIn]: ['reversed'] }
    },
    transaction: dbTransaction
  });

  const reversed = [];
  for (const c of comms) {
    const paid = round2(c.paid_amount || 0);

    if (paid > 0) {
      // NEVER silently edit paid rows; create negative adjustment entry instead
      const adj = await Commission.create({
        transaction_id: c.transaction_id,
        seller_id: c.seller_id,
        user_id: c.user_id,
        downline_user_id: c.downline_user_id,
        level: c.level,
        role_level: c.role_level,
        base_amount: c.base_amount,
        sale_price: c.sale_price,
        base_price: 0,
        eligible_difference: c.eligible_difference,
        seller_rate: c.seller_rate,
        upline_percent: c.upline_percent,
        downline_percent: c.downline_percent,
        differential_percent: c.differential_percent,
        percent: 0,
        amount: round2(-paid),
        paid_amount: round2(-paid),
        remaining_amount: 0,
        status: 'reversed',
        slip_number: `${c.slip_number}-REV`,
        reversal_reason: `Adjustment for paid commission: ${reason}`
      }, { transaction: dbTransaction });

      await debitWallet(
        c.user_id,
        paid,
        `Commission reversal on cancelled Sale #${transactionId}`,
        dbTransaction
      );

      c.status = 'reversed';
      c.reversal_reason = reason;
      c.remaining_amount = 0;
      await c.save({ transaction: dbTransaction });

      reversed.push(adj);
    } else {
      // Unpaid row: simply mark reversed
      c.status = 'reversed';
      c.reversal_reason = reason;
      c.remaining_amount = 0;
      await c.save({ transaction: dbTransaction });
      reversed.push(c);
    }
  }

  return reversed;
};

// Find which slab a given business-volume amount falls into
const findSlabForAmount = async (amount) => {
  const amt = round2(amount);
  return Slab.findOne({
    where: {
      min_amount: { [Op.lte]: amt },
      max_amount: { [Op.gt]: amt }
    },
    order: [['slab_number', 'ASC']]
  });
};

// Wallet Helper: Credit
const creditWallet = async (userId, amount, description, dbTransaction) => {
  const roundedAmount = round2(amount);
  if (roundedAmount <= 0) return;

  let wallet = await Wallet.findOne({ where: { user_id: userId }, transaction: dbTransaction });
  if (!wallet) {
    wallet = await Wallet.create({ user_id: userId, balance: 0 }, { transaction: dbTransaction });
  }

  wallet.balance = round2(parseFloat(wallet.balance || 0) + roundedAmount);
  await wallet.save({ transaction: dbTransaction });

  await WalletTransaction.create({
    user_id: userId,
    type: 'credit',
    amount: roundedAmount,
    description,
    status: 'completed'
  }, { transaction: dbTransaction });
};

// Wallet Helper: Debit
const debitWallet = async (userId, amount, description, dbTransaction) => {
  const roundedAmount = round2(amount);
  if (roundedAmount <= 0) return;

  let wallet = await Wallet.findOne({ where: { user_id: userId }, transaction: dbTransaction });
  if (!wallet) {
    wallet = await Wallet.create({ user_id: userId, balance: 0 }, { transaction: dbTransaction });
  }

  wallet.balance = round2(parseFloat(wallet.balance || 0) - roundedAmount);
  await wallet.save({ transaction: dbTransaction });

  await WalletTransaction.create({
    user_id: userId,
    type: 'debit',
    amount: roundedAmount,
    description,
    status: 'completed'
  }, { transaction: dbTransaction });
};

/**
 * Evaluates and synchronizes the associate's self-sale slab reward based on eligible personal sales.
 * - Source of truth: Admin Panel -> Slabs table (self_target_amount & reward_amount)
 * - Only personal sales (seller_associate_id = associateId, status = 'completed') count
 * - Team sales NEVER count toward self-sales target
 * - Awards reward for the highest qualifying slab
 * - Avoids duplicate logs for the same slab
 */
const syncSelfSaleReward = async (associateId, dbTransaction = null) => {
  const { Transaction } = require('../models');

  // 1. Calculate eligible personal sales total from valid completed deals
  const personalSales = await Transaction.findAll({
    where: {
      seller_associate_id: associateId,
      status: 'completed'
    },
    attributes: ['id', 'amount'],
    transaction: dbTransaction
  });
  const selfSalesTotal = round2(personalSales.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0));

  if (selfSalesTotal <= 0) {
    return {
      selfSalesTotal: 0,
      earnedSlab: null,
      rewardAmount: 0,
      rewardStatus: 'Not Eligible'
    };
  }

  // 2. Fetch all slabs from Admin configuration dynamically
  const slabs = await Slab.findAll({
    order: [['self_target_amount', 'ASC'], ['slab_number', 'ASC']],
    transaction: dbTransaction
  });

  // 3. Find highest qualifying slab whose self target has actually been met
  const earnedSlab = slabs.slice().reverse().find(s =>
    parseFloat(s.self_target_amount || 0) > 0 && selfSalesTotal >= parseFloat(s.self_target_amount)
  ) || null;

  const nextTargetSlab = slabs.find(s =>
    parseFloat(s.self_target_amount || 0) > selfSalesTotal
  ) || null;

  if (!earnedSlab) {
    return {
      selfSalesTotal,
      earnedSlab: null,
      nextTargetSlab,
      rewardAmount: 0,
      rewardStatus: 'Pending'
    };
  }

  const rewardAmount = parseFloat(earnedSlab.reward_amount || 0);

  // 4. Ensure RewardLog is saved (preventing duplicates for same user and slab)
  let rewardLog = await RewardLog.findOne({
    where: { user_id: associateId, slab_id: earnedSlab.id },
    transaction: dbTransaction
  });

  if (!rewardLog && rewardAmount > 0) {
    rewardLog = await RewardLog.create({
      user_id: associateId,
      slab_id: earnedSlab.id,
      reward_amount: rewardAmount,
      status: 'pending'
    }, { transaction: dbTransaction });

    // Notification
    await Notification.create({
      user_id: associateId,
      title: `Slab ${earnedSlab.slab_number} Reward Earned! 🏆`,
      message: `Congratulations! Your personal sales reached ₹${selfSalesTotal.toLocaleString('en-IN')}, achieving the Slab ${earnedSlab.slab_number} target (₹${parseFloat(earnedSlab.self_target_amount).toLocaleString('en-IN')}). You earned a milestone reward of ₹${rewardAmount.toLocaleString('en-IN')}.`,
      type: 'reward'
    }, { transaction: dbTransaction });
  }

  return {
    selfSalesTotal,
    earnedSlab,
    nextTargetSlab,
    rewardAmount,
    rewardStatus: 'Earned',
    rewardLog
  };
};

module.exports = {
  calculateCommissionChain,
  previewCommissionDistribution,
  processCommissionForAssociate,
  reverseCommissionForTransaction,
  findSlabForAmount,
  syncSelfSaleReward,
  creditWallet,
  debitWallet,
  round2,
  roundCurrency,
  roundPercent
};
