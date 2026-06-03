const db = require("../db");

async function getContent(req, res) {
    try {
        const [rows] = await db.query(`
        SELECT
        id,
        title,
        description,
        theme,
        type,
        thumbnail_url,
        youtube_video_id,
        source_url,
        published_at,
        duration_seconds
        FROM content
        WHERE is_visible = 1
        ORDER BY published_at DESC
        LIMIT 250
    `);

        res.json(rows);
    } catch (error) {
        console.error("Error obteniendo content:", error);

        res.status(500).json({
            error: "Error obteniendo contenido",
        });
    }
}

module.exports = {
    getContent,
};