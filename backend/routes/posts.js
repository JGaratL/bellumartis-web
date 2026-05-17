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

// obtener posts
router.get("/", async (req, res) => {
    const [rows] = await pool.query(`
    SELECT 
      p.id,
      p.content,
      p.image,
      p.created_at,
      u.nickname
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.id DESC
  `);

    res.json(rows);
});

module.exports = router;