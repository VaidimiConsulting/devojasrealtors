const express = require('express');
const router = express.Router();
const { 
  createBookingForm,
  getBookingForms,
  getBookingForm,
  updateBookingForm,
  deleteBookingForm,
  updateBookingFormStatus,
  getAssociateDetailsAndUpline
} = require('../controllers/bookingFormController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/associate-details/:id', getAssociateDetailsAndUpline);

router.route('/')
  .post(createBookingForm)
  .get(getBookingForms);

router.route('/:id')
  .get(getBookingForm)
  .put(updateBookingForm)
  .delete(deleteBookingForm);

router.put('/:id/status', authorize('admin', 'accounts'), updateBookingFormStatus);

module.exports = router;
