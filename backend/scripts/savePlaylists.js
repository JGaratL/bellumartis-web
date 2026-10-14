require("dotenv").config();
const { google } = require("googleapis");
const db = require("../db");

const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
});

const CHANNEL_ID = "UCTtIr7Q_mz1QkzbZc0RWUrw";

// slug simple
function slugify(text = "") {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, "-")
        .trim();
}

async function getPlaylists() {
    let results = [];
    let pageToken = null;

    do {
        const res = await youtube.playlists.list({
            part: ["snippet"],
            channelId: CHANNEL_ID,
            maxResults: 50,
            pageToken,
        });

        for (const p of res.data.items || []) {
            results.push({
                youtube_playlist_id: p.id,
                name: p.snippet.title,
                slug: slugify(p.snippet.title),
            });
        }

        pageToken = res.data.nextPageToken;
    } while (pageToken);

    return results;
}

async function savePlaylist(p) {
    await db.execute(
        `
        INSERT INTO playlists (youtube_playlist_id, name, slug)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            slug = VALUES(slug)
        `,
        [p.youtube_playlist_id, p.name, p.slug]
    );
}

async function run() {
    console.log("📡 Obteniendo playlists...");

    const playlists = await getPlaylists();

    console.log(`📦 Encontradas: ${playlists.length}`);

    for (const p of playlists) {
        await savePlaylist(p);
        console.log("✔ Guardada:", p.name);
    }

    console.log("✅ DONE");
    process.exit(0);
}

run();