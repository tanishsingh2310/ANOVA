// server/routes/deliveryRoutes.js  (Member 4, Module 3)
const router = require('express').Router();
const c = require('../controllers/deliveryController');
// TODO(merge): switch to Member 1's middleware: require('../middleware/auth')
const { protect, authorize } = require('../middleware/devAuth');

// Role strings are not final (contract Section 11). Change them here only.
const RIDER = 'delivery';
const CUSTOMER = 'customer';
const STAFF = ['owner', 'admin', 'manager'];

router.use(protect);

// Fixed paths first, so they are not read as an :id
router.get('/mine', authorize(RIDER), c.mine);
router.get('/staff', authorize(...STAFF), c.listStaff);
router.get('/track/:orderId', authorize(CUSTOMER), c.track);

router.get('/', authorize(...STAFF), c.listDeliveries);
router.post('/', authorize(...STAFF), c.createDelivery);
router.get('/:id', authorize(RIDER, ...STAFF), c.getOne);
router.patch('/:id/assign', authorize(...STAFF), c.assign);
router.patch('/:id/status', authorize(RIDER, ...STAFF), c.updateStatus);

module.exports = router;
