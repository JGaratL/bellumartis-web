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
    (req, res, next) => {
        upload.array("images", 10)(req, res, (err) => {
            if (err) {
                console.error("MULTER CREATE POST ERROR:", err);
                return res.status(400).json({
                    error: err.message || "Error subiendo imagenes"
                });
            }
            return next();
        });
    },
    async (req, res) => {
        try {
            const { content } = req.body;

            // SIEMPRE array seguro
            const files = Array.isArray(req.files)
                ? req.files
                : [];

            const images = files.map((file) => file.filename);

            const cleanContent = content?.trim() || "";

            await pool.query(
                `
                INSERT INTO posts (user_id, content, images)
                VALUES (?, ?, ?)
                `,
                [
                    req.user.id,
                    cleanContent,
                    images.length > 0
                        ? JSON.stringify(images)
                        : null
                ]
            );

            return res.json({
                success: true
            });

        } catch (err) {
            console.error("CREATE POST ERROR:", err);

            return res.status(500).json({
                error: "Error creando post"
            });
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
                u.profile_image AS avatar,
                COUNT(r.id) AS replies_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN post_replies r ON r.post_id = p.id
            GROUP BY 
                p.id,
                p.content,
                p.images,
                p.created_at,
                p.likes_count,
                u.nickname,
                u.profile_image
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

                    parsedImages = post.images;
                }

            } catch (e) {

                console.error("JSON PARSE ERROR:", e);

                parsedImages = [];
            }

            return {
                id: post.id,
                content: post.content,
                created_at: post.created_at,
                likes_count: post.likes_count,
                nickname: post.nickname,
                avatar: post.avatar,
                replies_count: post.replies_count || 0,
                images: parsedImages
            };
        });

        return res.json(formatted);

    } catch (err) {

        console.error("GET POSTS ERROR:", err);

        return res.status(500).json({
            error: "Error obteniendo posts"
        });
    }
});

/*
====================================
REMOVE POST
====================================
*/

router.delete("/:id", verifyToken, async (req, res) => {

  try {

    const postId = req.params.id;
    const userId = req.user.id;

    const [rows] = await pool.query(
      "SELECT * FROM posts WHERE id = ?",
      [postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Post no encontrado"
      });
    }

    const post = rows[0];

    if (post.user_id !== userId) {
      return res.status(403).json({
        error: "No autorizado"
      });
    }

    await pool.query(
      "DELETE FROM posts WHERE id = ?",
      [postId]
    );

    res.json({
      message: "Post eliminado"
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Error eliminando post"
    });
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
        const postId = Number(req.params.id);

        /*
        ============================
        VALIDATE ID
        ============================
        */
        if (isNaN(postId)) {
            return res.status(400).json({
                error: "ID inválido"
            });
        }

        /*
        ============================
        CHECK EXISTING LIKE
        ============================
        */
        const [existing] = await pool.query(
            `
            SELECT id
            FROM post_likes
            WHERE post_id = ?
            AND user_id = ?
            `,
            [postId, userId]
        );

        /*
        ============================
        REMOVE LIKE
        ============================
        */
        if (existing.length > 0) {

            await pool.query(
                `
                DELETE FROM post_likes
                WHERE post_id = ?
                AND user_id = ?
                `,
                [postId, userId]
            );

            await pool.query(
                `
                UPDATE posts
                SET likes_count = GREATEST(likes_count - 1, 0)
                WHERE id = ?
                `,
                [postId]
            );

            return res.json({
                liked: false
            });
        }

        /*
        ============================
        ADD LIKE
        ============================
        */
        await pool.query(
            `
            INSERT INTO post_likes (post_id, user_id)
            VALUES (?, ?)
            `,
            [postId, userId]
        );

        await pool.query(
            `
            UPDATE posts
            SET likes_count = likes_count + 1
            WHERE id = ?
            `,
            [postId]
        );

        return res.json({
            liked: true
        });

    } catch (err) {

        console.error("LIKE ERROR:", err);

        return res.status(500).json({
            error: "Error al dar like"
        });
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
        const postId = Number(req.params.id);

        /*
        ============================
        VALIDATE ID
        ============================
        */
        if (isNaN(postId)) {
            return res.status(400).json({
                error: "ID inválido"
            });
        }

        const [rows] = await pool.query(
            `
            SELECT id
            FROM post_likes
            WHERE post_id = ?
            AND user_id = ?
            `,
            [postId, userId]
        );

        return res.json({
            liked: rows.length > 0
        });

    } catch (err) {

        console.error("LIKE STATUS ERROR:", err);

        return res.status(500).json({
            error: "Error obteniendo estado like"
        });
    }
});

/*
====================================
CREATE REPLY
====================================
*/
router.post("/:id/reply", verifyToken, async (req, res) => {

    try {

        const postId = Number(req.params.id);
        const userId = req.user.id;

        /*
        ============================
        VALIDATE ID
        ============================
        */
        if (isNaN(postId)) {
            return res.status(400).json({
                error: "ID inválido"
            });
        }

        /*
        ============================
        CLEAN CONTENT
        ============================
        */
        const cleanContent = req.body.content?.trim();

        if (!cleanContent) {
            return res.status(400).json({
                error: "Respuesta vacía"
            });
        }

        /*
        ============================
        INSERT REPLY
        ============================
        */
        await pool.query(
            `
            INSERT INTO post_replies
            (post_id, user_id, content)
            VALUES (?, ?, ?)
            `,
            [
                postId,
                userId,
                cleanContent
            ]
        );

        return res.json({
            success: true
        });

    } catch (err) {

        console.error("REPLY ERROR:", err);

        return res.status(500).json({
            error: "Error creando respuesta"
        });
    }
});

/*
====================================
GET REPLIES
====================================
*/
router.get("/:id/replies", async (req, res) => {

    try {

        const postId = Number(req.params.id);

        /*
        ============================
        VALIDATE ID
        ============================
        */
        if (isNaN(postId)) {
            return res.status(400).json({
                error: "ID inválido"
            });
        }

        const [rows] = await pool.query(
            `
            SELECT 
                r.id,
                r.content,
                r.created_at,
                r.likes_count,

                u.nickname,
                u.profile_image AS avatar

            FROM post_replies r

            JOIN users u
                ON r.user_id = u.id

            WHERE r.post_id = ?

            ORDER BY r.id ASC
            `,
            [postId]
        );

        return res.json(rows);

    } catch (err) {

        console.error("GET REPLIES ERROR:", err);

        return res.status(500).json({
            error: "Error obteniendo respuestas"
        });
    }
});

module.exports = router;
