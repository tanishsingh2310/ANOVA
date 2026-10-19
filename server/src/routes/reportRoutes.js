// server/routes/reportRoutes.js (Member 4, Module 7: Reports & Analytics)
const router = require('express').Router();
const reportService = require('../services/reportService');
const { protect, authorize } = require('../middleware/authMiddleware');

const STAFF = ['owner', 'admin', 'manager'];

router.use(protect);

/**
 * GET /api/reports/overview
 * Returns branch-wise sales, delivery performance, promo stats, and customer feedback.
 */
router.get('/overview', authorize(...STAFF), async (req, res, next) => {
  try {
    const { timeframe } = req.query;
    // If the user is a manager with an assigned branch, scope to their branch
    const branchId = req.user.role === 'manager' && req.user.branch
      ? req.user.branch
      : req.query.branchId;

    const report = await reportService.getOverviewReport({ branchId, timeframe });
    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
