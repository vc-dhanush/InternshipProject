const express = require("express");
const { requireAuth } = require("../middleware/auth");
const t = require("../controllers/testController");

const router = express.Router();
router.use(requireAuth);
router.get("/", t.listTests);
router.post("/", t.createTest);
router.get("/:id", t.getTest);
router.put("/:id", t.updateTest);
router.post("/:id/marks", t.saveMarks);
router.delete("/:id", t.deleteTest);

module.exports = router;
