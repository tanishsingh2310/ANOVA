const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
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
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("MongoDB connected successfully to ANOVA Atlas cluster"))
    .catch((err) => console.warn("MongoDB connection deferred (offline mode active):", err.message));
} else {
  console.log("MongoDB URI not provided. Running with memory/fallback service mode.");
}

app.listen(PORT, () => {
  console.log(`ANOVA MBREMS server running on port ${PORT}`);
});

module.exports = app;