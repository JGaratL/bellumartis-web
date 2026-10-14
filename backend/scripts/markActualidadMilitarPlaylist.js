require("dotenv").config();
const db = require("../db");

const API_KEY = process.env.YOUTUBE_API_KEY;

const PLAYLIST_ID =
    "PLFFtscowOtCxwhZLhkPt0y_0zqoM3PfdZ";

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

async function markActualidadMilitar() {
    try {
        console.log(
            "📥 Obteniendo vídeos de la playlist..."
        );

        const playlistIds =
            await getPlaylistVideoIds();

        console.log(
            `📺 Vídeos en playlist: ${playlistIds.length}`
        );

        const placeholders = playlistIds
            .map(() => "?")
            .join(",");

        const [result] = await db.query(
            `
            UPDATE content
            SET theme = 'actualidad_militar'
            WHERE youtube_video_id IN (${placeholders})
            `,
            playlistIds
        );

        console.log(
            `✅ Actualizados: ${result.affectedRows}`
        );

        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

markActualidadMilitar();