require("dotenv").config();

const { google } = require("googleapis");
const db = require("../db");
const playlistMetadata = require("../data/playlistMetadata");
const playlistMetadata2 = require("../data/playlistMetadata2");

const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });

const PERIOD_ALIASES = new Map([
  ["prehistoria", "Prehistoria"],
  ["edad antigua", "Historia Antigua"],
  ["historia antigua", "Historia Antigua"],
  ["historia clásica", "Historia Antigua"],
  ["edad media", "Edad Media"],
  ["medieval", "Edad Media"],
  ["edad moderna", "Edad Moderna"],
  ["historia moderna", "Edad Moderna"],
  ["moderna", "Edad Moderna"],
  ["edad contemporánea", "Historia Contemporánea"],
  ["historia contemporánea", "Historia Contemporánea"],
  ["contemporánea", "Historia Contemporánea"],
]);

const normalize = (value) => String(value || "").normalize("NFKC").trim().toLocaleLowerCase("es");
const slug = (value) => normalize(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const asList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);
const normalizeConflict = (value) => normalize(value) === "wwii" ? "Segunda Guerra Mundial" : String(value).trim();

const metadataByPlaylist = new Map();
for (const metadata of [playlistMetadata, playlistMetadata2]) {
  for (const [playlistId, entry] of Object.entries(metadata)) {
    const current = metadataByPlaylist.get(playlistId) || {};
    const periodValue = entry.period ? PERIOD_ALIASES.get(normalize(entry.period)) : null;
    const subperiod = entry.subperiod || entry.superiod || current.subperiod || null;
    const conflicts = [...new Set([
      ...asList(current.conflicts),
      ...asList(entry.conflicts).map(normalizeConflict),
    ])];
    metadataByPlaylist.set(playlistId, {
      ...current,
      type: entry.type === "podcast" ? "podcast" : current.type || null,
      theme: entry.theme === "actualidad_militar" ? "actualidad_militar"
        : entry.theme ? "historia_militar" : current.theme,
      period: periodValue || current.period || null,
      subperiod: subperiod || null,
      conflicts,
    });
  }
}

const PERIOD_ORDER = ["Prehistoria", "Historia Antigua", "Edad Media", "Edad Moderna", "Historia Contemporánea"];
const CONFLICT_ORDER = [
  "Reconquista",
  "Cruzadas",
  "Guerra de los Cien Años",
  "Guerras de Italia",
  "Conquista de México",
  "Batalla de Lepanto",
  "Guerras Napoleónicas",
  "Guerra de Independencia Española",
  "Guerras de Independencia Hispanoamericanas",
  "Guerra de Secesión",
  "Primera Guerra Mundial",
  "Guerra Civil Española",
  "Segunda Guerra Mundial",
  "Guerra del Pacífico",
  "Conflicto árabe-israelí",
  "Guerra de Ucrania",
];

async function fetchPlaylistDetails(ids) {
  const details = new Map();
  for (let offset = 0; offset < ids.length; offset += 50) {
    const response = await youtube.playlists.list({
      part: ["snippet"],
      id: ids.slice(offset, offset + 50).join(","),
      maxResults: 50,
    });
    for (const item of response.data.items || []) details.set(item.id, item.snippet.title);
  }
  return details;
}

