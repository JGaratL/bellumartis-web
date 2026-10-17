require("dotenv").config();

const slugify = require("slugify");
const { google } = require("googleapis");
const db = require("../db");
const metadataA = require("../data/playlistMetadata");
const metadataB = require("../data/playlistMetadata2");
const { aliases } = require("./guestAliases");

/*
 * Daily incremental YouTube sync.
 * Run with: node backend/scripts/fetch-youtube-videos-pro.js
 * YouTube API quota: 2 uploads calls on a normal run, plus one
 * playlistItems call per mapped playlist only when new uploads exist,
 * and one videos.list request per batch of up to 50 new video IDs.
 * It deliberately does not use search.list (100 quota units per call).
 */

const CHANNELS = [
  { id: process.env.YOUTUBE_CHANNEL_ID, theme: "actualidad_militar", label: "Actualidad Militar" },
  { id: process.env.YOUTUBE_CHANNEL2_ID, theme: "historia_militar", label: "Historia Militar" },
].filter((channel) => channel.id);

const apiKey = process.env.YOUTUBE_API_KEY;
const youtube = google.youtube({ version: "v3", auth: apiKey });
const normalize = (value = "") => String(value)
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const cleanText = (value = "") => String(value)
  .replace(/https?:\/\/\S+/gi, " ")
  .replace(/^#.*$/gm, " ")
  .replace(/#[\p{L}\p{N}_]+/gu, " ")
  .replace(/[\p{Extended_Pictographic}]/gu, " ")
  .replace(/[-_]{3,}/g, " ").replace(/\s+/g, " ").trim() || null;
const parseDuration = (value = "") => {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : null;
};
const slug = (value) => slugify(value || "video", { lower: true, strict: true, locale: "es", trim: true });

const playlistMetadata = new Map();
for (const collection of [metadataA, metadataB]) {
  for (const [playlistId, entry] of Object.entries(collection)) {
    playlistMetadata.set(playlistId, { ...(playlistMetadata.get(playlistId) || {}), ...entry });
  }
}
const aliasEntries = Object.entries(aliases)
  .map(([alias, canonical]) => ({ alias: normalize(alias), canonicals: Array.isArray(canonical) ? canonical : [canonical] }))
  .filter((entry) => entry.alias.length >= 3)
  .sort((a, b) => b.alias.length - a.alias.length);

async function getRecentUploads(channel) {
  const [channelResponse, stateRows, newestRows] = await Promise.all([
    youtube.channels.list({ part: ["contentDetails"], id: [channel.id], maxResults: 1 }),
    db.query("SELECT last_video_id, last_video_published_at FROM sync_state WHERE channel_id = ? LIMIT 1", [channel.id]),
    db.query("SELECT youtube_video_id, published_at FROM content WHERE source = 'youtube' AND theme = ? AND youtube_video_id IS NOT NULL ORDER BY published_at DESC LIMIT 1", [channel.theme]),
  ]);
  const uploadsId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) throw new Error(`No se pudo obtener la playlist de subidas del canal ${channel.id}`);
  const stored = stateRows[0][0];
  const newestContent = newestRows[0][0];
  const storedTime = stored?.last_video_published_at ? new Date(stored.last_video_published_at).getTime() : 0;
  const contentTime = newestContent?.published_at ? new Date(newestContent.published_at).getTime() : 0;
  const lastId = contentTime > storedTime ? newestContent.youtube_video_id : stored?.last_video_id || newestContent?.youtube_video_id || null;
  const videos = [];
  let pageToken;
  let pages = 0;
  let reachedCheckpoint = false;
  do {
    const response = await youtube.playlistItems.list({
      part: ["snippet", "contentDetails"], playlistId: uploadsId, maxResults: 50, pageToken,
    });
    pages++;
    for (const item of response.data.items || []) {
      const id = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (!id) continue;
      if (lastId && id === lastId) { reachedCheckpoint = true; break; }
      videos.push({ id, snippet: item.snippet });
    }
    pageToken = reachedCheckpoint ? null : response.data.nextPageToken;
  } while (pageToken);
  return { videos, pages };
}

async function getExistingIds(ids) {
  const found = new Set();
  for (let offset = 0; offset < ids.length; offset += 500) {
    const batch = ids.slice(offset, offset + 500);
    if (!batch.length) continue;
    const [rows] = await db.query("SELECT youtube_video_id FROM content WHERE youtube_video_id IN (?)", [batch]);
    rows.forEach((row) => found.add(row.youtube_video_id));
  }
  return found;
}

async function getVideoDetails(ids) {
  const result = new Map();
  for (let offset = 0; offset < ids.length; offset += 50) {
    const response = await youtube.videos.list({ part: ["snippet", "contentDetails"], id: ids.slice(offset, offset + 50), maxResults: 50 });
    for (const video of response.data.items || []) result.set(video.id, video);
  }
  return result;
}

async function getPlaylistMembership(videoIds) {
  const memberships = new Map(videoIds.map((id) => [id, []]));
  if (!videoIds.length) return memberships;
  const [playlists] = await db.query(
    "SELECT id, youtube_playlist_id, type FROM playlists WHERE youtube_playlist_id IN (?)",
    [[...playlistMetadata.keys()]]
  );
  // Newest items are at the front of YouTube playlists. One page per mapped playlist
  // gives a predictable upper bound of about 72 quota units on a run with new videos.
  for (const playlist of playlists) {
    const response = await youtube.playlistItems.list({ part: ["contentDetails"], playlistId: playlist.youtube_playlist_id, maxResults: 50 });
    for (const item of response.data.items || []) {
      const videoId = item.contentDetails?.videoId;
      if (memberships.has(videoId)) memberships.get(videoId).push(playlist);
    }
  }
  return memberships;
}

async function uniqueSlug(title, videoId) {
  const base = slug(title) || `video-${videoId}`;
  let candidate = base;
  let suffix = 2;
  while (true) {
    const [rows] = await db.query("SELECT id FROM content WHERE slug = ? LIMIT 1", [candidate]);
    if (!rows.length) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

async function linkGuests(contentId, title) {
  const titleNorm = ` ${normalize(title)} `;
  const names = new Set();
  for (const entry of aliasEntries) {
    if (titleNorm.includes(` ${entry.alias} `)) entry.canonicals.forEach((name) => names.add(name));
  }
  for (const name of names) {
    const [guests] = await db.query("SELECT id FROM guests WHERE LOWER(name) = LOWER(?) LIMIT 1", [name]);
    if (guests.length) await db.query("INSERT IGNORE INTO content_guests (content_id, guest_id) VALUES (?, ?)", [contentId, guests[0].id]);
  }
}

async function saveVideo(video, channel, memberships) {
  const snippet = video.snippet || {};
  const title = String(snippet.title || "").trim();
  const description = cleanText(snippet.description || "");
  const videoId = video.id;
  const durationSeconds = parseDuration(video.contentDetails?.duration);
  if (!title || !videoId) return false;
  if (`${title} ${description || ""}`.toLowerCase().includes("la caja de trovadores")) return false;
  // Keep the existing importer's short-video policy.
  if (durationSeconds !== null && durationSeconds < 180) return false;
  const videoSlug = await uniqueSlug(title, videoId);
  const thumbnail = snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url
    || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null;
  const type = (memberships.get(videoId) || []).some((playlist) => playlist.type === "podcast") ? "podcast" : "video";
  const [insert] = await db.query(
    `INSERT INTO content
      (title, slug, description, theme, type, source, source_url, youtube_video_id, thumbnail_url, published_at, duration_seconds)
     VALUES (?, ?, ?, ?, ?, 'youtube', ?, ?, ?, ?, ?)`,
    [title, videoSlug, description, channel.theme, type, `https://youtube.com/watch?v=${videoId}`, videoId, thumbnail,
      snippet.publishedAt ? new Date(snippet.publishedAt) : null, durationSeconds]
  );
  for (const playlist of memberships.get(videoId) || []) {
    await db.query("INSERT IGNORE INTO content_playlists (content_id, playlist_id) VALUES (?, ?)", [insert.insertId, playlist.id]);
  }
  await linkGuests(insert.insertId, title);
  return true;
}

async function refreshRecentPodcastTypes() {
  const podcastPlaylistIds = [...playlistMetadata.entries()]
    .filter(([, metadata]) => metadata.type === "podcast")
    .map(([playlistId]) => playlistId);
  if (!podcastPlaylistIds.length) return 0;
  const [playlists] = await db.query(
    "SELECT id, youtube_playlist_id FROM playlists WHERE type = 'podcast' AND youtube_playlist_id IN (?)",
    [podcastPlaylistIds]
  );
  let updated = 0;
  for (const playlist of playlists) {
    const response = await youtube.playlistItems.list({ part: ["contentDetails"], playlistId: playlist.youtube_playlist_id, maxResults: 50 });
    const ids = [...new Set((response.data.items || []).map((item) => item.contentDetails?.videoId).filter(Boolean))];
    if (!ids.length) continue;
    const [result] = await db.query("UPDATE content SET type = 'podcast' WHERE source = 'youtube' AND youtube_video_id IN (?)", [ids]);
    updated += result.affectedRows;
  }
  return updated;
}

async function run() {
  if (!apiKey) throw new Error("Falta YOUTUBE_API_KEY.");
  if (CHANNELS.length !== 2) throw new Error("Configura YOUTUBE_CHANNEL_ID y YOUTUBE_CHANNEL2_ID.");
  const [[lock]] = await db.query("SELECT GET_LOCK('bellumartis_daily_youtube_sync', 0) AS acquired");
  if (!lock.acquired) { console.log("Ya hay una sincronización diaria en curso; se omite esta ejecución."); return; }
  try {
    const pending = [];
    const channelResults = [];
    const refreshedPodcasts = await refreshRecentPodcastTypes();
    for (const channel of CHANNELS) {
      const { videos, pages } = await getRecentUploads(channel);
      channelResults.push({ channel: channel.label, pages, recent: videos.length });
      videos.forEach((video) => pending.push({ ...video, channel }));
    }

    if (!pending.length) {
      console.log("No hay vídeos nuevos.", JSON.stringify(channelResults));
      return;
    }
    const existing = await getExistingIds(pending.map((video) => video.id));
    const fresh = pending.filter((video) => !existing.has(video.id));
    const details = await getVideoDetails(fresh.map((video) => video.id));
    const memberships = await getPlaylistMembership([...details.keys()]);
    let imported = 0;
    for (const candidate of fresh) {
      const detail = details.get(candidate.id);
      if (!detail) continue;
      const saved = await saveVideo(detail, candidate.channel, memberships);
      if (saved) imported++;
    }
    // Advance each channel's checkpoint only after all writes have completed.
    for (const channel of CHANNELS) {
      const newest = pending.find((video) => video.channel.id === channel.id);
      if (!newest) continue;
      const [stateRows] = await db.query("SELECT id FROM sync_state WHERE channel_id = ? LIMIT 1", [channel.id]);
      const publishedAt = newest.snippet?.publishedAt ? new Date(newest.snippet.publishedAt) : null;
      if (stateRows.length) {
        await db.query("UPDATE sync_state SET last_video_published_at = ?, last_video_id = ? WHERE id = ?", [publishedAt, newest.id, stateRows[0].id]);
      } else {
        await db.query("INSERT INTO sync_state (channel_id, last_video_published_at, last_video_id) VALUES (?, ?, ?)", [channel.id, publishedAt, newest.id]);
      }
    }
    console.log(JSON.stringify({ channels: channelResults, candidates: pending.length, alreadyPresent: existing.size, imported, playlistsChecked: fresh.length ? playlistMetadata.size : 0, podcastRowsRefreshed: refreshedPodcasts }, null, 2));
  } finally {
    await db.query("SELECT RELEASE_LOCK('bellumartis_daily_youtube_sync')");
  }
}

run().catch((error) => {
  console.error("Error en sincronización diaria de YouTube:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await db.end();
});
