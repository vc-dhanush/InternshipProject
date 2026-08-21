const express = require("express");
const { requireAuth } = require("../middleware/auth");
const c = require("../controllers/classController");

const router = express.Router();
router.use(requireAuth);
router.get("/", c.listClasses);
router.post("/", c.createClass);
router.get("/:id", c.getClass);
router.put("/:id", c.updateClass);
router.delete("/:id", c.deleteClass);

module.exports = router;
