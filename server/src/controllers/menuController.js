const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");

const getAssignedBranchIds = (item) => {
  const ids = (item.branchIds || []).map((id) => String(id));

  // Include the legacy primary branch if it is not already in branchIds.
  if (item.branchId && !ids.includes(String(item.branchId))) {
    ids.push(String(item.branchId));
  }

  return [...new Set(ids)];
};

const getRequestedBranchIds = (body) => {
  const input = Array.isArray(body.branchIds)
    ? body.branchIds
    : body.branchId || body.branch
      ? [body.branchId || body.branch]
      : [];

  return [...new Set(input.map((id) => String(id)).filter(Boolean))];
};

// GET: Retrieve items assigned to a branch.
const getMenuItems = async (req, res, next) => {
  try {
    const menuItems = await MenuItem.find({
      $or: [
        { branchId: req.branchId },
        { branchIds: req.branchId },
      ],
    }).sort({ createdAt: -1 });

    res.json(
      menuItems.map((item) => {
        const data = item.toObject();
        data.branchIds = getAssignedBranchIds(data);
        return data;
      })
    );
  } catch (error) {
    next(error);
  }
};

// POST: Create an item assigned to one or multiple branches.
const createMenuItem = async (req, res, next) => {
  try {
    const branchIds = getRequestedBranchIds(req.body);

    // verifyBranch has already checked the primary branch.
    if (!branchIds.length) {
      return res.status(400).json({
        message: "At least one branch must be selected.",
      });
    }

    const invalidIds = branchIds.filter(
      (id) => !mongoose.isValidObjectId(id)
    );

    if (invalidIds.length) {
      return res.status(400).json({
        message: "One or more branch IDs are invalid.",
      });
    }

    const branches = await mongoose.connection
      .collection("branches")
      .find({
        _id: {
          $in: branchIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
        isActive: true,
      })
      .toArray();

    if (branches.length !== branchIds.length) {
      return res.status(400).json({
        message: "One or more selected branches do not exist or are inactive.",
      });
    }

    const {
      name,
      category,
      description,
      image,
      price,
      available,
      dietary,
      spice,
      ingredients,
    } = req.body;

    const menuItem = await MenuItem.create({
      branchId: branchIds[0],
      branchIds,
      name,
      category,
      description,
      image,
      price,
      available,
      dietary,
      spice,
      ingredients,
    });

    res.status(201).json(menuItem);
  } catch (error) {
    next(error);
  }
};

// PUT: Update item details and optionally its branch assignments.
const updateMenuItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({
        message: "Invalid menu item ID.",
      });
    }

    const currentItem = await MenuItem.findOne({
      _id: itemId,
      $or: [
        { branchId: req.branchId },
        { branchIds: req.branchId },
      ],
    });

    if (!currentItem) {
      return res.status(404).json({
        message: "Menu item not found for this branch.",
      });
    }

    const allowedFields = [
      "name",
      "category",
      "description",
      "image",
      "price",
      "available",
      "dietary",
      "spice",
      "ingredients",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, "branchIds") ||
      Object.prototype.hasOwnProperty.call(req.body, "branchId") ||
      Object.prototype.hasOwnProperty.call(req.body, "branch")
    ) {
      const branchIds = getRequestedBranchIds(req.body);

      if (!branchIds.length) {
        return res.status(400).json({
          message: "At least one branch must be selected.",
        });
      }

      if (branchIds.some((id) => !mongoose.isValidObjectId(id))) {
        return res.status(400).json({
          message: "One or more branch IDs are invalid.",
        });
      }

      const branches = await mongoose.connection
        .collection("branches")
        .find({
          _id: {
            $in: branchIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          isActive: true,
        })
        .toArray();

      if (branches.length !== branchIds.length) {
        return res.status(400).json({
          message: "One or more selected branches do not exist or are inactive.",
        });
      }

      updates.branchIds = branchIds;
      updates.branchId = branchIds[0];
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        message: "No valid fields provided for update.",
      });
    }

    Object.assign(currentItem, updates);
    await currentItem.save();

    const result = currentItem.toObject();
    result.branchIds = getAssignedBranchIds(result);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// DELETE: Remove this item from the specified branch only.
// If it has no remaining branches, delete the document.
const deleteMenuItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({
        message: "Invalid menu item ID.",
      });
    }

    const menuItem = await MenuItem.findOne({
      _id: itemId,
      $or: [
        { branchId: req.branchId },
        { branchIds: req.branchId },
      ],
    });

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found for this branch.",
      });
    }

    const remainingBranchIds = getAssignedBranchIds(menuItem).filter(
      (id) => id !== String(req.branchId)
    );

    if (!remainingBranchIds.length) {
      await MenuItem.deleteOne({ _id: menuItem._id });

      return res.json({
        message: "Menu item deleted successfully.",
        item: menuItem,
      });
    }

    menuItem.branchIds = remainingBranchIds;
    menuItem.branchId = remainingBranchIds[0];
    await menuItem.save();

    res.json({
      message: "Menu item removed from this branch successfully.",
      item: menuItem,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};