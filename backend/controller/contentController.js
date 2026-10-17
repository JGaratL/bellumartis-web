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
    String(row?.playlist_periods || "").trim(),
    String(row?.playlist_subperiods || "").trim(),
    String(row?.playlist_conflicts || "").trim(),
    String(row?.playlist_themes || "").trim(),
  ].join("::");

const splitValues = (...values) => [...new Set(values
  .flatMap((value) => String(value || "").split("|"))
  .map((value) => value.trim())
  .filter(Boolean))];

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
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 24, 1), 50);
        const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
        const where = ["c.is_visible = 1"];
        const params = [];
        const search = String(req.query.search || "").trim();
        const type = String(req.query.type || "").trim();
        const theme = String(req.query.theme || "").trim();
        const conflict = String(req.query.conflict || "").trim();
        const guest = String(req.query.guest || "").trim();
        const periods = Array.isArray(req.query.period)
          ? req.query.period.map(String).filter(Boolean)
          : req.query.period ? [String(req.query.period)] : [];

        if (search) {
          where.push("c.title LIKE ?");
          params.push(`%${search}%`);
        }
        if (["video", "podcast", "articulo"].includes(type)) {
          where.push("c.type = ?");
          params.push(type);
        }
        if (theme) {
          where.push(`(c.theme = ? OR EXISTS (
            SELECT 1 FROM content_playlists theme_cp
            INNER JOIN playlists theme_playlist ON theme_playlist.id = theme_cp.playlist_id
            WHERE theme_cp.content_id = c.id AND theme_playlist.theme = ?
          ))`);
          params.push(theme, theme);
        }
        if (periods.length) {
          const placeholders = periods.map(() => "?").join(", ");
          where.push(`(
            direct_period.name IN (${placeholders})
            OR direct_subperiod.name IN (${placeholders})
            OR EXISTS (
              SELECT 1
              FROM content_playlists period_cp
              INNER JOIN playlists period_playlist ON period_playlist.id = period_cp.playlist_id
              LEFT JOIN subperiods playlist_subperiod ON playlist_subperiod.id = period_playlist.subperiod_id
              LEFT JOIN periods playlist_period ON playlist_period.id = COALESCE(period_playlist.period_id, playlist_subperiod.period_id)
              WHERE period_cp.content_id = c.id
                AND (playlist_period.name IN (${placeholders}) OR playlist_subperiod.name IN (${placeholders}))
            )
          )`);
          params.push(...periods, ...periods, ...periods, ...periods);
        }
        if (conflict) {
          where.push(`EXISTS (
            SELECT 1
            FROM content_playlists conflict_cp
            INNER JOIN playlists conflict_playlist ON conflict_playlist.id = conflict_cp.playlist_id
            INNER JOIN conflicts content_conflict ON content_conflict.id = conflict_playlist.conflict_id
            WHERE conflict_cp.content_id = c.id AND content_conflict.name = ?
          )`);
          params.push(conflict);
        }
        if (guest) {
          where.push(`EXISTS (
            SELECT 1
            FROM content_guests guest_cg
            INNER JOIN guests content_guest ON content_guest.id = guest_cg.guest_id
            WHERE guest_cg.content_id = c.id AND content_guest.name = ?
          )`);
          params.push(guest);
        }
        const whereSql = where.join(" AND ");

        const [countRows] = await db.query(`
          SELECT COUNT(*) AS total
          FROM content c
          LEFT JOIN subperiods direct_subperiod ON direct_subperiod.id = c.subperiod_id
          LEFT JOIN periods direct_period ON direct_period.id = COALESCE(c.period_id, direct_subperiod.period_id)
          WHERE ${whereSql}
        `, params);

        const [rows] = await db.query(`
        SELECT
            c.id,
            c.title,
            c.slug,
            c.description,
            c.theme,
            c.type,
            c.thumbnail_url,
            c.youtube_video_id,
            c.source_url,
            c.published_at,
            c.duration_seconds,
            c.period_id,
            c.subperiod_id,
            direct_period.name AS direct_period,
            direct_subperiod.name AS direct_subperiod,
            (
                SELECT GROUP_CONCAT(DISTINCT playlist_period.name ORDER BY playlist_period.name SEPARATOR '|')
                FROM content_playlists cp
                INNER JOIN playlists playlist ON playlist.id = cp.playlist_id
                LEFT JOIN subperiods playlist_subperiod ON playlist_subperiod.id = playlist.subperiod_id
                LEFT JOIN periods playlist_period ON playlist_period.id = COALESCE(playlist.period_id, playlist_subperiod.period_id)
                WHERE cp.content_id = c.id
            ) AS playlist_periods,
            (
                SELECT GROUP_CONCAT(DISTINCT playlist_subperiod.name ORDER BY playlist_subperiod.name SEPARATOR '|')
                FROM content_playlists cp
                INNER JOIN playlists playlist ON playlist.id = cp.playlist_id
                INNER JOIN subperiods playlist_subperiod ON playlist_subperiod.id = playlist.subperiod_id
                WHERE cp.content_id = c.id
            ) AS playlist_subperiods,
            (
                SELECT GROUP_CONCAT(DISTINCT conflict.name ORDER BY conflict.name SEPARATOR '|')
                FROM content_playlists cp
                INNER JOIN playlists playlist ON playlist.id = cp.playlist_id
                LEFT JOIN conflicts conflict ON conflict.id = playlist.conflict_id
                WHERE cp.content_id = c.id AND conflict.name IS NOT NULL
            ) AS playlist_conflicts,
            (
                SELECT GROUP_CONCAT(DISTINCT playlist.theme ORDER BY playlist.theme SEPARATOR '|')
                FROM content_playlists cp
                INNER JOIN playlists playlist ON playlist.id = cp.playlist_id
                WHERE cp.content_id = c.id AND playlist.theme IS NOT NULL
            ) AS playlist_themes,
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
        LEFT JOIN subperiods direct_subperiod ON direct_subperiod.id = c.subperiod_id
        LEFT JOIN periods direct_period ON direct_period.id = COALESCE(c.period_id, direct_subperiod.period_id)
        WHERE ${whereSql}
        ORDER BY c.published_at DESC, c.id DESC
        LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

        const items = dedupeContentRows(rows).map((row) => {
            const periods = splitValues(row.direct_period, row.playlist_periods);
            const subperiods = splitValues(row.direct_subperiod, row.playlist_subperiods);
            const conflicts = splitValues(row.playlist_conflicts);
            const playlistThemes = splitValues(row.playlist_themes);
            const themes = playlistThemes.length ? playlistThemes : splitValues(row.theme);
            const { direct_period, direct_subperiod, playlist_periods, playlist_subperiods, playlist_conflicts, playlist_themes, ...content } = row;
            return {
                ...content,
                themes,
                period: periods[0] || null,
                subperiod: subperiods[0] || null,
                periods,
                subperiods,
                conflicts,
                conflict: conflicts[0] || null,
            };
        });

        res.json({
          items,
          total: Number(countRows?.[0]?.total || 0),
          limit,
          offset,
          hasMore: offset + rows.length < Number(countRows?.[0]?.total || 0),
        });
    } catch (error) {
        console.error("Error obteniendo content:", error);

        res.status(500).json({
            error: "Error obteniendo contenido",
        });
    }
}

async function getContentById(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT id, title, description, body AS content_html, type
      FROM content
      WHERE id = ? AND is_visible = 1 AND type = 'articulo'
      LIMIT 1
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: "Contenido no encontrado" });
    return res.json(rows[0]);
  } catch (error) {
    console.error("Error obteniendo detalle del contenido:", error);
    return res.status(500).json({ error: "Error obteniendo el contenido" });
  }
}

async function getContentFilters(req, res) {
    try {
        const [taxonomyRows] = await db.query(`
            SELECT DISTINCT period.name AS period, period.sort_order, subperiod.name AS subperiod
            FROM playlists playlist
            LEFT JOIN subperiods subperiod ON subperiod.id = playlist.subperiod_id
            LEFT JOIN periods period ON period.id = COALESCE(playlist.period_id, subperiod.period_id)
            WHERE period.id IS NOT NULL
            ORDER BY period.sort_order, period.name, subperiod.name
        `);
        const [conflictRows] = await db.query(`
            SELECT DISTINCT conflict.name, conflict.sort_order
            FROM playlists playlist
            INNER JOIN conflicts conflict ON conflict.id = playlist.conflict_id
            WHERE conflict.is_visible = 1
            ORDER BY conflict.sort_order, conflict.name
        `);
        const periods = new Map();
        for (const row of taxonomyRows) {
            if (!periods.has(row.period)) periods.set(row.period, new Set());
            if (row.subperiod) periods.get(row.period).add(row.subperiod);
        }
        return res.json({
            periods: [...periods].map(([name, subperiods]) => ({ name, subperiods: [...subperiods] })),
            conflicts: conflictRows.map((row) => row.name),
        });
    } catch (error) {
        console.error("Error obteniendo filtros de contenido:", error);
        return res.status(500).json({ error: "Error obteniendo filtros" });
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
    getContentById,
    getGuests,
    getContentFilters,
};
