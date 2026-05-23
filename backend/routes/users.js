const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyToken = require("../middleware/auth");

/*
====================================
GET USER BY ID (PUBLIC PROFILE VIEW)
====================================
*/
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;

    const [rows] = await pool.query(
      `
      SELECT 
        id,
        nickname,
        email,
        province,
        country,
        created_at,
        profile_image,
        x_url,
        facebook_url,
        instagram_url,
        youtube_url
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.json(rows[0]);

  } catch (err) {
    console.error("GET USER BY ID ERROR:", err);
    return res.status(500).json({ error: "Error obteniendo usuario" });
  }
});

module.exports = router;