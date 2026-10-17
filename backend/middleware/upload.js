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
  const allowedMimeByExtension = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeByExtension[ext] === file.mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP"));
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
    fileSize: 5 * 1024 * 1024,
    files: 10,
  }
});

module.exports = upload;
