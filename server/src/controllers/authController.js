
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from server/.env");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function validateRegistration(name, email, password) {
  return (
    typeof name === "string" &&
    typeof email === "string" &&
    typeof password === "string" &&
    name.trim().length >= 2 &&
    name.trim().length <= 100 &&
    email.trim().length > 0 &&
    email.trim().length <= 254 &&
    password.length >= 8 &&
    password.length <= 128
  );
}

async function registerCustomer(req, res) {
  try {
    const { name, email, password } = req.body || {};

    if (!validateRegistration(name, email, password)) {
      return res.status(400).json({
        message:
          "Enter a valid name and email. Password must be 8 to 128 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Never accept a role supplied by a public registration request.
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "customer",
    });

    const token = createToken(user);

    return res.status(201).json({
      message: "Customer account created successfully.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Customer registration error:", error.message);

    return res.status(500).json({
      message: "Unable to create customer account.",
    });
  }
}

async function loginCustomer(req, res) {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !user.isActive || user.role !== "customer") {
      return res.status(401).json({
        message: "Invalid customer email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid customer email or password.",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Customer sign-in successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Customer login error:", error.message);

    return res.status(500).json({
      message: "Unable to sign in as customer.",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    // Customer accounts must use the customer sign-in endpoint.
    if (!user || !user.isActive || user.role === "customer") {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Unable to log in.",
    });
  }
}

exports.registerCustomer = registerCustomer;
exports.loginCustomer = loginCustomer;
exports.login = login;

// Keep the legacy public registration route safe: it creates customers,
// never employee or administrative accounts.
exports.register = registerCustomer;
