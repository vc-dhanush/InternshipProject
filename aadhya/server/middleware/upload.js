const fs = require("fs");
const path = require("path");
const multer = require("multer");
const env = require("../config/env");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const kind = req.uploadKind || "misc";
    const dest = path.join(env.uploadDir, String(req.user?._id || "anon"), kind);
    ensureDir(dest);
    cb(null, dest);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".bin";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

function imageFilter(_req, file, cb) {
  const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
  if (!ok) {
    cb(new Error("Please upload a PNG, JPG, WEBP, or GIF image."));
    return;
  }
  cb(null, true);
}

const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

function setUploadKind(kind) {
  return (req, _res, next) => {
    req.uploadKind = kind;
    next();
  };
}

function publicFileUrl(req, filePath) {
  if (!filePath) return "";
  const relative = path.relative(env.uploadDir, filePath).split(path.sep).join("/");
  return `/uploads/${relative}`;
}

module.exports = { uploadImage, setUploadKind, publicFileUrl, ensureDir };
