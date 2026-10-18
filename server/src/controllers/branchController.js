const mongoose = require("mongoose");
const Branch = require("../models/Branch");
const { writeAuditLog } = require("../utils/auditLogger");

const STAFF_ROLES = [
  "owner",
  "admin",
  "manager",
  "hr",
  "inventory_manager",
  "chef",
  "cashier",
  "employee",
];

const ALLOWED_FIELDS = ["name", "code", "address", "phone", "email"];

function validateText(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    return field + " must be a non-empty string.";
  }

  if (value.trim().length > maxLength) {
    return field + " cannot exceed " + maxLength + " characters.";
  }

  return null;
}

function handleDatabaseError(error, res, action) {
  if (error.code === 11000) {
    return res.status(409).json({
      message: "A branch with this code already exists.",
    });
  }

  console.error(action + ":", error.message);

  return res.status(500).json({
    message: "An unexpected error occurred.",
  });
}

exports.createBranch = async (req, res) => {
  try {
    const { name, code, address, phone, email } = req.body;

    const nameError = validateText(name, "Name", 100);
    const codeError = validateText(code, "Code", 20);

    if (nameError || name.trim().length < 2) {
      return res.status(400).json({
        message: nameError || "Name must contain at least 2 characters.",
      });
    }

    if (codeError || code.trim().length < 2) {
      return res.status(400).json({
        message: codeError || "Code must contain at least 2 characters.",
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(code.trim())) {
      return res.status(400).json({
        message: "Code may contain only letters, numbers, hyphens and underscores.",
      });
    }

    if (
      address !== undefined &&
      (address === null ||
        typeof address !== "object" ||
        Array.isArray(address) ||
        Object.keys(address).some(
          (key) =>
            !["street", "city", "state", "postalCode", "country"].includes(key)
        ) ||
        Object.values(address).some((value) => typeof value !== "string"))
    ) {
      return res.status(400).json({
        message: "Address must contain only supported string fields.",
      });
    }

    if (
      phone !== undefined &&
      (typeof phone !== "string" || phone.length > 30)
    ) {
      return res.status(400).json({
        message: "Phone must be a string of at most 30 characters.",
      });
    }

    if (
      email !== undefined &&
      (typeof email !== "string" ||
        (email.trim() &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())))
    ) {
      return res.status(400).json({
        message: "Enter a valid branch email address.",
      });
    }

    const branch = await Branch.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address,
      phone: phone === undefined ? "" : phone.trim(),
      email: email === undefined ? "" : email.trim().toLowerCase(),
    });
    await writeAuditLog({
    actor: req.user,
    action: "BRANCH_CREATED",
    resource: "Branch",
    resourceId: branch._id,
    branch: branch._id,
    details: {
    branchName: branch.name,
    branchCode: branch.code,
  },
  ipAddress: req.ip,
});

    return res.status(201).json({
      message: "Branch created successfully.",
      branch,
    });
  } catch (error) {
    return handleDatabaseError(error, res, "Branch creation error");
  }
};


exports.getBranches = async (req, res) => {
  try {
    const isEnterpriseAdmin = ["owner", "admin"].includes(
      req.user.role
    );

    const filter = {};

    if (!isEnterpriseAdmin) {
      if (!req.user.branch) {
        return res.status(403).json({
          message: "Your account is not assigned to a branch.",
        });
      }

      filter._id = req.user.branch;
      filter.isActive = true;
    } else if (req.query.includeInactive !== "true") {
      filter.isActive = true;
    }

    const branches = await Branch.find(filter).sort({ name: 1 });

    return res.status(200).json({
      count: branches.length,
      branches,
    });
  } catch (error) {
    return handleDatabaseError(error, res, "Branch listing error");
  }
};




