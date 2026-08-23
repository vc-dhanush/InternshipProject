const express = require("express");
const { requireAuth } = require("../middleware/auth");
const s = require("../controllers/seminarController");

const router = express.Router();
router.use(requireAuth);
router.get("/", s.listSeminars);
router.post("/", s.createSeminar);
router.get("/:id", s.getSeminar);
router.put("/:id", s.updateSeminar);
router.post("/:id/records", s.saveRecords);
router.delete("/:id", s.deleteSeminar);

module.exports = router;