async function fetchPlaylistVideoIds(playlistId) {
  const ids = [];
  let pageToken;
  do {
    const response = await youtube.playlistItems.list({
      part: ["contentDetails"],
      playlistId,
      maxResults: 50,
      pageToken,
    });
    ids.push(...(response.data.items || []).map((item) => item.contentDetails?.videoId).filter(Boolean));
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  return ids;
}

async function ensureTaxonomy() {
  const [existingPeriods] = await db.query("SELECT id, name FROM periods");
  const existingByName = new Map(existingPeriods.map((period) => [period.name, period.id]));
  const legacyNames = new Map([
    ["Antigüedad", "Historia Antigua"],
    ["Medieval", "Edad Media"],
    ["Moderna", "Edad Moderna"],
    ["Contemporánea", "Historia Contemporánea"],
  ]);
  for (const period of existingPeriods) {
    const targetName = legacyNames.get(period.name);
    if (!targetName || existingByName.has(targetName)) continue;
    await db.query("UPDATE periods SET name = ?, slug = ?, sort_order = ? WHERE id = ?", [
      targetName, slug(targetName), PERIOD_ORDER.indexOf(targetName) + 1, period.id,
    ]);
    existingByName.delete(period.name);
    existingByName.set(targetName, period.id);
  }
  for (const [index, name] of PERIOD_ORDER.entries()) {
    if (!existingByName.has(name)) {
      await db.query("INSERT INTO periods (name, slug, sort_order) VALUES (?, ?, ?)", [name, slug(name), index + 1]);
      const [[created]] = await db.query("SELECT id FROM periods WHERE slug = ? LIMIT 1", [slug(name)]);
      existingByName.set(name, created.id);
    } else {
      await db.query("UPDATE periods SET sort_order = ? WHERE id = ?", [index + 1, existingByName.get(name)]);
    }
  }

  const subperiodIds = new Map();
  for (const metadata of metadataByPlaylist.values()) {
    if (!metadata.period || !metadata.subperiod) continue;
    const periodId = existingByName.get(metadata.period);
    const [[existing]] = await db.query(
      "SELECT id FROM subperiods WHERE name = ? AND period_id = ? LIMIT 1",
      [metadata.subperiod, periodId]
    );
    if (existing) {
      subperiodIds.set(`${metadata.period}|${metadata.subperiod}`, existing.id);
    } else {
      const [result] = await db.query(
        "INSERT INTO subperiods (name, period_id) VALUES (?, ?)",
        [metadata.subperiod, periodId]
      );
      subperiodIds.set(`${metadata.period}|${metadata.subperiod}`, result.insertId);
    }
  }

  const conflictIds = new Map();
  const conflictNames = [...new Set([...metadataByPlaylist.values()].flatMap((item) => item.conflicts))]
    .sort((a, b) => {
      const aOrder = CONFLICT_ORDER.indexOf(a);
      const bOrder = CONFLICT_ORDER.indexOf(b);
      return (aOrder < 0 ? Number.MAX_SAFE_INTEGER : aOrder)
        - (bOrder < 0 ? Number.MAX_SAFE_INTEGER : bOrder)
        || a.localeCompare(b, "es");
    });
  for (const [index, name] of conflictNames.entries()) {
    const conflictSlug = slug(name);
    await db.query(
      `INSERT INTO conflicts (name, slug, sort_order, is_visible)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order), is_visible = 1`,
      [name, conflictSlug, index + 1]
    );
    const [[row]] = await db.query("SELECT id FROM conflicts WHERE slug = ? LIMIT 1", [conflictSlug]);
    conflictIds.set(name, row.id);
  }
  return { periodIds: existingByName, subperiodIds, conflictIds };
}

async function run() {
  if (!process.env.YOUTUBE_API_KEY) throw new Error("Falta YOUTUBE_API_KEY.");
  const playlistIds = [...metadataByPlaylist.keys()];
  const names = await fetchPlaylistDetails(playlistIds);
  const taxonomy = await ensureTaxonomy();
  const synced = [];

  for (const playlistId of playlistIds) {
    const metadata = metadataByPlaylist.get(playlistId);
    const playlistName = names.get(playlistId) || `Playlist ${playlistId}`;
    const periodId = metadata.period ? taxonomy.periodIds.get(metadata.period) : null;
    const subperiodId = metadata.period && metadata.subperiod
      ? taxonomy.subperiodIds.get(`${metadata.period}|${metadata.subperiod}`) || null
      : null;
    const conflictId = metadata.conflicts.length ? taxonomy.conflictIds.get(metadata.conflicts[0]) : null;
    const [result] = await db.query(
      `INSERT INTO playlists
         (youtube_playlist_id, name, slug, type, theme, period_id, subperiod_id, conflict_id, conflicts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), slug = VALUES(slug), type = VALUES(type), theme = VALUES(theme),
         period_id = VALUES(period_id), subperiod_id = VALUES(subperiod_id),
         conflict_id = VALUES(conflict_id), conflicts = VALUES(conflicts)`,
      [playlistId, playlistName, slug(playlistName) || playlistId.toLowerCase(), metadata.type || null, metadata.theme || null,
        periodId || null, subperiodId, conflictId || null, JSON.stringify(metadata.conflicts)]
    );
    const playlistDbId = result.insertId || (await db.query(
      "SELECT id FROM playlists WHERE youtube_playlist_id = ? LIMIT 1", [playlistId]
    ))[0][0].id;
    const videoIds = await fetchPlaylistVideoIds(playlistId);
    synced.push({ playlistId, playlistDbId, videoIds, theme: metadata.theme, type: metadata.type });
    console.log(`${playlistName}: ${videoIds.length} videos en playlist.`);
  }

  await db.query("DELETE FROM content_playlists WHERE playlist_id IN (?)", [synced.map((item) => item.playlistDbId)]);
  const allVideoIds = [...new Set(synced.flatMap((item) => item.videoIds))];
  const contentByYoutubeId = new Map();
  for (let offset = 0; offset < allVideoIds.length; offset += 500) {
    const batch = allVideoIds.slice(offset, offset + 500);
    if (!batch.length) continue;
    const [rows] = await db.query("SELECT id, youtube_video_id FROM content WHERE youtube_video_id IN (?)", [batch]);
    for (const row of rows) contentByYoutubeId.set(row.youtube_video_id, row.id);
  }

  const associationRows = [];
  const contentThemes = new Map();
  for (const playlist of synced) {
    for (const youtubeId of playlist.videoIds) {
      const contentId = contentByYoutubeId.get(youtubeId);
      if (!contentId) continue;
      associationRows.push([contentId, playlist.playlistDbId]);
      if (playlist.theme) {
        if (!contentThemes.has(contentId)) contentThemes.set(contentId, new Set());
        contentThemes.get(contentId).add(playlist.theme);
      }
    }
  }
  for (let offset = 0; offset < associationRows.length; offset += 500) {
    const batch = associationRows.slice(offset, offset + 500);
    await db.query("INSERT IGNORE INTO content_playlists (content_id, playlist_id) VALUES ?", [batch]);
  }
  for (const [contentId, themes] of contentThemes) {
    if (themes.size === 1) {
      await db.query("UPDATE content SET theme = ? WHERE id = ?", [[...themes][0], contentId]);
    }
  }
  await db.query("UPDATE content SET type = 'video' WHERE youtube_video_id IS NOT NULL");
  await db.query(
    `UPDATE content c
     INNER JOIN content_playlists cp ON cp.content_id = c.id
     INNER JOIN playlists p ON p.id = cp.playlist_id
     SET c.type = 'podcast'
     WHERE c.youtube_video_id IS NOT NULL AND p.type = 'podcast'`
  );
  const [[podcastCount]] = await db.query("SELECT COUNT(*) AS count FROM content WHERE youtube_video_id IS NOT NULL AND type = 'podcast'");

  console.log(JSON.stringify({
    playlistsSynced: synced.length,
    playlistVideoIds: allVideoIds.length,
    databaseVideosLinked: associationRows.length,
    uniqueVideosLinked: new Set(associationRows.map(([contentId]) => contentId)).size,
    classifiedPeriods: taxonomy.periodIds.size,
    classifiedSubperiods: taxonomy.subperiodIds.size,
    conflicts: taxonomy.conflictIds.size,
    podcasts: podcastCount.count,
  }, null, 2));
}

run().then(() => process.exit(0)).catch(async (error) => {
  console.error("Error sincronizando clasificación de playlists:", error.message);
  process.exit(1);
});
