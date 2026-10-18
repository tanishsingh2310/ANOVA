const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'anova_jwt_dev_secret_2026';

/**
 * Generate a cryptographically signed JWT token adhering to Member 1's request-context contract
 */
function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Helper to generate pre-configured role tokens for testing and dev integration
 */
function createDevToken(role, branchId = 'b_downtown', extra = {}) {
  const payload = {
    id: extra.id || `usr_dev_${role}`,
    role,
    branchId: ['owner', 'admin'].includes(role) ? 'all' : branchId,
    supplierId: extra.supplierId || (role === 'supplier' ? 'sup_01' : undefined),
    ...extra
  };
  return generateToken(payload);
}

module.exports = {
  JWT_SECRET,
  generateToken,
  createDevToken
};
