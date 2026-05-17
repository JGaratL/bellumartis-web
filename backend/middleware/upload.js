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
STORAGE
====================================
*/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      unique + path.extname(file.originalname).toLowerCase()
    );
  }
});

/*
====================================
FILE FILTER
====================================
*/
const fileFilter = (req, file, cb) => {
  const allowed = /jpg|jpeg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Solo imágenes permitidas"));
  }
};

/*
====================================
MULTER CONFIG
====================================
*/
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports = upload;