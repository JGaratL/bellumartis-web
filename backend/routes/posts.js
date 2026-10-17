const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const verifyToken = require("../middleware/auth");
const checkRole = require("../middleware/role");
const pool = require("../db");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const POSTS_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "posts");
const MAX_IMAGE_PIXELS = 25_000_000;

const validatePostImage = async (file) => {
    const metadata = await sharp(file.buffer, {
        limitInputPixels: MAX_IMAGE_PIXELS,
        failOn: "error",
    }).metadata();
    const expectedFormatByMime = {
        "image/jpeg": "jpeg",
        "image/png": "png",
        "image/webp": "webp",
    };

    if (!metadata.format || expectedFormatByMime[file.mimetype] !== metadata.format) {
        throw new Error("El contenido no coincide con una imagen JPG, PNG o WEBP válida");
    }
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
        throw new Error("La imagen supera las dimensiones permitidas");
    }
};

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
        const createdImagePaths = [];
        try {
            const { content } = req.body;

            // SIEMPRE array seguro
            const files = Array.isArray(req.files)
                ? req.files
                : [];

            const images = [];
            await fs.promises.mkdir(POSTS_UPLOAD_DIR, { recursive: true });
            for (const file of files) {
                await validatePostImage(file);
                const filename = `post-${crypto.randomUUID()}.webp`;
                const outputPath = path.join(POSTS_UPLOAD_DIR, filename);
                createdImagePaths.push(outputPath);
                await sharp(file.buffer, {
                    limitInputPixels: MAX_IMAGE_PIXELS,
                    failOn: "error",
                })
                    .resize(1080, null, { withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toFile(outputPath);
                images.push(filename);
            }
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
            await Promise.all(createdImagePaths.map((filePath) => fs.promises.unlink(filePath).catch(() => {})));
            console.error("CREATE POST ERROR:", err);

            return res.status(500).json({
                error: err.message || "Error creando post"
            });
        }
    }
);

/*
====================================
GET POSTS (likes + avatar + images)
====================================
*/
const formatPostRows = (rows) => rows.map((post) => {
    let parsedImages = [];

    try {
        if (!post.images) parsedImages = [];
        else if (Array.isArray(post.images)) parsedImages = post.images;
        else if (typeof post.images === "string") parsedImages = JSON.parse(post.images);
        else parsedImages = post.images;
    } catch (error) {
        console.error("JSON PARSE ERROR:", error);
        parsedImages = [];
    }

    return {
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        created_at: post.created_at,
        likes_count: post.likes_count,
        nickname: post.nickname,
        avatar: typeof post.avatar === "string" && post.avatar.trim() ? post.avatar.trim() : null,
        replies_count: Number(post.replies_count) || 0,
        images: parsedImages,
    };
});

const fetchPostRows = async ({ id, limit = 50, offset = 0 } = {}) => {
    const whereSql = id ? "WHERE p.id = ?" : "";
    const pageSql = id ? "LIMIT 1" : "LIMIT ? OFFSET ?";
    const params = id ? [id] : [limit, offset];

    return pool.query(`
      SELECT
        p.id,
        p.user_id,
        p.content,
        p.images,
        p.created_at,
        p.likes_count,
        u.nickname,
        u.profile_image AS avatar,
        (SELECT COUNT(*) FROM post_replies r WHERE r.post_id = p.id) AS replies_count
      FROM (
        SELECT p.id, p.user_id, p.content, p.images, p.created_at, p.likes_count
        FROM posts p
        ${whereSql}
        ORDER BY p.id DESC
        ${pageSql}
      ) p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.id DESC
    `, params);
};

