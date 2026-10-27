/**
 * ONE read-model over the saved commission ledger (table `commissions`).
 * Commission Management (Admin / Accounts / Associate), the Accounts payout form and the dashboards all read
 * through this service, so every panel shows the same sale, rates, amounts and balances.
 * It NEVER recalculates commission – amounts come from the ledger rows written by commissionEngine.
 */
const { Op } = require('sequelize');
const { Commission, CommissionPayment, Transaction, Plot, Project, User, BookingForm, Slab } = require('../models');

const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

/** All associates below rootId (BFS, cycle-safe, each counted once). */
const getDownlineIds = async (rootId, preloaded) => {
  const all = preloaded || await User.findAll({ where: { role: 'associate', status: { [Op.ne]: 'deleted' } }, attributes: ['id', 'referred_by'], raw: true });
  const children = new Map();
  for (const u of all) {
    if (u.referred_by) {
      if (!children.has(u.referred_by)) children.set(u.referred_by, []);
      children.get(u.referred_by).push(u.id);
    }
  }
  const seen = new Set([rootId]);
  const out = [];
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift();
    for (const c of children.get(cur) || []) {
      if (!seen.has(c)) { seen.add(c); out.push(c); queue.push(c); }
    }
  }
  return out;
};

const normalise = (c, ctx) => {
  const txn = c.transaction || {};
  const plot = txn.plot || {};
  const seller = txn.sellerAssociate || null;
  const earner = c.earner || {};
  const isDirect = Number(c.level) === 0;
  const sellerRow = ctx.levelZero.get(c.transaction_id);
  const sellerRate = sellerRow ? parseFloat(sellerRow.percent) : (isDirect ? parseFloat(c.percent) : parseFloat(c.downline_percent));
  const beneficiaryRate = isDirect ? parseFloat(c.percent) : parseFloat(c.upline_percent);
  const diffRate = isDirect ? parseFloat(c.percent) : parseFloat(c.differential_percent ?? c.percent);
  const saleAmount = parseFloat(c.sale_price) > 0 ? parseFloat(c.sale_price) : parseFloat(txn.amount || 0);
  const amount = round2(c.amount);
  const paid = round2(c.paid_amount);
  const remaining = c.remaining_amount !== null && c.remaining_amount !== undefined && ['approved', 'partial', 'pending', 'credited'].includes(c.status)
    ? round2(Math.max(0, amount - paid)) : round2(Math.max(0, amount - paid));
  const book = ctx.bookings.get(`${txn.plot_id}:${txn.seller_associate_id}`);
  const refLogin = book && book.referred_id && book.referred_id !== 'DIRECT' ? book.referred_id : null;
  const refUser = refLogin ? ctx.usersByLogin.get(refLogin) : (seller && seller.referred_by ? ctx.usersById.get(seller.referred_by) : null);
  const sponsor = earner.referred_by ? ctx.usersById.get(earner.referred_by) : null;
  const payments = (c.payments || []).filter(p => p.status === 'completed');
  return {
    id: c.id,
    sale_id: txn.transaction_ref || `TXN-${c.transaction_id}`,
    transaction_id: c.transaction_id,
    plot: { id: plot.id || null, plot_number: plot.plot_number || plot.plot_code || null, project: plot.project?.name || null, title: plot.title || null },
    seller: seller ? { id: seller.id, name: seller.name, login_id: seller.login_id } : null,
    referred_by: refUser ? { id: refUser.id, name: refUser.name, login_id: refUser.login_id } : (book?.referred_id === 'DIRECT' ? { name: 'Direct sale', login_id: 'DIRECT' } : null),
    beneficiary: { id: earner.id, name: earner.name, login_id: earner.login_id, current_rate: earner.commission_percent !== undefined ? parseFloat(earner.commission_percent) : null },
    sponsor: sponsor ? { id: sponsor.id, name: sponsor.name, login_id: sponsor.login_id } : null,
    commission_type: isDirect ? 'direct' : 'differential',
    level: Number(c.level),
    sale_amount: round2(saleAmount),
    seller_rate: sellerRate,
    beneficiary_rate: beneficiaryRate,
    differential_rate: diffRate,
    calculation: `₹${round2(saleAmount).toLocaleString('en-IN')} × ${diffRate}%${isDirect ? '' : ` (${beneficiaryRate}% − ${sellerRate === beneficiaryRate ? 'lower tier' : 'downline tier'})`}`,
    amount,
    paid_amount: paid,
    remaining_amount: remaining,
    status: c.status,
    payout_refs: payments.map(p => p.payment_reference || p.payment_ref),
    receipt_refs: payments.map(p => p.payment_ref),
    created_at: c.createdAt
  };
};

