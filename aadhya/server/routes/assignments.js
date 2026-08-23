const express = require("express");
const { requireAuth } = require("../middleware/auth");
const a = require("../controllers/assignmentController");

const router = express.Router();
router.use(requireAuth);
router.get("/", a.listAssignments);
router.post("/", a.createAssignment);
router.get("/:id", a.getAssignment);
router.put("/:id", a.updateAssignment);
router.post("/:id/marks", a.saveMarks);
router.delete("/:id", a.deleteAssignment);

module.exports = router;
