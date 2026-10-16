const jwt = require('jsonwebtoken');

// Protect middleware: verifies JWT token from Authorization header
exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    // If running in development without JWT, set default enterprise user
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        id: 'usr_dev_admin',
        role: req.headers['x-user-role'] || 'admin',
        branchId: req.headers['x-user-branch'] || 'b_downtown'
      };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'anova_jwt_dev_secret_2026');
    req.user = {
      id: decoded.id,
      role: decoded.role || 'manager',
      branchId: decoded.branchId || decoded.branch || null
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', error: err.message });
  }
};

// Authorize middleware: checks user role
exports.authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Role '${req.user.role}' is not authorized for this action.`
    });
  }

  next();
};
