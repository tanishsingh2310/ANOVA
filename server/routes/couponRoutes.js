// server/routes/couponRoutes.js  (Member 4, Module 5)
const router = require('express').Router();
const c = require('../controllers/couponController');
// TODO(merge): switch to Member 1's middleware: require('../middleware/auth')
const { protect, authorize } = require('../middleware/devAuth');

// Role strings are not final (contract Section 11). Change them here only.
const CUSTOMER = 'customer';
const MANAGE = ['owner', 'admin'];            // create, edit, delete
const VIEW = ['owner', 'admin', 'manager'];   // read-only for managers until branch scope is agreed

// Stops people from guessing codes: 10 checks per minute per user (in memory, per server).
const attempts = new Map();
const limitValidate = (req, res, next) => {
  const now = Date.now();
  const rec = attempts.get(req.user.id);
  if (!rec || now > rec.resetAt) {
    attempts.set(req.user.id, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (rec.count >= 10) {
    return res.status(429).json({ success: false, message: 'Too many attempts. Please wait a minute.' });
  }
  rec.count += 1;
  next();
};

router.use(protect);

// Customer
router.post('/validate', authorize(CUSTOMER), limitValidate, c.validate);
router.get('/offers', authorize(CUSTOMER, ...VIEW), c.listOffers);

// Staff (keep "/" and "/:id" AFTER the fixed paths above)
router.get('/', authorize(...VIEW), c.listCoupons);
router.post('/', authorize(...MANAGE), c.createCoupon);
router.put('/:id', authorize(...MANAGE), c.updateCoupon);
router.delete('/:id', authorize(...MANAGE), c.deleteCoupon);

module.exports = router;
