/**
 * NETWORK CONTROLLER
 * Builds the recruitment/referral tree (genealogy tree) for display.
 * Accurately connects every user to their actual sponsor.
 * Supports searching by name or login_id, viewing from any root,
 * and admin correction of sponsors.
 */
const { sequelize, User } = require('../models');
const { Op } = require('sequelize');

// Fetch root user + ALL descendants as a flat list (Admin & Associates only)
const fetchTree = async (rootId) => {
  try {
    const allUsers = await User.findAll({
      where: {
        role: { [Op.in]: ['admin', 'associate'] },
        status: { [Op.ne]: 'deleted' }
      },
      attributes: [
        'id', 'login_id', 'name', 'role', 'phone', 'email', 'status',
        'kyc_status', 'total_business_volume', 'referral_commission_percent',
        'commission_percent', 'referred_by', 'createdAt', 'referral_code'
      ],
      raw: true
    });

    // Double-check: exclude any client or non-associate/non-admin records
    const validUsers = allUsers.filter(u => {
      const r = String(u.role || '').toLowerCase();
      return r === 'admin' || r === 'associate';
    });

    const result = [];
    const visited = new Set();

    const getChildren = (parentId, level) => {
      const children = validUsers.filter(u => u.referred_by === parentId && !visited.has(u.id));
      for (const child of children) {
        visited.add(child.id);
        result.push({ ...child, level });
        getChildren(child.id, level + 1);
      }
    };

    const rootUser = validUsers.find(u => u.id === rootId);
    if (rootUser) {
      visited.add(rootUser.id);
      result.push({ ...rootUser, level: 0 });
      getChildren(rootId, 1);
    }

    return result.sort((a, b) => a.level - b.level);
  } catch (err) {
    console.error('fetchTree Error:', err.message);
    return [];
  }
};

// Nest a flat list into a tree shape, starting at rootId (only valid admin & associates)
const buildTree = (flatList, rootId) => {
  const map = {};
  const validList = (flatList || []).filter(u => {
    const r = String(u.role || '').toLowerCase();
    return r === 'admin' || r === 'associate';
  });
  validList.forEach((u) => { map[u.id] = { ...u, children: [] }; });

  validList.forEach((u) => {
    if (u.id !== rootId && map[u.referred_by]) {
      map[u.referred_by].children.push(map[u.id]);
    }
  });

  return map[rootId] || null;
};

// @desc  Admin: full company network tree (starts from Company/Admin, branches to all associates)
// @route GET /api/network/full-tree or /api/network/full
const getFullTree = async (req, res, next) => {
  try {
    const { search, rootId } = req.query;

    const allUsers = await User.findAll({
      where: {
        role: { [Op.in]: ['admin', 'associate'] },
        status: { [Op.ne]: 'deleted' }
      },
      attributes: [
        'id', 'login_id', 'name', 'role', 'phone', 'email', 'status',
        'kyc_status', 'total_business_volume', 'referral_commission_percent',
        'commission_percent', 'referred_by', 'createdAt', 'referral_code'
      ],
      raw: true
    });

    // Exclude any client, accounts, or non-associate/non-admin records
    const validUsers = allUsers.filter(u => {
      const r = String(u.role || '').toLowerCase();
      return r === 'admin' || r === 'associate';
    });

    // If specific rootId requested (e.g. inspecting a specific associate branch)
    if (rootId) {
      const targetId = parseInt(rootId, 10);
      const flat = await fetchTree(targetId);
      const tree = buildTree(flat, targetId);
      const totalAssociatesCount = flat.filter(u => String(u.role || '').toLowerCase() === 'associate').length;
      return res.json({
        success: true,
        data: tree ? [tree] : [],
        totalCount: totalAssociatesCount
      });
    }

    // Build the complete company-wide tree
    const map = {};
    validUsers.forEach(u => {
      map[u.id] = { ...u, children: [] };
    });

    // Find Super Admin (ID: 1 or role: 'admin')
    const admin = validUsers.find(u => u.id === 1) || validUsers.find(u => String(u.role || '').toLowerCase() === 'admin') || validUsers[0];
    const adminId = admin ? admin.id : 1;

    const roots = [];

    validUsers.forEach(u => {
      if (u.id === adminId) {
        roots.push(map[u.id]);
      } else if (u.referred_by && map[u.referred_by] && u.referred_by !== u.id) {
        map[u.referred_by].children.push(map[u.id]);
      } else {
        // Direct Company / Root Associate (referred_by is null or 1 or points to missing parent)
        if (map[adminId]) {
          map[adminId].children.push(map[u.id]);
        } else {
          roots.push(map[u.id]);
        }
      }
    });

    const totalAssociates = validUsers.filter(u => String(u.role || '').toLowerCase() === 'associate').length;

    res.json({
      success: true,
      data: roots,
      totalCount: totalAssociates,
      totalUsers: totalAssociates + (admin ? 1 : 0)
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Admin updates a user's sponsor / upline in Tree Network
// @route PUT /api/network/user/:id/sponsor
const updateSponsor = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { new_sponsor_id } = req.body;

    if (targetUserId === 1) {
      return res.status(400).json({ success: false, message: 'Cannot change sponsor for Super Admin' });
    }

    const user = await User.findByPk(targetUserId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (String(user.role || '').toLowerCase() !== 'associate') {
      return res.status(400).json({ success: false, message: 'Only associates can be placed in MLM network tree' });
    }

    let sponsorId = null;
    if (new_sponsor_id) {
      const newSponsor = await User.findByPk(new_sponsor_id);
      if (!newSponsor) return res.status(404).json({ success: false, message: 'New sponsor not found' });
      if (newSponsor.id === targetUserId) {
        return res.status(400).json({ success: false, message: 'User cannot be their own sponsor' });
      }
      const sponsorRole = String(newSponsor.role || '').toLowerCase();
      if (sponsorRole !== 'admin' && sponsorRole !== 'associate') {
        return res.status(400).json({ success: false, message: 'Sponsor must be Super Admin or an Associate' });
      }
      sponsorId = newSponsor.id;
    } else {
      sponsorId = 1; // Default to Super Admin if sponsor cleared
    }

    await user.update({ referred_by: sponsorId });

    console.log(`[NETWORK ADMIN] Updated sponsor for User ID ${user.id} (${user.name}) -> Sponsor ID ${sponsorId}`);

    res.json({
      success: true,
      message: `Sponsor for ${user.name} has been updated successfully.`,
      user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getFullTree, fetchTree, buildTree, updateSponsor };
