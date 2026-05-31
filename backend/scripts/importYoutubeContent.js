require("dotenv").config();

const slugify = require("slugify");
const db = require("../db");

const YOUTUBE_API_KEY =
    process.env.YOUTUBE_API_KEY;

const CHANNEL_ID =
    process.env.YOUTUBE_CHANNEL_ID;

const MAX_RESULTS = 5;

// -----------------------------------
// HELPERS
// -----------------------------------

function sleep(ms) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}

function slug(text = "") {
    return slugify(text, {
        lower: true,
        strict: true,
        locale: "es",
        trim: true,
    });
}

function detectType(title, description) {
    const text =
        `${title} ${description}`.toLowerCase();

    return text.includes("podcast")
        ? "podcast"
        : "video";
}

function containsCajaDeTrovadores(
    title,
    description
) {
    const text =
        `${title} ${description}`.toLowerCase();

    return text.includes(
        "la caja de trovadores"
    );
}

function cleanDescription(text = "") {
    if (!text) return null;

    let cleaned = text;

    // quitar urls
    cleaned = cleaned.replace(
        /https?:\/\/\S+/gi,
        " "
    );

    // quitar emojis / iconos unicode
    cleaned = cleaned.replace(
        /[\p{Extended_Pictographic}]/gu,
        " "
    );

    // quitar líneas basura típicas
    const bannedPatterns = [
        /patreon/i,
        /paypal/i,
        /bizum/i,
        /instagram/i,
        /twitter/i,
        /\bx\b/i,
        /suscr[ií]bete/i,
        /síguenos/i,
        /codigo descuento/i,
        /grupo?eando/i,
        /compra en amazon/i,
        /privacidad/i,
        /franciscogarciacampa/i,
        /bellumartis26/i,
    ];

    const lines = cleaned
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .filter(line => {
            return !bannedPatterns.some(
                pattern =>
                    pattern.test(line)
            );
        });

    cleaned = lines.join("\n");

    // quitar separadores -----
    cleaned = cleaned.replace(
        /[-_]{3,}/g,
        " "
    );

    // espacios raros
    cleaned = cleaned.replace(
        /\s+/g,
        " "
    );

    cleaned = cleaned.trim();

    if (!cleaned.length) {
        return null;
    }

    return cleaned;
}

function parseISODuration(duration) {
    const match =
        duration.match(
            /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
        );

    if (!match) return null;

    const hours =
        parseInt(match[1] || 0);
    const minutes =
        parseInt(match[2] || 0);
    const seconds =
        parseInt(match[3] || 0);

    return (
        hours * 3600 +
        minutes * 60 +
        seconds
    );
}

// -----------------------------------
// YOUTUBE API
// -----------------------------------

async function fetchUploadsPlaylist() {
    const url =
        `https://www.googleapis.com/youtube/v3/channels` +
        `?part=contentDetails` +
        `&id=${CHANNEL_ID}` +
        `&key=${YOUTUBE_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    console.log(
        "\nDEBUG CHANNEL RESPONSE:\n",
        JSON.stringify(data, null, 2)
    );

    if (!data.items?.length) {
        throw new Error(
            "No se encontró el canal. Revisa YOUTUBE_CHANNEL_ID o YOUTUBE_API_KEY"
        );
    }

    return data.items[0]
        .contentDetails.relatedPlaylists
        .uploads;
}

async function fetchVideos() {
    const uploadsPlaylistId =
        await fetchUploadsPlaylist();

    const url =
        `https://www.googleapis.com/youtube/v3/playlistItems` +
        `?part=snippet,contentDetails` +
        `&playlistId=${uploadsPlaylistId}` +
        `&maxResults=${MAX_RESULTS}` +
        `&key=${YOUTUBE_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    return data.items;
}

async function fetchVideoDetails(videoIds) {
    if (!videoIds || videoIds.length === 0) {
        return {};
    }

    const url =
        `https://www.googleapis.com/youtube/v3/videos` +
        `?part=contentDetails` +
        `&id=${videoIds.join(",")}` +
        `&key=${YOUTUBE_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    console.log(
        "\nDEBUG VIDEO DETAILS:",
        JSON.stringify(data, null, 2)
    );

    const map = {};

    if (!data.items) return map;

    for (const item of data.items) {
        if (
            item?.id &&
            item?.contentDetails?.duration
        ) {
            map[item.id] =
                item.contentDetails.duration;
        }
    }

    return map;
}

// -----------------------------------
// INSERT
// -----------------------------------

async function saveVideo(video, durationMap) {
    const snippet = video.snippet;

    const title =
        snippet.title?.trim();

    const description =
        cleanDescription(
            snippet.description || ""
        );

    if (
        containsCajaDeTrovadores(
            title,
            description || ""
        )
    ) {
        console.log(
            "⏭️ Omitido (Caja de Trovadores):",
            title
        );
        return;
    }

    const youtubeVideoId =
        snippet.resourceId.videoId;

    // evitar duplicados
    const [existing] =
        await db.query(
            `
            SELECT id
            FROM content
            WHERE youtube_video_id = ?
            LIMIT 1
        `,
            [youtubeVideoId]
        );

    if (existing.length) {
        console.log(
            "⚠️ Ya existe:",
            title
        );
        return;
    }

    const durationIso =
        durationMap[youtubeVideoId] || null;

    const durationSeconds =
        durationIso
            ? parseISODuration(durationIso)
            : null;

    const contentType =
        detectType(
            title,
            description || ""
        );

    await db.query(
        `
        INSERT INTO content (
            title,
            slug,
            description,
            theme,
            type,
            source,
            source_url,
            youtube_video_id,
            thumbnail_url,
            published_at,
            duration_seconds,
            period_id
        )
        VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?
        )
    `,
        [
            title,
            slug(title),
            description,
            null, // theme
            contentType,
            "youtube",
            `https://youtube.com/watch?v=${youtubeVideoId}`,
            youtubeVideoId,
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium
                ?.url ||
            snippet.thumbnails
                ?.default?.url ||
            null,
            new Date(
                snippet.publishedAt
            ),
            durationSeconds,
            null, // period_id
        ]
    );

    console.log(
        "✅ Insertado:",
        title
    );
}

// -----------------------------------
// MAIN
// -----------------------------------

async function main() {
    try {
        console.log(
            "📥 Obteniendo vídeos..."
        );

        const videos =
            await fetchVideos();

        const ids = videos.map(
            v =>
                v.snippet.resourceId
                    .videoId
        );

        const durationMap =
            await fetchVideoDetails(
                ids
            );

        for (const video of videos) {
            await saveVideo(
                video,
                durationMap
            );

            await sleep(100);
        }

        console.log(
            "\n🎉 Importación terminada"
        );

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();