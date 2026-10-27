const express = require('express');
const router = express.Router();
const {
  getUsers, getUser, createUser, updateUser, deleteUser,
  updateKycStatus, toggleUserStatus, getReferralTree, 
  approveAssociate, rejectAssociate, impersonateUser,
  getFixedAssociates, resetFixedAssociatePassword,
  resendCredentials, adminResetPassword, registerAssociateByAdmin, registerAccountsUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/fixed-associates', getFixedAssociates);
router.post('/:id/reset-fixed-associate', resetFixedAssociatePassword);
router.post('/:id/resend-credentials', resendCredentials);

router.get('/', getUsers);
router.post('/register-associate', registerAssociateByAdmin);
router.post('/register-accounts-user', registerAccountsUser);
router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/kyc', updateKycStatus);
router.put('/:id/status', toggleUserStatus);
router.get('/:id/referral-tree', getReferralTree);
router.post('/:id/approve', approveAssociate);
router.post('/:id/reject', rejectAssociate);
router.post('/:id/impersonate', impersonateUser);
router.post('/:id/admin-reset-password', adminResetPassword);

module.exports = router;
