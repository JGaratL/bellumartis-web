require("dotenv").config();

const slugify = require("slugify");
const db = require("../db");

const YOUTUBE_API_KEY =
    process.env.YOUTUBE_API_KEY;

const CHANNEL_ID =
    process.env.YOUTUBE_CHANNEL2_ID;


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

async function getUniqueSlug(baseSlug) {
    const cleanBase =
        (baseSlug || "").toString().trim() || "video";

    let candidate = cleanBase;
    let suffix = 2;

    while (true) {
        const [rows] = await db.query(
            `
            SELECT id
            FROM content
            WHERE slug = ?
            LIMIT 1
            `,
            [candidate]
        );

        if (!rows.length) {
            return candidate;
        }

        candidate = `${cleanBase}-${suffix}`;
        suffix += 1;
    }
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

    // quitar líneas formadas por hashtags
    cleaned = cleaned.replace(
        /^#.*$/gm,
        ""
    );

    // quitar hashtags sueltos
    cleaned = cleaned.replace(
        /#[\p{L}\p{N}_]+/gu,
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
        /libros/i,
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
// SYNC STATE
// -----------------------------------

async function getLastState() {
    const [rows] = await db.query(`
        SELECT * FROM sync_state WHERE id = 1
    `);

    return rows[0];
}

async function updateLastState(video) {
    await db.query(`
        UPDATE sync_state
        SET 
            last_video_published_at = ?,
            last_video_id = ?
        WHERE id = 1
    `, [
        new Date(video.snippet.publishedAt)
            .toISOString()
            .slice(0, 19)
            .replace("T", " "),
             video.snippet.resourceId.videoId
    ]);
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

async function fetchVideosPaginated(
    maxPages = 100
) {
    const uploadsPlaylistId = await fetchUploadsPlaylist();

    let allVideos = [];
    let nextPageToken = null;

    let pageCount = 0;

    do {
        console.log("📥 Cargando página...");

        if (++pageCount > maxPages) {
            console.log("🛑 Corte de seguridad activado");
            break;
        }

        const url =
            `https://www.googleapis.com/youtube/v3/playlistItems` +
            `?part=snippet,contentDetails` +
            `&playlistId=${uploadsPlaylistId}` +
            `&maxResults=50` +
            `&pageToken=${nextPageToken || ""}` +
            `&key=${YOUTUBE_API_KEY}`;

        const res = await fetch(url);

        // ❌ CONTROL HTTP
        if (!res.ok) {
            const text = await res.text();
            console.error("❌ Error YouTube API:");
            console.error(text);
            break;
        }

        // ⚠️ EVITAR CRASH HTML/XML
        const text = await res.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            console.error("❌ Respuesta no JSON (YouTube devolvió HTML):");
            console.error(text);
            break;
        }

        if (!data.items || data.items.length === 0) {
            console.log("⚠️ Sin más vídeos");
            break;
        }

        allVideos = allVideos.concat(data.items);

        nextPageToken = data.nextPageToken || null;

        console.log(`📦 Página cargada: ${data.items.length} vídeos`);

        if (!nextPageToken) {
            console.log("🏁 Última página alcanzada");
            break;
        }

        // 🧠 pequeña pausa anti rate limit
        await sleep(200);

    } while (true);
    console.log(`📚 Total vídeos obtenidos: ${allVideos.length}`);

    return allVideos;
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

    if (!res.ok) {
        const text = await res.text();
        console.error("❌ Error YouTube API (videos):", text);
        return {};
    }

    const text = await res.text();

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("❌ Respuesta no JSON (videos):", text);
        return {};
    }

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



    const theme = null;

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

    console.log("ID:", youtubeVideoId);

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
        return "skipped";
    }

    const baseSlug = slug(title) || `video-${youtubeVideoId}`;
    const uniqueSlug = await getUniqueSlug(baseSlug);

    const durationIso =
        durationMap[youtubeVideoId] || null;

    const durationSeconds =
        durationIso
            ? parseISODuration(durationIso)
            : null;


    // omitir shorts / vídeos cortos
    if (
        durationSeconds !== null &&
        durationSeconds < 180
    ) {
        console.log(
            "⏭️ Omitido (<3 min):",
            title
        );
        return;
    }

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
            uniqueSlug,
            description,
            theme,
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

    return "inserted";
}

// -----------------------------------
// MAIN
// -----------------------------------

async function main() {
    try {
        console.log(
            "📥 Obteniendo vídeos..."
        );

        const state = await getLastState();
        const checkpointVideoId =
            state?.last_video_id || null;
        const checkpointPublishedAt =
            state?.last_video_published_at || null;

        console.log("📌 Estado actual:", state);

        const videos = await fetchVideosPaginated(
            100
        );

        console.log("TOTAL VIDEOS:", videos.length);

        if (!videos.length) {
            console.log("⚠️ No hay vídeos para importar");
            process.exit(0);
            return;
        }

        const ids = videos.map(
            v =>
                v.snippet.resourceId
                    .videoId
        );

        let durationMap = {};

        for (let i = 0; i < ids.length; i += 50) {
            const batch = ids.slice(i, i + 50);

            const partial = await fetchVideoDetails(batch);

            durationMap = {
                ...durationMap,
                ...partial
            };

            await sleep(200); // anti rate limit
        }

        for (const video of videos) {
            if (
                checkpointVideoId &&
                video.snippet.resourceId.videoId === checkpointVideoId
            ) {
                console.log(
                    "🛑 Checkpoint alcanzado:",
                    checkpointVideoId
                );
                break;
            }

            if (
                !checkpointVideoId &&
                checkpointPublishedAt &&
                video.snippet.publishedAt === checkpointPublishedAt
            ) {
                console.log(
                    "🛑 Checkpoint por fecha alcanzado:",
                    checkpointPublishedAt
                );
                break;
            }

            try {
                await saveVideo(video, durationMap);
            } catch (err) {
                if (err?.code === "ER_DUP_ENTRY") {
                    console.log(
                        "⚠️ Duplicado inesperado, se omite y se continúa:",
                        video.snippet?.title || video.snippet?.resourceId?.videoId
                    );
                } else {
                    console.error(
                        "❌ Error procesando vídeo:",
                        video.snippet?.title || video.snippet?.resourceId?.videoId,
                        err
                    );
                }
            }

            await sleep(100);
        }

        if (videos[0]) {
            await updateLastState(videos[0]);
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
