const fs = require("fs");
const path = require("path");

// Node 18+ ya tiene fetch global

const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
    console.error("❌ Falta YOUTUBE_API_KEY en el entorno");
    process.exit(1);
}

const CHANNELS = [
    "@BELLUMARTISHISTORIAMILITAR",
    "@BELLUMARTISACTUALIDADMILITAR",
];

const MAX_RESULTS_PER_CHANNEL = 25;

async function getChannelId(handle) {
    const url =
        `https://www.googleapis.com/youtube/v3/search` +
        `?part=snippet&type=channel&q=${encodeURIComponent(handle.replace("@", ""))}` +
        `&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || !data.items.length) {
        throw new Error("No se encontró el canal: " + handle);
    }

    return data.items[0].snippet.channelId;
}

async function getLatestVideoIds(channelId) {
    const url =
        `https://www.googleapis.com/youtube/v3/search` +
        `?key=${API_KEY}` +
        `&channelId=${channelId}` +
        `&part=snippet,id` +
        `&order=date` +
        `&maxResults=${MAX_RESULTS_PER_CHANNEL}`;

    const res = await fetch(url);
    const data = await res.json();

    return (data.items || [])
        .filter(item => item.id.kind === "youtube#video")
        .map(item => item.id.videoId);
}

async function getVideosDetails(videoIds) {
    if (!videoIds.length) return [];

    const url =
        `https://www.googleapis.com/youtube/v3/videos` +
        `?key=${API_KEY}` +
        `&part=snippet` +
        `&id=${videoIds.join(",")}`;

    const res = await fetch(url);
    const data = await res.json();

    return (data.items || []).map(v => ({
        videoId: v.id,
        title: v.snippet.title,
        description: v.snippet.description,
        tags: v.snippet.tags || [],
        publishedAt: v.snippet.publishedAt,
        channelTitle: v.snippet.channelTitle,
    }));
}

async function main() {
    console.log("=================================");
    console.log("FETCH YOUTUBE VIDEOS START");
    console.log("=================================");

    const map = new Map();

    for (const handle of CHANNELS) {
        console.log("📺 Canal:", handle);

        const channelId = await getChannelId(handle);
        const videoIds = await getLatestVideoIds(channelId);
        const videos = await getVideosDetails(videoIds);

        for (const v of videos) {
            if (!map.has(v.videoId)) {
                map.set(v.videoId, v);
            }
        }
    }

    const result = Array.from(map.values()).sort(
        (a, b) =>
            new Date(b.publishedAt) - new Date(a.publishedAt)
    );

    const outputPath = path.resolve(
        __dirname,
        "../data/youtube-videos.json"
    );

    fs.writeFileSync(
        outputPath,
        JSON.stringify(result, null, 2),
        "utf-8"
    );

    console.log("=================================");
    console.log("OK - vídeos guardados:", result.length);
    console.log(outputPath);
    console.log("=================================");
}

main().catch(err => {
    console.error("ERROR:", err.message);
});