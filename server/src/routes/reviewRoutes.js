// server/routes/reviewRoutes.js  (Member 4, Module 6)
const router = require('express').Router();
const c = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Role strings are not final (contract Section 11). Change them here only.
const CUSTOMER = 'customer';
const STAFF = ['owner', 'admin', 'manager'];

router.use(protect);

router.post('/', authorize(CUSTOMER), c.createReview);
router.get('/mine', authorize(CUSTOMER), c.mine);
router.get('/summary', authorize(CUSTOMER, ...STAFF), c.summary);

router.get('/', authorize(...STAFF), c.list);
router.patch('/:id', authorize(...STAFF), c.moderate);

module.exports = router;
