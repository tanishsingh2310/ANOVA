
const mongoose = require("mongoose");

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from server/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: "ANOVA",
    serverSelectionTimeoutMS: 10000,
  });

  console.log("MongoDB connected successfully");
}

module.exports = connectDB;
