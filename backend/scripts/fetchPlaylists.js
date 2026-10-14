require("dotenv").config();
const { google } = require("googleapis");

const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
});

// 👉 TU CANAL YA FIJO
const CHANNEL_ID = "UCTtIr7Q_mz1QkzbZc0RWUrw";

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

        const items = res.data.items || [];

        for (const p of items) {
            results.push({
                youtube_id: p.id,
                title: p.snippet.title,
            });
        }

        pageToken = res.data.nextPageToken;
    } while (pageToken);

    return results;
}

async function run() {
    const playlists = await getPlaylists();

    console.log("Playlists encontradas:", playlists.length);
    console.log(playlists);
}

run();