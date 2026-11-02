const { protect: coreProtect } = require("./authMiddleware");

function protect(req, res, next) {
  return coreProtect(req, res, (error) => {
    if (error) return next(error);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const source = typeof req.user.toObject === "function"
      ? req.user.toObject()
      : { ...req.user };

    req.user = {
      ...source,
      id: String(source._id),
      branchId: source.branch
        ? String(source.branch._id || source.branch)
        : null
    };

    next();
  });
}

function authorize(...roleGroups) {
  const allowedRoles = roleGroups.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource."
      });
    }

    next();
  };
}

module.exports = { protect, authorize };
