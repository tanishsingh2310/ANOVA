const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    // Primary branch retained for backward compatibility.
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    // All branches where this menu item is available.
    branchIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Branch",
        },
      ],
      default: [],
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Starters",
        "Main Course",
        "Pizza",
        "Desserts",
        "Beverages",
      ],
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    image: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    price: {
      type: Number,
      required: true,
      min: 0.01,
    },

    available: {
      type: Boolean,
      default: true,
    },

    dietary: {
      type: String,
      enum: ["Vegetarian", "Vegan", "Non-Vegetarian"],
      default: null,
    },

    spice: {
      type: String,
      enum: ["Mild", "Medium", "Hot"],
      default: null,
    },

    ingredients: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 100,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "menu_items",
  }
);

module.exports = mongoose.model("MenuItem", menuItemSchema);