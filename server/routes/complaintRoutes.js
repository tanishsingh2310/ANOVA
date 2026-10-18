// server/routes/complaintRoutes.js  (Member 4, Module 6)
const router = require('express').Router();
const c = require('../controllers/complaintController');
// TODO(merge): switch to Member 1's middleware: require('../middleware/auth')
const { protect, authorize } = require('../middleware/devAuth');

const CUSTOMER = 'customer';
const STAFF = ['owner', 'admin', 'manager'];

router.use(protect);

router.post('/', authorize(CUSTOMER), c.create);
router.get('/mine', authorize(CUSTOMER), c.mine);

router.get('/', authorize(...STAFF), c.list);
router.patch('/:id', authorize(...STAFF), c.update);

module.exports = router;
