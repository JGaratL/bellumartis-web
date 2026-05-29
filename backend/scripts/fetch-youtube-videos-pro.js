const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

require("dotenv").config();

const fs = require("fs");
const path = require("path");

const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
    console.error("❌ Falta YOUTUBE_API_KEY");
    process.exit(1);
}

const CHANNELS = [
    "@BELLUMARTISHISTORIAMILITAR",
    "@BELLUMARTISACTUALIDADMILITAR",
];

const DB_PATH = path.resolve(__dirname, "../data/youtube-videos.json");

const STATE_PATH = path.resolve(__dirname, "../data/youtube-state.json");

function loadState() {
    if (!fs.existsSync(STATE_PATH)) {
        return { lastPublishedAt: null };
    }
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
}

function saveState(state) {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function loadDB() {
    if (!fs.existsSync(DB_PATH)) return [];
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

async function getChannelId(handle) {
    const url =
        `https://www.googleapis.com/youtube/v3/search` +
        `?part=snippet&type=channel&q=${encodeURIComponent(handle.replace("@", ""))}` +
        `&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    return data.items?.[0]?.snippet?.channelId;
}

async function fetchVideos(channelId, publishedAfter) {
    let url =
        `https://www.googleapis.com/youtube/v3/search` +
        `?key=${API_KEY}` +
        `&channelId=${channelId}` +
        `&part=snippet,id` +
        `&order=date` +
        `&maxResults=25`;

    if (publishedAfter) {
        url += `&publishedAfter=${publishedAfter}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    const ids = (data.items || [])
        .filter(v => v.id.kind === "youtube#video")
        .map(v => v.id.videoId);

    if (!ids.length) return [];

    const detailUrl =
        `https://www.googleapis.com/youtube/v3/videos` +
        `?key=${API_KEY}` +
        `&part=snippet` +
        `&id=${ids.join(",")}`;

    const res2 = await fetch(detailUrl);
    const data2 = await res2.json();

    return (data2.items || []).map(v => ({
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
    console.log("PRO YOUTUBE FETCH START");
    console.log("=================================");

    const state = loadState();
    const db = loadDB();

    const map = new Map();

    // cargar lo ya existente
    for (const v of db) {
        map.set(v.videoId, v);
    }

    let newestDate = state.lastPublishedAt;

    for (const handle of CHANNELS) {
        console.log("📺", handle);

        const channelId = await getChannelId(handle);

        const videos = await fetchVideos(
            channelId,
            state.lastPublishedAt
        );

        for (const v of videos) {
            map.set(v.videoId, v);

            if (!newestDate || v.publishedAt > newestDate) {
                newestDate = v.publishedAt;
            }
        }
    }

    const finalData = Array.from(map.values()).sort(
        (a, b) =>
            new Date(b.publishedAt) - new Date(a.publishedAt)
    );

    fs.writeFileSync(DB_PATH, JSON.stringify(finalData, null, 2));

    if (newestDate) {
        saveState({ lastPublishedAt: newestDate });
    }

    console.log("=================================");
    console.log("OK videos:", finalData.length);
    console.log("new state:", newestDate);
    console.log("=================================");
}

main().catch(err => {
    console.error("ERROR:", err.message);
});