exports.getBranchById = async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid branch ID.",
      });
    }

    const isEnterpriseAdmin = ["owner", "admin"].includes(
      req.user.role
    );

    const filter = { _id: id };

    if (!isEnterpriseAdmin) {
      if (!req.user.branch) {
        return res.status(403).json({
          message: "Your account is not assigned to a branch.",
        });
      }

      if (String(req.user.branch) !== String(id)) {
        return res.status(404).json({
          message: "Branch not found.",
        });
      }

      filter.isActive = true;
    } else if (req.query.includeInactive !== "true") {
      filter.isActive = true;
    }

    const branch = await Branch.findOne(filter);

    if (!branch) {
      return res.status(404).json({
        message: "Branch not found.",
      });
    }

    return res.status(200).json({ branch });
  } catch (error) {
    return handleDatabaseError(
      error,
      res,
      "Branch retrieval error"
    );
  }
};



exports.updateBranch = async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid branch ID.",
      });
    }

    const updates = {};

    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one supported field to update.",
      });
    }

    if (updates.name !== undefined) {
      if (
        typeof updates.name !== "string" ||
        updates.name.trim().length < 2 ||
        updates.name.trim().length > 100
      ) {
        return res.status(400).json({
          message: "Name must be between 2 and 100 characters.",
        });
      }

      updates.name = updates.name.trim();
    }

    if (updates.code !== undefined) {
      if (
        typeof updates.code !== "string" ||
        updates.code.trim().length < 2 ||
        updates.code.trim().length > 20 ||
        !/^[a-zA-Z0-9_-]+$/.test(updates.code.trim())
      ) {
        return res.status(400).json({
          message: "Code must be 2-20 characters and use only letters, numbers, hyphens or underscores.",
        });
      }

      updates.code = updates.code.trim().toUpperCase();
    }

    if (updates.address !== undefined) {
      const address = updates.address;
      const addressFields = [
        "street",
        "city",
        "state",
        "postalCode",
        "country",
      ];

      if (
        address === null ||
        typeof address !== "object" ||
        Array.isArray(address) ||
        Object.keys(address).some((key) => !addressFields.includes(key)) ||
        Object.values(address).some((value) => typeof value !== "string")
      ) {
        return res.status(400).json({
          message: "Address must contain only supported string fields.",
        });
      }

      updates.address = address;
    }

    if (updates.phone !== undefined) {
      if (typeof updates.phone !== "string" || updates.phone.length > 30) {
        return res.status(400).json({
          message: "Phone must be a string of at most 30 characters.",
        });
      }

      updates.phone = updates.phone.trim();
    }

    if (updates.email !== undefined) {
      if (
        typeof updates.email !== "string" ||
        (updates.email.trim() &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email.trim()))
      ) {
        return res.status(400).json({
          message: "Enter a valid branch email address.",
        });
      }

      updates.email = updates.email.trim().toLowerCase();
    }

    const branch = await Branch.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!branch) {
      return res.status(404).json({
        message: "Branch not found.",
      });
    }
    await writeAuditLog({
  actor: req.user,
  action: "BRANCH_UPDATED",
  resource: "Branch",
  resourceId: branch._id,
  branch: branch._id,
  details: {
    updatedFields: Object.keys(updates),
    branchName: branch.name,
    branchCode: branch.code,
  },
  ipAddress: req.ip,
});
    return res.status(200).json({
      message: "Branch updated successfully.",
      branch,
    });
  } catch (error) {
    return handleDatabaseError(error, res, "Branch update error");
  }
};

exports.updateBranchStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const isActive = req.body.isActive;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid branch ID.",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false.",
      });
    }

    const branch = await Branch.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({
        message: "Branch not found.",
      });
    }
    await writeAuditLog({
  actor: req.user,
  action: isActive ? "BRANCH_ACTIVATED" : "BRANCH_DEACTIVATED",
  resource: "Branch",
  resourceId: branch._id,
  branch: branch._id,
  details: {
    branchName: branch.name,
    branchCode: branch.code,
    isActive,
  },
  ipAddress: req.ip,
});

    return res.status(200).json({
      message: isActive
        ? "Branch activated successfully."
        : "Branch deactivated successfully.",
      branch,
    });
  } catch (error) {
    return handleDatabaseError(error, res, "Branch status update error");
  }
};
