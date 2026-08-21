const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getDashboard } = require("../controllers/dashboardController");
const settings = require("../controllers/settingsController");
const profile = require("../controllers/profileController");
const { importFromImage } = require("../controllers/ocrController");
const { setUploadKind, uploadImage } = require("../middleware/upload");

const router = express.Router();
router.use(requireAuth);
router.get("/dashboard", getDashboard);
router.get("/settings", settings.getSettings);
router.put("/settings", setUploadKind("college"), uploadImage.single("logo"), settings.updateSettings);
router.post("/onboarding", setUploadKind("college"), uploadImage.single("logo"), settings.completeOnboarding);
router.get("/staff", profile.getStaff);
router.put("/staff", setUploadKind("staff"), uploadImage.single("photo"), profile.updateStaff);
router.post("/ocr/attendance", setUploadKind("ocr"), uploadImage.single("image"), importFromImage);

module.exports = router;
