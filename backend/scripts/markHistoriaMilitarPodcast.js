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

async function markPlaylistVideos() {
    try {
        console.log(
            "📥 Obteniendo vídeos de la playlist..."
        );

        const playlistIds =
            await getPlaylistVideoIds();

        const videoSet =
            new Set(playlistIds);

        console.log(
            `📚 Vídeos en playlist: ${videoSet.size}`
        );

        const [rows] = await db.query(`
            SELECT
                id,
                title,
                youtube_video_id
            FROM content
            WHERE youtube_video_id IS NOT NULL
        `);

        let updated = 0;

        for (const row of rows) {
            if (
                videoSet.has(
                    row.youtube_video_id
                )
            ) {
                await db.query(
                    `
                    UPDATE content
                    SET
                        theme = 'historia_militar',
                        type = 'podcast'
                    WHERE id = ?
                    `,
                    [row.id]
                );

                updated++;

                console.log(
                    `✔ Actualizado: ${row.title}`
                );
            }
        }

        console.log("");
        console.log(
            `🎉 Terminado. Actualizados: ${updated}`
        );

        process.exit(0);

    } catch (error) {
        console.error(
            "❌ Error:",
            error.message
        );

        process.exit(1);
    }
}

markPlaylistVideos();