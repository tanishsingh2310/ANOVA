const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/tokenUtil');

/**
 * Protect middleware: Verifies JWT token from Authorization header.
 * Formats req.user according to Member 1's Authenticated Request Context Contract:
 * req.user = {
 *   id: string,
 *   role: string,
 *   branchId: string | null,
 *   supplierId: string | null
 * }
 */
exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No bearer token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id || decoded._id,
      role: decoded.role || 'employee',
      branchId: decoded.branchId || decoded.branch || null,
      supplierId: decoded.supplierId || null
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
      error: err.message
    });
  }
};

/**
 * Authorize middleware: Checks whether req.user.role is granted permission.
 * Supports individual role arguments or an array of roles.
 */
exports.authorize = (...allowedRoles) => {
  const flattened = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before authorization check'
      });
    }

    if (flattened.length > 0 && !flattened.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized for this action.`
      });
    }

    next();
  };
};
