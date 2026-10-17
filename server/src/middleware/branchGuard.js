// ============================================================
// ANOVA BRANCH ACCESS GUARD MIDDLEWARE
// Enforces:
// 1. Owners and Admins have global multi-branch clearance.
// 2. Managers and Employees are strictly isolated to their assigned branch.
// ============================================================

module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // Global enterprise roles bypass branch restriction
  if (['owner', 'admin', 'director'].includes(req.user.role)) {
    return next();
  }

  // Determine requested branch from body, params, or query
  const targetBranch = req.body.branch || req.body.branchId || req.body.fromBranch || req.query.branch || req.params.branch;

  if (targetBranch && targetBranch !== 'all') {
    if (req.user.branchId && req.user.branchId !== targetBranch) {
      return res.status(403).json({
        success: false,
        message: `Branch access violation: User is assigned to branch '${req.user.branchId}' and cannot perform actions for branch '${targetBranch}'.`
      });
    }
  }

  next();
};
