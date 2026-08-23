const express = require("express");
const { requireAuth } = require("../middleware/auth");
const r = require("../controllers/reportController");

const router = express.Router();
router.use(requireAuth);
router.get("/class", r.classReport);
router.get("/student/:studentId", r.studentReport);
router.get("/low-attendance", r.lowAttendance);
router.get("/tests", r.testReport);
router.get("/overview", r.overview);
router.get("/export/attendance.csv", r.exportAttendanceCsv);
router.get("/export/marks.csv", r.exportMarksCsv);
router.get("/export/attendance.pdf", r.exportAttendancePdf);

module.exports = router;
