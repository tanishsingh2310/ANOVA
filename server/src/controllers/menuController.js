const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");

// GET: Retrieve menu items for a branch.
const getMenuItems = async (req, res, next) => {
  try {
    const menuItems = await MenuItem.find({
      branchId: req.branchId,
    }).sort({ createdAt: -1 });

    res.json(menuItems);
  } catch (error) {
    next(error);
  }
};

// POST: Add a menu item to a branch.
const createMenuItem = async (req, res, next) => {
  try {
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
      branchId: req.branchId,
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

// PUT: Update a menu item belonging to the specified branch.
const updateMenuItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({
        message: "Invalid menu item ID.",
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

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update.",
      });
    }

    const menuItem = await MenuItem.findOneAndUpdate(
      {
        _id: itemId,
        branchId: req.branchId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found for this branch.",
      });
    }

    res.json(menuItem);
  } catch (error) {
    next(error);
  }
};

// DELETE: Remove a menu item belonging to the specified branch.
const deleteMenuItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({
        message: "Invalid menu item ID.",
      });
    }

    const menuItem = await MenuItem.findOneAndDelete({
      _id: itemId,
      branchId: req.branchId,
    });

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found for this branch.",
      });
    }

    res.json({
      message: "Menu item deleted successfully.",
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