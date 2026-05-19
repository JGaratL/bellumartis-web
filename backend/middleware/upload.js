const multer = require("multer");
const path = require("path");
const fs = require("fs");

/*
====================================
CREATE UPLOAD FOLDER IF NOT EXISTS
====================================
*/
const uploadPath = path.join(__dirname, "../uploads/posts");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

/*
====================================
FILE FILTER
====================================
*/
const fileFilter = (req, file, cb) => {
  const allowed = /jpg|jpeg|png|webp/;

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.startsWith("image/");

  if (allowed.test(ext) && mime) {
    cb(null, true);
  } else {
    cb(new Error("Solo imágenes permitidas"));
  }
};

/*
====================================
MULTER MEMORY (IMPORTANTE)
====================================
*/
const upload = multer({
  storage: multer.memoryStorage(), // 🔥 CLAVE
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // límite de subida (no disco)
    files: 10
  }
});

module.exports = upload;