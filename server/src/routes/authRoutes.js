
const express = require("express");
const {
  register,
  login,
  registerCustomer,
  loginCustomer,
} = require("../controllers/authController");
const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Public customer registration and sign-in.
router.post("/customer/register", registerCustomer);
router.post("/customer/login", loginCustomer);

// Legacy registration remains customer-only for safety.
router.post("/register", register);
router.post("/login", login);

router.get("/me", protect, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      branch: req.user.branch,
    },
  });
});

router.get(
  "/admin-check",
  protect,
  authorize("owner", "admin"),
  (req, res) => {
    res.json({ message: "Admin access verified." });
  }
);

module.exports = router;
