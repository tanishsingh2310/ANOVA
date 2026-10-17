
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Branch = require("../models/Branch");

const EMPLOYEE_ROLES = [
  "admin",
  "manager",
  "hr",
  "inventory_manager",
  "chef",
  "cashier",
  "employee",
];

const ASSIGNABLE_ROLES = [
  "manager",
  "hr",
  "inventory_manager",
  "chef",
  "cashier",
  "employee",
];

const SAFE_FIELDS =
  "name email role branch isActive createdAt updatedAt";

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function canManageAllBranches(user) {
  return user.role === "owner" || user.role === "admin";
}

function canManageEmployees(user) {
  return ["owner", "admin", "hr"].includes(user.role);
}

function employeeScope(user) {
  const filter = {
    role: { $in: EMPLOYEE_ROLES },
  };

  if (!canManageAllBranches(user)) {
    if (!user.branch) {
      // Prevent branch-scoped users without an assignment
      // from matching employees with no branch.
      filter.branch = { $exists: false };
      filter._id = null;
      return filter;
    }

    filter.branch = user.branch;
  }

  return filter;
}

async function validateBranch(branchId, user) {
  if (!branchId || !isValidId(branchId)) {
    return { error: "A valid branch ID is required." };
  }

  const branch = await Branch.findOne({
    _id: branchId,
    isActive: true,
  });

  if (!branch) {
    return { error: "Active branch not found." };
  }

  if (!canManageAllBranches(user)) {
    if (
      !user.branch ||
      String(user.branch) !== String(branch._id)
    ) {
      return {
        error: "You cannot assign employees to another branch.",
      };
    }
  }

  return { branch };
}

exports.getEmployees = async (req, res) => {
  try {
    if (!["owner", "admin", "hr", "manager"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You cannot view the employee directory.",
      });
    }

    if (
      !canManageAllBranches(req.user) &&
      !req.user.branch
    ) {
      return res.status(403).json({
        message: "Your account is not assigned to a branch.",
      });
    }

    const filter = employeeScope(req.user);

    if (req.query.branchId) {
      if (!isValidId(req.query.branchId)) {
        return res.status(400).json({
          message: "Invalid branch ID.",
        });
      }

      if (
        !canManageAllBranches(req.user) &&
        String(req.user.branch) !== String(req.query.branchId)
      ) {
        return res.status(403).json({
          message: "You cannot view another branch's employees.",
        });
      }

      filter.branch = req.query.branchId;
    }

    if (req.query.includeInactive === "true") {
      if (!canManageEmployees(req.user)) {
        return res.status(403).json({
          message: "Only HR or administrators can view inactive employees.",
        });
      }
    } else {
      filter.isActive = true;
    }

    const employees = await User.find(filter)
      .select(SAFE_FIELDS)
      .sort({ name: 1 })
      .limit(500)
      .lean();

    return res.json({
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get employees failed:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve employees.",
    });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    if (!["owner", "admin", "hr", "manager"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You cannot view employee details.",
      });
    }

    if (
      !canManageAllBranches(req.user) &&
      !req.user.branch
    ) {
      return res.status(403).json({
        message: "Your account is not assigned to a branch.",
      });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid employee ID.",
      });
    }

    const filter = {
      _id: req.params.id,
      ...employeeScope(req.user),
    };

    if (!canManageEmployees(req.user)) {
      filter.isActive = true;
    }

    const employee = await User.findOne(filter)
      .select(SAFE_FIELDS)
      .lean();

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    return res.json({ employee });
  } catch (error) {
    console.error("Get employee failed:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve employee.",
    });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    if (!canManageEmployees(req.user)) {
      return res.status(403).json({
        message: "Only owners, admins, and HR can create employees.",
      });
    }

    const { name, email, password, role, branch } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        message: "Name must be between 2 and 100 characters.",
      });
    }

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        message: "Enter a valid email address.",
      });
    }

    if (typeof password !== "string" || password.length < 12) {
      return res.status(400).json({
        message: "Password must contain at least 12 characters.",
      });
    }

    if (!ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({
        message: "Invalid employee role.",
      });
    }

    if (req.user.role === "hr" && role !== "employee") {
      return res.status(403).json({
        message: "HR can create regular employee accounts only.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const branchResult = await validateBranch(branch, req.user);

    if (branchResult.error) {
      return res.status(400).json({
        message: branchResult.error,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const employee = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      branch: branchResult.branch._id,
      isActive: true,
    });

    const safeEmployee = await User.findById(employee._id)
      .select(SAFE_FIELDS)
      .lean();

    return res.status(201).json({
      message: "Employee created successfully.",
      employee: safeEmployee,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Create employee failed:", error.message);
    return res.status(500).json({
      message: "Failed to create employee.",
    });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    if (!canManageEmployees(req.user)) {
      return res.status(403).json({
        message: "Insufficient permissions.",
      });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid employee ID.",
      });
    }

    const employee = await User.findOne({
      _id: req.params.id,
      ...employeeScope(req.user),
    });

    if (!employee || employee.role === "owner") {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    const { name, email, role, branch } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 100
      ) {
        return res.status(400).json({
          message: "Invalid employee name.",
        });
      }

      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ) {
        return res.status(400).json({
          message: "Invalid email address.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const duplicate = await User.exists({
        email: normalizedEmail,
        _id: { $ne: employee._id },
      });

      if (duplicate) {
        return res.status(409).json({
          message: "Email already exists.",
        });
      }

      updates.email = normalizedEmail;
    }

    if (role !== undefined) {
      if (!ASSIGNABLE_ROLES.includes(role)) {
        return res.status(400).json({
          message: "Invalid employee role.",
        });
      }

      if (req.user.role === "hr" && role !== "employee") {
        return res.status(403).json({
          message: "HR can assign the employee role only.",
        });
      }

      updates.role = role;
    }

    if (branch !== undefined) {
      const branchResult = await validateBranch(branch, req.user);

      if (branchResult.error) {
        return res.status(400).json({
          message: branchResult.error,
        });
      }

      updates.branch = branchResult.branch._id;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    employee.set(updates);
    await employee.save();

    const safeEmployee = await User.findById(employee._id)
      .select(SAFE_FIELDS)
      .lean();

    return res.json({
      message: "Employee updated successfully.",
      employee: safeEmployee,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already exists.",
      });
    }

    console.error("Update employee failed:", error.message);
    return res.status(500).json({
      message: "Failed to update employee.",
    });
  }
};

exports.updateEmployeeStatus = async (req, res) => {
  try {
    if (!canManageEmployees(req.user)) {
      return res.status(403).json({
        message: "Insufficient permissions.",
      });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid employee ID.",
      });
    }

    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false.",
      });
    }

    const employee = await User.findOne({
      _id: req.params.id,
      ...employeeScope(req.user),
    });

    if (!employee || employee.role === "owner") {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    employee.isActive = req.body.isActive;
    await employee.save();

    return res.json({
      message: employee.isActive
        ? "Employee activated successfully."
        : "Employee deactivated successfully.",
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        branch: employee.branch,
        isActive: employee.isActive,
      },
    });
  } catch (error) {
    console.error("Update employee status failed:", error.message);
    return res.status(500).json({
      message: "Failed to update employee status.",
    });
  }
};
