// server/routes/customerRoutes.js
const router = require('express').Router();
const c = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Customer self-service
router.route('/me').get(authorize('customer'), c.getMe).put(authorize('customer'), c.updateMe);
router.post('/me/addresses', authorize('customer'), c.addAddress);
router.route('/me/addresses/:addressId')
  .put(authorize('customer'), c.updateAddress)
  .delete(authorize('customer'), c.deleteAddress);

// Staff views
router.get('/', authorize('owner', 'admin', 'manager'), c.listCustomers);
router.get('/:id', authorize('owner', 'admin', 'manager'), c.getCustomer);

module.exports = router;