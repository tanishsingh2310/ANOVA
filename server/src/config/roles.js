/**
 * ANOVA CANONICAL ROLES & PERMISSION SETS
 * Aligned with ANOVA Team Architecture & RBAC Contract (Section 2 & Section 7)
 */

const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  BRANCH_MANAGER: 'branch_manager',
  INVENTORY_MANAGER: 'inventory_manager',
  HR_MANAGER: 'hr_manager',
  HR_STAFF: 'hr_staff',
  CHEF: 'chef',
  KITCHEN_STAFF: 'kitchen_staff',
  CASHIER: 'cashier',
  EMPLOYEE: 'employee',
  SUPPLIER: 'supplier',
  DELIVERY: 'delivery',
  CUSTOMER: 'customer'
};

// Enterprise roles with global multi-branch clearance (Cross-branch scope)
const ENTERPRISE_ROLES = [ROLES.OWNER, ROLES.ADMIN];

// Roles authorized to view and perform inventory operations
const INVENTORY_READ_ROLES = [
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.INVENTORY_MANAGER,
  ROLES.BRANCH_MANAGER,
  ROLES.CHEF
];

// Roles authorized to manage inventory stock, adjustments, and receipts
const INVENTORY_WRITE_ROLES = [
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.INVENTORY_MANAGER,
  ROLES.BRANCH_MANAGER
];

// Roles authorized to manage suppliers and procurement
const PROCUREMENT_WRITE_ROLES = [
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.INVENTORY_MANAGER
];

// Roles strictly authorized for sensitive operations (deletion, status toggles, PO approvals)
const SENSITIVE_ADMIN_ROLES = [
  ROLES.OWNER,
  ROLES.ADMIN
];

// Roles authorized to execute recipe consumption and check real-time stock for orders
const KITCHEN_CONSUME_ROLES = [
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.INVENTORY_MANAGER,
  ROLES.BRANCH_MANAGER,
  ROLES.CHEF,
  ROLES.KITCHEN_STAFF,
  ROLES.CASHIER,
  ROLES.EMPLOYEE
];

module.exports = {
  ROLES,
  ENTERPRISE_ROLES,
  INVENTORY_READ_ROLES,
  INVENTORY_WRITE_ROLES,
  PROCUREMENT_WRITE_ROLES,
  SENSITIVE_ADMIN_ROLES,
  KITCHEN_CONSUME_ROLES
};
