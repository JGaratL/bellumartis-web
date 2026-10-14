require("dotenv").config();
const db = require("../db");

const API_KEY = process.env.YOUTUBE_API_KEY;

const PLAYLIST_ID =
    "PLFFtscowOtCzT8BSkK20cgeuU6Vsk5fLp";

async function getPlaylistVideoIds() {
    let videoIds = [];
    let nextPageToken = null;

    do {
        const url =
            `https://www.googleapis.com/youtube/v3/playlistItems` +
            `?part=contentDetails` +
            `&playlistId=${PLAYLIST_ID}` +
            `&maxResults=50` +
            `&pageToken=${nextPageToken || ""}` +
            `&key=${API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.items) {
            for (const item of data.items) {
                videoIds.push(item.contentDetails.videoId);
            }
        }

        nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return videoIds;
}

async function markPodcasts() {
    console.log("📥 Obteniendo playlist...");

    const podcastIds = await getPlaylistVideoIds();
    const set = new Set(podcastIds);

    console.log(`🎧 Videos en playlist: ${set.size}`);

    const [rows] = await db.query(`
        SELECT id, youtube_video_id, type
        FROM content
        WHERE type = 'video'
    `);

    let updated = 0;

    for (const row of rows) {
        if (set.has(row.youtube_video_id)) {
            await db.query(
                `
                UPDATE content
                SET type = 'podcast'
                WHERE id = ?
                `,
                [row.id]
            );

            updated++;
            console.log("✔ marcado podcast:", row.youtube_video_id);
        }
    }

    console.log(`🎉 Terminado. Actualizados: ${updated}`);
}

markPodcasts();