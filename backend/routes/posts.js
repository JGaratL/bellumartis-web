const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const verifyToken = require("../middleware/auth");
const pool = require("../db");

// crear post
router.post("/create", verifyToken, upload.single("image"), async (req, res) => {
  const { content } = req.body;
  const image = req.file ? req.file.filename : null;

  await pool.query(
    `INSERT INTO posts (user_id, content, image)
     VALUES (?, ?, ?)`,
    [req.user.id, content, image]
  );

  res.json({ success: true });
});

module.exports = router;