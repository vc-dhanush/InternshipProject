const express = require("express");
const { requireAuth } = require("../middleware/auth");
const auth = require("../controllers/authController");

const router = express.Router();

router.post("/signup", auth.signup);
router.post("/login", auth.login);
router.post("/logout", auth.logout);
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password", auth.resetPassword);
router.get("/me", requireAuth, auth.me);
router.post("/change-password", requireAuth, auth.changePassword);

module.exports = router;
