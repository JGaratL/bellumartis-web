const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const verifyToken = require("../middleware/auth");
const pool = require("../db");

/*
====================================
CREATE POST (MULTIPLE IMAGES)
====================================
*/
router.post(
    "/create",
    verifyToken,
    upload.array("images", 10),
    async (req, res) => {
        try {
            const { content } = req.body;

            // SIEMPRE array seguro
            const files = req.files || [];

            const images = files.map((file) => file.filename);

            await pool.query(
                `
                INSERT INTO posts (user_id, content, images)
                VALUES (?, ?, ?)
                `,
                [
                    req.user.id,
                    content || "",
                    images.length > 0 ? JSON.stringify(images) : null
                ]
            );

            return res.json({ success: true });

        } catch (err) {
            console.error("CREATE POST ERROR:", err);
            return res.status(500).json({ error: "Error creando post" });
        }
    }
);

/*
====================================
GET POSTS (likes + avatar + images)
====================================
*/
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                p.id,
                p.content,
                p.images,
                p.created_at,
                p.likes_count,
                u.nickname,
                u.profile_image AS avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.id DESC
        `);

        const formatted = rows.map((post) => {
            let parsedImages = [];

            try {
                if (!post.images) {
                    parsedImages = [];
                } else if (Array.isArray(post.images)) {
                    parsedImages = post.images;
                } else if (typeof post.images === "string") {
                    parsedImages = JSON.parse(post.images);
                } else {
                    // MySQL JSON puede venir ya deserializado como objeto/valor JS
                    parsedImages = post.images;
                }
            } catch (e) {
                parsedImages = [];
            }

            return {
                id: post.id,
                content: post.content,
                created_at: post.created_at,
                likes_count: post.likes_count,
                nickname: post.nickname,
                avatar: post.avatar,
                images: parsedImages
            };
        });

        return res.json(formatted);

    } catch (err) {
        console.error("GET POSTS ERROR:", err);
        return res.status(500).json({ error: "Error obteniendo posts" });
    }
});

/*
====================================
TOGGLE LIKE
====================================
*/
router.post("/:id/like", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const postId = req.params.id;

        const [existing] = await pool.query(
            "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
            [postId, userId]
        );

        if (existing.length > 0) {
            await pool.query(
                "DELETE FROM post_likes WHERE post_id = ? AND user_id = ?",
                [postId, userId]
            );

            await pool.query(
                "UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?",
                [postId]
            );

            return res.json({ liked: false });
        }

        await pool.query(
            "INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)",
            [postId, userId]
        );

        await pool.query(
            "UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?",
            [postId]
        );

        return res.json({ liked: true });

    } catch (err) {
        console.error("LIKE ERROR:", err);
        return res.status(500).json({ error: "Error al dar like" });
    }
});

/*
====================================
LIKE STATUS
====================================
*/
router.get("/:id/like-status", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const postId = req.params.id;

        const [rows] = await pool.query(
            "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
            [postId, userId]
        );

        return res.json({ liked: rows.length > 0 });

    } catch (err) {
        console.error("LIKE STATUS ERROR:", err);
        return res.status(500).json({ error: "Error obteniendo estado like" });
    }
});

module.exports = router;
