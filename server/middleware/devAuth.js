// server/middleware/devAuth.js
// TEMPORARY, DEV ONLY. Stands in for Member 1's real auth middleware.
// Contract rule: no duplicate JWT middleware may ship. Before merging into main,
// change the require() in every Member 4 route file to Member 1's middleware
// and DELETE this file. Export names (protect, authorize) match the contract.
const jwt = require('jsonwebtoken');

if (process.env.NODE_ENV === 'production') {
  throw new Error('devAuth.js is a dev-only stand-in and must not run in production');
}

exports.protect = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};