const loadContext = async (commissions) => {
  const txnIds = [...new Set(commissions.map(c => c.transaction_id))];
  const levelZeroRows = txnIds.length ? await Commission.findAll({ where: { transaction_id: txnIds, level: 0 }, attributes: ['transaction_id', 'percent'], raw: true }) : [];
  const levelZero = new Map(levelZeroRows.map(r => [r.transaction_id, r]));
  const plotIds = [...new Set(commissions.map(c => c.transaction?.plot_id).filter(Boolean))];
  const bookRows = plotIds.length ? await BookingForm.findAll({ where: { plot_id: plotIds }, attributes: ['plot_id', 'associate_id', 'referred_id', 'id'], order: [['id', 'ASC']], raw: true }) : [];
  const bookings = new Map(bookRows.map(b => [`${b.plot_id}:${b.associate_id}`, b]));
  const users = await User.findAll({ where: { role: { [Op.in]: ['associate', 'admin'] } }, attributes: ['id', 'name', 'login_id', 'referred_by'], raw: true });
  return { levelZero, bookings, usersById: new Map(users.map(u => [u.id, u])), usersByLogin: new Map(users.map(u => [u.login_id, u])) };
};

const INCLUDE = [
  { model: Transaction, as: 'transaction', include: [
      { model: Plot, as: 'plot', attributes: ['id', 'plot_number', 'plot_code', 'title', 'project_id'], include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }] },
      { model: User, as: 'sellerAssociate', attributes: ['id', 'name', 'login_id', 'referred_by'] }
  ] },
  { model: User, as: 'earner', attributes: ['id', 'name', 'login_id', 'commission_percent', 'referred_by'] },
  { model: CommissionPayment, as: 'payments', required: false }
];

/**
 * List ledger rows visible to `user`.
 *  admin / accounts : everything (optional associate_id filter)
 *  associate        : own entries + entries of own downline only
 */
