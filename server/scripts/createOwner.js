require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function createOwner() {
  const name = process.env.BOOTSTRAP_OWNER_NAME;
  const email = process.env.BOOTSTRAP_OWNER_EMAIL;
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from server/.env");
  }

  if (!name || !email || !password) {
    throw new Error("Owner setup details are missing.");
  }

  if (name.trim().length < 2 || name.trim().length > 100) {
    throw new Error("Owner name must be between 2 and 100 characters.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid owner email address.");
  }

  if (password.length < 12) {
    throw new Error("Use a password of at least 12 characters.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: "ANOVA",
    serverSelectionTimeoutMS: 10000,
  });

  if (await User.exists({ role: "owner" })) {
    throw new Error("An owner already exists. No account was created.");
  }

  if (await User.exists({ email: normalizedEmail })) {
    throw new Error("That email already belongs to an account.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const owner = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: "owner",
    branch: null,
    isActive: true,
  });

  console.log("Initial ANOVA owner created successfully.");
  console.log("Owner ID:", owner._id.toString());
  console.log("Owner email:", owner.email);
}

createOwner()
  .catch((error) => {
    console.error("Owner setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });