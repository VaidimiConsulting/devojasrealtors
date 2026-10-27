const { listLedger, getNetworkCounts, getMonthlyTarget } = require('../services/commissionLedgerService');

// GET /api/commission-ledger  (role-scoped, filterable, paginated)
exports.getLedger = async (req, res, next) => {
  try {
    const data = await listLedger(req.user, req.query);
    res.json({ success: true, ...data });
  } catch (e) { if (e.status) return res.status(e.status).json({ success: false, message: e.message }); next(e); }
};

// GET /api/commission-ledger/network-counts  (admin: all or ?associate_id=, associate: own only)
exports.getCounts = async (req, res, next) => {
  try {
    if (req.user.role === 'associate') return res.json({ success: true, data: await getNetworkCounts(req.user.id) });
    if (!['admin', 'accounts'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (req.query.associate_id) return res.json({ success: true, data: await getNetworkCounts(Number(req.query.associate_id)) });
    res.json({ success: true, data: await getNetworkCounts() });
  } catch (e) { next(e); }
};

// GET /api/commission-ledger/monthly-target?month=YYYY-MM  (associate: own; admin/accounts: ?associate_id=)
exports.getTarget = async (req, res, next) => {
  try {
    let id = req.user.id;
    if (req.user.role !== 'associate') {
      if (!['admin', 'accounts'].includes(req.user.role) || !req.query.associate_id) return res.status(403).json({ success: false, message: 'Not authorized' });
      id = Number(req.query.associate_id);
    }
    const ref = req.query.month && /^\d{4}-\d{2}$/.test(req.query.month) ? new Date(`${req.query.month}-01T12:00:00`) : new Date();
    res.json({ success: true, data: await getMonthlyTarget(id, ref) });
  } catch (e) { next(e); }
};