const listLedger = async (user, q = {}) => {
  const where = {};
  if (user.role === 'associate') {
    const downlineIds = await getDownlineIds(user.id);
    if (q.scope === 'downline') {
      // Downline Commission: ONLY what THIS associate earned FROM HIS OWN DOWNLINE's sales
      // (rows where beneficiary = me and seller is someone below me)
      where.user_id = user.id;
      where.level = { [Op.gt]: 0 };
      if (downlineIds.length) {
        where[Op.or] = [
          { seller_id: { [Op.in]: downlineIds } },
          { downline_user_id: { [Op.in]: downlineIds } }
        ];
      } else {
        where.id = -1; // No downline = no downline commission
      }
    } else if (q.scope === 'own') {
      // Own sales commission: beneficiary = me, level = 0
      where.user_id = user.id;
      where.level = 0;
    } else {
      where.user_id = user.id;
    }
  } else if (['admin', 'accounts'].includes(user.role)) {
    if (q.associate_id) where.user_id = Number(q.associate_id);
  } else {
    const e = new Error('Not authorized'); e.status = 403; throw e;
  }
  if (q.status && q.status !== 'all') where.status = q.status;
  if (q.type === 'direct') where.level = 0;
  if (q.type === 'differential') where.level = { [Op.gt]: 0 };
  if (q.from || q.to) {
    where.createdAt = {};
    if (q.from) where.createdAt[Op.gte] = new Date(`${q.from}T00:00:00`);
    if (q.to) where.createdAt[Op.lte] = new Date(`${q.to}T23:59:59`);
  }
  const commissions = await Commission.findAll({ where, include: INCLUDE, order: [['id', 'DESC']] });
  const ctx = await loadContext(commissions);
  let rows = commissions.map(c => normalise(c, ctx));

  if (q.search) {
    const s = String(q.search).toLowerCase();
    rows = rows.filter(r => [r.sale_id, r.plot.plot_number, r.plot.project, r.seller?.name, r.seller?.login_id, r.beneficiary.name, r.beneficiary.login_id, r.referred_by?.name, r.referred_by?.login_id]
      .some(v => v && String(v).toLowerCase().includes(s)));
  }
  const totals = rows.reduce((t, r) => ({
    sale_amount: round2(t.sale_amount + (r.commission_type === 'direct' ? r.sale_amount : 0)),
    commission: round2(t.commission + r.amount),
    paid: round2(t.paid + r.paid_amount),
    remaining: round2(t.remaining + (['rejected', 'reversed'].includes(r.status) ? 0 : r.remaining_amount))
  }), { sale_amount: 0, commission: 0, paid: 0, remaining: 0 });

  const page = Math.max(1, parseInt(q.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(q.limit) || 25));
  const total = rows.length;
  return { rows: rows.slice((page - 1) * limit, page * limit), totals, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
};

/** Approved, unpaid (remaining > 0) entries of ONE associate – the only entries Accounts may settle. */
const getPayableEntries = async (associateId, transaction) => {
  const commissions = await Commission.findAll({
    where: { user_id: associateId, status: { [Op.in]: ['pending', 'approved', 'partial', 'credited'] } },
    include: INCLUDE, order: [['id', 'ASC']], transaction
  });
  const ctx = await loadContext(commissions);
  return commissions.map(c => normalise(c, ctx)).filter(r => r.remaining_amount > 0);
};

/** Direct + differential associate counts for every associate (or one), from real parent links. */
const getNetworkCounts = async (onlyId) => {
  const all = await User.findAll({ where: { role: 'associate', status: { [Op.ne]: 'deleted' } }, attributes: ['id', 'name', 'login_id', 'status', 'referred_by'], raw: true });
  const byId = new Map(all.map(u => [u.id, u]));
  const direct = new Map();
  for (const u of all) if (u.referred_by && byId.has(u.referred_by)) { if (!direct.has(u.referred_by)) direct.set(u.referred_by, []); direct.get(u.referred_by).push(u.id); }
  const isActive = (id) => byId.get(id).status === 'active';
  const countFor = (id) => {
    const seen = new Set([id]); const stack = [id]; const desc = [];
    while (stack.length) { const cur = stack.pop(); for (const c of direct.get(cur) || []) if (!seen.has(c)) { seen.add(c); desc.push(c); stack.push(c); } }
    const d = direct.get(id) || [];
    return {
      direct_associates: d.length,
      total_downline: desc.length,
      active_associates: desc.filter(isActive).length,
      pending_associates: desc.filter(x => !isActive(x)).length
    };
  };
  if (onlyId) return { id: onlyId, ...countFor(onlyId) };
  return all.map(u => ({ id: u.id, name: u.name, login_id: u.login_id, ...countFor(u.id) }));
};

/**
 * Eligible business volume of ONE calendar month (own sales + downline sales), computed live from completed
 * transactions. A new month therefore starts at 0 automatically, history stays untouched, and cancelled /
 * corrected sales are reflected immediately. Independent per associate.
 */
const monthlyBusiness = async (associateId, refDate) => {
  const d = refDate ? new Date(refDate) : new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const sum = async (ids) => {
    if (!ids.length) return 0;
    const v = await Transaction.sum('amount', { where: { seller_associate_id: { [Op.in]: ids }, status: 'completed', createdAt: { [Op.gte]: start, [Op.lt]: end } } });
    return round2(v || 0);
  };
  const self = await sum([associateId]);
  const team = await sum(await getDownlineIds(associateId));
  return { month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`, self_business: self, team_business: team, total_business: round2(self + team) };
};

/** Month progress + admin-configured slab (min/max/percentage/reward/self_target) + next slab to reach. */
const getMonthlyTarget = async (associateId, refDate) => {
  const biz   = await monthlyBusiness(associateId, refDate);
  const slabs = await Slab.findAll({ order: [['min_amount', 'ASC']] });
  const cur   = slabs.find(s => biz.total_business >= parseFloat(s.min_amount) && biz.total_business <= parseFloat(s.max_amount)) || null;
  const next  = slabs.find(s => parseFloat(s.min_amount) > biz.total_business) || null;
  const f = (s) => s && {
    id: s.id, slab_number: s.slab_number,
    min_amount: parseFloat(s.min_amount), max_amount: parseFloat(s.max_amount),
    percentage: parseFloat(s.percentage),
    reward_amount: parseFloat(s.reward_amount || 0),
    self_target_amount: parseFloat(s.self_target_amount || 0)
  };
  const selfTargetAmt = cur ? parseFloat(cur.self_target_amount || 0) : 0;
  const selfTargetAchieved = cur && selfTargetAmt > 0 ? (biz.self_business >= selfTargetAmt) : false;
  const eligibleReward = (cur && selfTargetAchieved) ? parseFloat(cur.reward_amount || 0) : 0;
  const rewardEligible = Boolean(cur && selfTargetAchieved && parseFloat(cur.reward_amount || 0) > 0);
  return {
    ...biz,
    current_slab:         f(cur),
    next_slab:            f(next),
    remaining_to_next:    next ? round2(parseFloat(next.min_amount) - biz.total_business) : 0,
    self_target_achieved: selfTargetAchieved,
    self_target_amount:   selfTargetAmt,
    eligible_reward:      eligibleReward,
    reward_eligible:      rewardEligible,
    slabs:                slabs.map(f)
  };
};

module.exports = { listLedger, getPayableEntries, getNetworkCounts, getDownlineIds, round2, monthlyBusiness, getMonthlyTarget };
