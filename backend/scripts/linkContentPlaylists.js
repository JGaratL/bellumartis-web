require("dotenv").config();
const { google } = require("googleapis");
const db = require("../db");

const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
});

async function getPlaylists() {
    const [rows] = await db.execute(
        `SELECT id, youtube_playlist_id, name FROM playlists`
    );
    return rows;
}

async function getPlaylistVideos(playlistId) {
    let results = [];
    let pageToken = null;

    do {
        const res = await youtube.playlistItems.list({
            part: ["snippet"],
            playlistId,
            maxResults: 50,
            pageToken,
        });

        for (const item of res.data.items || []) {
            const videoId = item.snippet?.resourceId?.videoId;
            if (videoId) {
                results.push(videoId);
            }
        }

        pageToken = res.data.nextPageToken;
    } while (pageToken);

    return results;
}

async function findContentByYoutubeId(videoId) {
    const [rows] = await db.execute(
        `SELECT id FROM content WHERE youtube_video_id = ? LIMIT 1`,
        [videoId]
    );

    return rows[0] || null;
}

async function linkContentPlaylist(contentId, playlistId) {
    await db.execute(
        `
        INSERT IGNORE INTO content_playlists (content_id, playlist_id)
        VALUES (?, ?)
        `,
        [contentId, playlistId]
    );
}

async function run() {
    console.log("📡 Linking playlists → content");

    const playlists = await getPlaylists();

    for (const playlist of playlists) {
        console.log(`📂 ${playlist.name}`);

        const videos = await getPlaylistVideos(
            playlist.youtube_playlist_id
        );

        for (const videoId of videos) {
            const content = await findContentByYoutubeId(videoId);

            if (!content) continue;

            await linkContentPlaylist(
                content.id,
                playlist.id
            );

            console.log(`✔ ${videoId}`);
        }
    }

    console.log("✅ DONE");
    process.exit(0);
}

run();