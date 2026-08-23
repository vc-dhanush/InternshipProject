const express = require("express");
const { requireAuth } = require("../middleware/auth");
const a = require("../controllers/attendanceController");

const router = express.Router();
router.use(requireAuth);
router.get("/sheet", a.takeSheet);
router.get("/analytics", a.analytics);
router.get("/sessions", a.listSessions);
router.post("/sessions", a.saveSession);
router.get("/sessions/:id", a.getSession);
router.put("/sessions/:id", a.updateSession);
router.delete("/sessions/:id", a.deleteSession);

module.exports = router;
