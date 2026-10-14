require("dotenv").config();
const db = require("../db");

const API_KEY = process.env.YOUTUBE_API_KEY;

const PLAYLIST_ID =
    "PLFFtscowOtCzT8BSkK20cgeuU6Vsk5fLp";

// -----------------------------------
// GET VIDEOS FROM YOUTUBE PLAYLIST
// -----------------------------------

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

        if (data.error) {
            throw new Error(
                JSON.stringify(data.error, null, 2)
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
        console.log("📥 Obteniendo playlist...");

        const ids =
            await getPlaylistVideoIds();

        const uniqueIds = [...new Set(ids)];

        console.log(
            `🎧 Vídeos en playlist: ${uniqueIds.length}`
        );

        if (!uniqueIds.length) {
            console.log("⚠️ No hay vídeos");
            return;
        }

        const placeholders = uniqueIds
            .map(() => "?")
            .join(",");

        const [result] = await db.query(
            `
            UPDATE content
            SET type = 'podcast'
            WHERE youtube_video_id IN (${placeholders})
            `,
            uniqueIds
        );

        console.log(
            `✅ Vídeos encontrados en BBDD: ${result.affectedRows}`
        );

        console.log(
            `🎉 Total marcados como podcast: ${result.affectedRows}`
        );

        process.exit(0);

    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

main();