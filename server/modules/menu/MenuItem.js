const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
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

    price: {
      type: Number,
      required: true,
      min: 0.01,
    },

    available: {
      type: Boolean,
      default: true,
    },

    // Food Recommendations: Dietary classification
    dietary: {
      type: String,
      enum: ["Vegetarian", "Vegan", "Non-Vegetarian"],
      default: null,
    },

    // Food Recommendations: Spice preference
    spice: {
      type: String,
      enum: ["Mild", "Medium", "Hot"],
      default: null,
    },

    // Food Recommendations: Dish ingredients
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