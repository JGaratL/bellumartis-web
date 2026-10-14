const db = require("../db");

const buildContentSignature = (row) =>
  [
    String(row?.title || "").trim(),
    String(row?.description || "").trim(),
    String(row?.content_html || row?.body || "").trim(),
    String(row?.theme || "").trim(),
    String(row?.published_at || "").trim(),
    String(row?.thumbnail_url || "").trim(),
    String(row?.type || "").trim(),
    String(row?.source_url || "").trim(),
    String(row?.period_id ?? "").trim(),
    String(row?.subperiod_id ?? "").trim(),
  ].join("::");

const dedupeContentRows = (rows) => {
  const seen = new Map();

  for (const row of rows || []) {
    const signature = buildContentSignature(row);
    const existing = seen.get(signature);

    if (!existing || Number(row.id) > Number(existing.id)) {
      seen.set(signature, row);
    }
  }

  return [...seen.values()];
};

async function getContent(req, res) {
    try {
        const limitParam = Number.parseInt(req.query.limit, 10);
        const limitClause =
            Number.isFinite(limitParam) && limitParam > 0
                ? `LIMIT ${Math.min(limitParam, 5000)}`
                : "";

        const [rows] = await db.query(`
        SELECT
            c.id,
            c.title,
            c.slug,
            c.description,
            c.body AS content_html,
            c.theme,
            c.type,
            c.thumbnail_url,
            c.youtube_video_id,
            c.source_url,
            c.published_at,
            c.duration_seconds,
            c.period_id,
            c.subperiod_id,
            NULL AS period,
            NULL AS subperiod,
            (
                SELECT GROUP_CONCAT(
                    DISTINCT g.name
                    ORDER BY g.name
                    SEPARATOR '|'
                )
                FROM content_guests cg
                INNER JOIN guests g
                    ON g.id = cg.guest_id
                WHERE cg.content_id = c.id
            ) AS guests
        FROM content c
        WHERE c.is_visible = 1
        ORDER BY c.published_at DESC
        ${limitClause}
    `);

        res.json(dedupeContentRows(rows));
    } catch (error) {
        console.error("Error obteniendo content:", error);

        res.status(500).json({
            error: "Error obteniendo contenido",
        });
    }
}

async function getGuests(req, res) {
    try {
        const [rows] = await db.query(`
    SELECT
        g.id,
        g.name,
        g.slug,
        COUNT(DISTINCT cg.content_id) AS videoCount
    FROM guests g
    INNER JOIN content_guests cg
        ON cg.guest_id = g.id
    INNER JOIN content c
        ON c.id = cg.content_id
        AND c.is_visible = 1
    GROUP BY g.id, g.name, g.slug
    HAVING videoCount > 0
    ORDER BY videoCount DESC, g.name ASC
`);

        res.json(rows);

    } catch (error) {
        console.error("Error obteniendo invitados:", error);

        res.status(500).json({
            error: "Error obteniendo invitados"
        });
    }
}

module.exports = {
    getContent,
    getGuests
};
