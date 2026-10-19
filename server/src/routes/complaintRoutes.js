// server/routes/complaintRoutes.js  (Member 4, Module 6)
const router = require('express').Router();
const c = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');

const CUSTOMER = 'customer';
const STAFF = ['owner', 'admin', 'manager'];

router.use(protect);

router.post('/', authorize(CUSTOMER), c.create);
router.get('/mine', authorize(CUSTOMER), c.mine);

router.get('/', authorize(...STAFF), c.list);
router.patch('/:id', authorize(...STAFF), c.update);

module.exports = router;