router.get("/", async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 50);
        const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
        const [[countRow]] = await pool.query("SELECT COUNT(*) AS total FROM posts");
        const [rows] = await fetchPostRows({ limit, offset });
        const total = Number(countRow?.total) || 0;

        return res.json({
            posts: formatPostRows(rows),
            total,
            limit,
            offset,
            hasMore: offset + rows.length < total,
        });
    } catch (err) {
        console.error("GET POSTS ERROR:", err);
        return res.status(500).json({ error: "Error obteniendo posts" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const [rows] = await fetchPostRows({ id: req.params.id });
        if (!rows.length) return res.status(404).json({ error: "Post no encontrado" });
        return res.json(formatPostRows(rows)[0]);
    } catch (err) {
        console.error("GET POST ERROR:", err);
        return res.status(500).json({ error: "Error obteniendo el post" });
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
        const canModerate = ["moderator", "admin", "owner"].includes(req.user.role);

        if (Number(post.user_id) !== Number(userId) && !canModerate) {
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

        const [postOwnerRows] = await pool.query(
            "SELECT user_id FROM posts WHERE id = ?",
            [postId]
        );

        if (
            postOwnerRows.length > 0 &&
            Number(postOwnerRows[0].user_id) !== Number(userId)
        ) {
            await pool.query(
                `
                INSERT INTO notifications (user_id, from_user_id, type, reference_id)
                VALUES (?, ?, 'like_post', ?)
                `,
                [Number(postOwnerRows[0].user_id), Number(userId), postId]
            );
        }

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
        const [result] = await pool.query(
            `
            INSERT INTO post_replies
            (post_id, user_id, content)
            VALUES (?, ?, ?)
            `,
            [postId, userId, cleanContent]
        );

        const replyId = result.insertId;

        /*
        ============================
        GET POST OWNER
        ============================
        */
        const [post] = await pool.query(
            "SELECT user_id FROM posts WHERE id = ?",
            [postId]
        );

        /*
        ============================
        CREATE NOTIFICATION
        ============================
        */
        if (
            post.length > 0 &&
            Number(post[0].user_id) !== Number(userId)
        ) {
            await pool.query(
                `
        INSERT INTO notifications (user_id, from_user_id, type, reference_id)
        VALUES (?, ?, 'reply_post', ?)
        `,
                [Number(post[0].user_id), Number(userId), replyId]
            );
        }

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
ENDPOINT TOGGLE LIKE REPLY
====================================
*/

router.post("/:id/replies/:replyId/like", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const replyId = Number(req.params.replyId);

        if (isNaN(replyId)) {
            return res.status(400).json({ error: "ID inválido" });
        }

        const [existing] = await pool.query(
            `SELECT id FROM post_reply_likes WHERE reply_id = ? AND user_id = ?`,
            [replyId, userId]
        );

        // QUITAR LIKE
        if (existing.length > 0) {
            await pool.query(
                `DELETE FROM post_reply_likes WHERE reply_id = ? AND user_id = ?`,
                [replyId, userId]
            );

            await pool.query(
                `UPDATE post_replies SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?`,
                [replyId]
            );

            return res.json({ liked: false });
        }

        // DAR LIKE
        await pool.query(
            `INSERT INTO post_reply_likes (reply_id, user_id) VALUES (?, ?)`,
            [replyId, userId]
        );

        await pool.query(
            `UPDATE post_replies SET likes_count = likes_count + 1 WHERE id = ?`,
            [replyId]
        );

        const [replyOwnerRows] = await pool.query(
            "SELECT user_id, post_id FROM post_replies WHERE id = ?",
            [replyId]
        );

        if (
            replyOwnerRows.length > 0 &&
            Number(replyOwnerRows[0].user_id) !== Number(userId)
        ) {
            await pool.query(
                `
                INSERT INTO notifications (user_id, from_user_id, type, reference_id)
                VALUES (?, ?, 'like_reply', ?)
                `,
                [Number(replyOwnerRows[0].user_id), Number(userId), replyId]
            );
        }

        return res.json({ liked: true });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Error like reply" });
    }
});

/*
====================================
REPLIES LIKE STATUS (BY POST)
====================================
*/
router.get("/:id/replies/like-status", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const postId = Number(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({ error: "ID inválido" });
        }

        const [rows] = await pool.query(
            `
            SELECT pr.id AS reply_id
            FROM post_reply_likes prl
            JOIN post_replies pr ON pr.id = prl.reply_id
            WHERE pr.post_id = ? AND prl.user_id = ?
            `,
            [postId, userId]
        );

        return res.json({
            likedReplyIds: rows.map((r) => Number(r.reply_id))
        });
    } catch (err) {
        console.error("REPLIES LIKE STATUS ERROR:", err);
        return res.status(500).json({ error: "Error obteniendo likes de respuestas" });
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
                r.user_id,
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

/*
====================================
MODERATE REPLIES
====================================
*/
router.delete("/:id/replies/:replyId", verifyToken, checkRole(["moderator", "admin", "owner"]), async (req, res) => {
    const postId = Number(req.params.id);
    const replyId = Number(req.params.replyId);

    if (!Number.isSafeInteger(postId) || postId <= 0 || !Number.isSafeInteger(replyId) || replyId <= 0) {
        return res.status(400).json({ error: "ID inválido" });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [replyRows] = await connection.query(
            "SELECT id FROM post_replies WHERE id = ? AND post_id = ? LIMIT 1",
            [replyId, postId]
        );

        if (!replyRows.length) {
            await connection.rollback();
            return res.status(404).json({ error: "Comentario no encontrado" });
        }

        await connection.query(
            "DELETE FROM notifications WHERE type IN ('reply_post', 'like_reply') AND reference_id = ?",
            [replyId]
        );
        await connection.query("DELETE FROM post_reply_likes WHERE reply_id = ?", [replyId]);
        await connection.query("DELETE FROM post_replies WHERE id = ? AND post_id = ?", [replyId, postId]);

        await connection.commit();
        return res.json({ message: "Comentario eliminado" });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("DELETE REPLY ERROR:", err);
        return res.status(500).json({ error: "Error eliminando comentario" });
    } finally {
        connection?.release();
    }
});


module.exports = router;
