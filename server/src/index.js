const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ANOVA MBREMS API is running",
    service: "Inventory & Supply Chain Core"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ANOVA MBREMS API is operational",
    database: mongoose.connection.readyState === 1 ? "CONNECTED" : "OFFLINE_FALLBACK"
  });
});

// Mount Inventory & Supply Chain Routes
const inventoryRoutes = require("./routes/inventoryRoutes");
app.use("/api/inventory", inventoryRoutes);

// Central error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

const PORT = process.env.PORT || 5000;
const connectDB = require("./config/db");

// Initialize MongoDB connection
connectDB();

app.listen(PORT, () => {
  console.log(`ANOVA MBREMS server running on port ${PORT}`);
});

module.exports = app;