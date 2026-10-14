require("dotenv").config();
const db = require("../db");

const API_KEY = process.env.YOUTUBE_API_KEY;

// -----------------------------------
// CONFIG
// -----------------------------------

const PLAYLIST_ID = "PLFFtscowOtCzrcOdqbUGQ4MZK9Iqaw3fP";
const GUEST_ID = 191;

// -----------------------------------
// GET VIDEOS FROM PLAYLIST
// -----------------------------------

async function getPlaylistVideoIds(playlistId) {
    let videoIds = [];
    let nextPageToken = null;

    do {
        const url =
            `https://www.googleapis.com/youtube/v3/playlistItems` +
            `?part=contentDetails` +
            `&playlistId=${playlistId}` +
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

        nextPageToken = data.nextPageToken || null;

    } while (nextPageToken);

    return videoIds;
}

// -----------------------------------
// MAIN
// -----------------------------------

async function main() {
    try {
        console.log("📥 Cargando playlist...");

        const videoIds = await getPlaylistVideoIds(PLAYLIST_ID);

        console.log(`🎯 Vídeos encontrados: ${videoIds.length}`);

        if (!videoIds.length) {
            console.log("⚠️ No hay vídeos en la playlist");
            return;
        }

        // Buscar en DB
        const placeholders = videoIds.map(() => "?").join(",");

        const [rows] = await db.query(
            `
            SELECT id
            FROM content
            WHERE youtube_video_id IN (${placeholders})
            `,
            videoIds
        );

        const contentIds = rows.map(r => r.id);

        console.log(`🔎 Coinciden en DB: ${contentIds.length}`);

        if (!contentIds.length) {
            console.log("⚠️ Ningún vídeo encontrado en content");
            return;
        }

        // Insert relaciones
        const values = [];
        const params = [];

        for (const contentId of contentIds) {
            values.push("(?, ?)");
            params.push(contentId, GUEST_ID);
        }

        const [result] = await db.query(
            `
            INSERT IGNORE INTO content_guests (content_id, guest_id)
            VALUES ${values.join(",")}
            `,
            params
        );

        console.log(`✅ Relaciones creadas: ${result.affectedRows}`);

        process.exit(0);

    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

main();