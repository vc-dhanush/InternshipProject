const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { setUploadKind, uploadImage } = require("../middleware/upload");
const s = require("../controllers/studentController");

const router = express.Router();
router.use(requireAuth);
router.get("/", s.listStudents);
router.post("/", setUploadKind("students"), uploadImage.single("photo"), s.createStudent);
router.get("/:id", s.getStudent);
router.put("/:id", setUploadKind("students"), uploadImage.single("photo"), s.updateStudent);
router.delete("/:id", s.deleteStudent);

module.exports = router;
