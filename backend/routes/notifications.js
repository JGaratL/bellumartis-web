const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth");
const pool = require("../db");

/*
====================================
GET NOTIFICATIONS (LIST)
====================================
*/
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      50
    );

    await pool.query(
      `
      DELETE FROM notifications
      WHERE user_id = ?
      AND id NOT IN (
        SELECT id
        FROM (
          SELECT id
          FROM notifications
          WHERE user_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT 200
        ) keep_ids
      )
      `,
      [userId, userId]
    );

    const [rows] = await pool.query(
      `
      SELECT 
        n.id,
        n.from_user_id,
        n.type,
        n.reference_id,
        n.is_read,
        n.created_at,
        COALESCE(u.nickname, '') AS from_nickname,
        u.profile_image AS from_avatar,
        CASE
          WHEN n.type = 'like_post' THEN p.id
          WHEN n.type IN ('reply_post', 'like_reply') THEN pr.post_id
          ELSE NULL
        END AS post_id,
        CASE
          WHEN n.type IN ('reply_post', 'like_reply') THEN pr.id
          ELSE NULL
        END AS reply_id,
        CASE
          WHEN n.type = 'reply_post' THEN pr.content
          ELSE NULL
        END AS reply_content
      FROM notifications n
      JOIN users u ON u.id = n.from_user_id
      LEFT JOIN posts p
        ON n.type = 'like_post'
        AND p.id = n.reference_id
      LEFT JOIN post_replies pr
        ON n.type IN ('reply_post', 'like_reply')
        AND pr.id = n.reference_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT ?
      `,
      [userId, limit]
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);
    return res.status(500).json({
      error: "Error obteniendo notificaciones",
    });
  }
});

/*
====================================
GET UNREAD COUNT (NAVBAR BADGE)
====================================
*/
router.get("/count", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE user_id = ? AND is_read = 0
      `,
      [userId]
    );

    return res.json({
      count: rows[0].count,
    });
  } catch (err) {
    console.error("NOTIFICATIONS COUNT ERROR:", err);
    return res.status(500).json({
      error: "Error obteniendo contador",
    });
  }
});

/*
====================================
MARK ALL AS READ
====================================
*/
router.put("/read-all", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ?
      `,
      [userId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("MARK READ ERROR:", err);
    return res.status(500).json({
      error: "Error marcando notificaciones",
    });
  }
});

/*
====================================
MARK SINGLE AS READ
====================================
*/
router.put("/:id/read", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notifId = Number(req.params.id);

    if (isNaN(notifId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    await pool.query(
      `
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
      `,
      [notifId, userId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("MARK SINGLE READ ERROR:", err);
    return res.status(500).json({
      error: "Error actualizando notificación",
    });
  }
});

/*
====================================
DELETE NOTIFICATION
====================================
*/
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notifId = Number(req.params.id);

    if (isNaN(notifId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    await pool.query(
      `
      DELETE FROM notifications
      WHERE id = ? AND user_id = ?
      `,
      [notifId, userId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE NOTIFICATION ERROR:", err);
    return res.status(500).json({
      error: "Error eliminando notificación",
    });
  }
});

module.exports = router;
