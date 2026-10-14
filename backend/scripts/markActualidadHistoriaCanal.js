require("dotenv").config();
const db = require("../db");

const API_KEY = process.env.YOUTUBE_API_KEY;

// -----------------------------------
// PLAYLISTS ACTUALIDAD MILITAR
// -----------------------------------

const PLAYLIST_IDS = [
    "PLFFtscowOtCy-q9SYUzTOh7fkII7yqxrA",
    "PLFFtscowOtCzbFKRRhG4YCpSCR4d3Dj4-",
    "PLFFtscowOtCz85u3AKy0240wF0m5_1xHF",
];

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

        if (data.error) {
            throw new Error(
                `Playlist ${playlistId}: ${JSON.stringify(data.error)}`
            );
        }

        if (data.items) {
            for (const item of data.items) {
                videoIds.push(
                    item.contentDetails.videoId
                );
            }
        }

        nextPageToken =
            data.nextPageToken || null;

    } while (nextPageToken);

    return videoIds;
}

// -----------------------------------
// MAIN
// -----------------------------------

async function main() {
    try {
        console.log(
            "📥 Obteniendo vídeos de playlists de actualidad militar..."
        );

        const allIds = new Set();

        for (const playlistId of PLAYLIST_IDS) {
            console.log(
                `➡️ Procesando playlist: ${playlistId}`
            );

            const ids =
                await getPlaylistVideoIds(
                    playlistId
                );

            console.log(
                `   📺 Vídeos encontrados: ${ids.length}`
            );

            ids.forEach(id =>
                allIds.add(id)
            );
        }

        const uniqueIds = [...allIds];

        console.log(
            `🎯 Vídeos únicos totales: ${uniqueIds.length}`
        );

        if (!uniqueIds.length) {
            console.log(
                "⚠️ No se encontraron vídeos"
            );
            return;
        }

        const placeholders = uniqueIds
            .map(() => "?")
            .join(",");

        // Cuántos existen en la BBDD
        const [existingRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM content
            WHERE youtube_video_id IN (${placeholders})
            `,
            uniqueIds
        );

        const videosInDb =
            existingRows[0].total;

        // Actualización
        const [result] = await db.query(
            `
            UPDATE content
            SET theme = 'actualidad_militar'
            WHERE youtube_video_id IN (${placeholders})
            `,
            uniqueIds
        );

        console.log("");
        console.log("========== RESUMEN ==========");
        console.log(
            `📺 Vídeos únicos en playlists: ${uniqueIds.length}`
        );
        console.log(
            `💾 Vídeos encontrados en BBDD: ${videosInDb}`
        );
        console.log(
            `✅ Vídeos modificados: ${result.affectedRows}`
        );
        console.log("=============================");

        process.exit(0);

    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

main();