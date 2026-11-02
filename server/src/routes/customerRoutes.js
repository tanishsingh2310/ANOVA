// server/routes/customerRoutes.js  (Member 4, Module 1)
const router = require('express').Router();
const c = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Role strings are not final (contract Section 11). Change them here only.
const CUSTOMER = 'customer';
const STAFF = ['owner', 'admin', 'manager'];

router.use(protect);

// Customer self-service. Always acts on the token's own user, never on an id from the client.
router.route('/me').get(authorize(CUSTOMER), c.getMe).put(authorize(CUSTOMER), c.updateMe);
router.post('/me/addresses', authorize(CUSTOMER), c.addAddress);
router.route('/me/addresses/:addressId')
  .put(authorize(CUSTOMER), c.updateAddress)
  .delete(authorize(CUSTOMER), c.deleteAddress);

// Staff views (keep AFTER /me so "me" is not read as an id)
router.get('/', authorize(...STAFF), c.listCustomers);
router.get('/:id', authorize(...STAFF), c.getCustomer);

module.exports = router;
