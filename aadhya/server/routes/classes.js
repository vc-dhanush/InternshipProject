const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { setUploadKind, uploadImage } = require("../middleware/upload");
const c = require("../controllers/classController");
const s = require("../controllers/studentController");

const router = express.Router();
router.use(requireAuth);
router.get("/", c.listClasses);
router.post("/", c.createClass);
router.get("/:id/students", s.listStudents);
router.post("/:id/students", setUploadKind("students"), uploadImage.single("photo"), s.createStudent);
router.get("/:id", c.getClass);
router.put("/:id", c.updateClass);
router.delete("/:id", c.deleteClass);

module.exports = router;
