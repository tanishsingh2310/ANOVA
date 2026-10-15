
const express = require("express");
const { register, login } = require("../controllers/authController");
const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

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
