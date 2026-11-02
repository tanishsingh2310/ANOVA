// server/routes/reportRoutes.js (Member 4, Module 7: Reports & Analytics)
const router = require('express').Router();
const reportService = require('../services/reportService');
const { protect, authorize } = require('../middleware/authMiddleware');

const STAFF = ['owner', 'admin', 'manager'];
const DASHBOARD_STAFF = [
  'owner',
  'admin',
  'manager',
  'hr',
  'inventory_manager',
  'chef',
  'cashier',
  'delivery_personnel',
  'employee',
];

router.use(protect);

/**
 * GET /api/reports/statistics
 * GET /api/reports/overview-statistics
 * Returns authoritative counts for the six Overview dashboard statistics.
 */
const handleDashboardStatistics = async (req, res, next) => {
  try {
    const branchId =
      !['owner', 'admin'].includes(req.user.role) && req.user.branch
        ? req.user.branch
        : req.query.branchId;

    const result = await reportService.getDashboardStatistics({
      user: req.user,
      branchId,
    });

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.error,
      });
    }

    return res.json({
      success: true,
      totals: result.totals,
      failed: result.failed,
      branchId: result.branchId,
    });
  } catch (err) {
    next(err);
  }
};

router.get('/statistics', authorize(...DASHBOARD_STAFF), handleDashboardStatistics);
router.get('/overview-statistics', authorize(...DASHBOARD_STAFF), handleDashboardStatistics);

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
