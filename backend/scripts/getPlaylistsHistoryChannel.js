require("dotenv").config();

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL2_ID;

async function getAllPlaylists() {
  let playlists = [];
  let nextPageToken = null;

  do {
    const url =
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet` +
      `&channelId=${CHANNEL_ID}` +
      `&maxResults=50` +
      `&key=${API_KEY}` +
      (nextPageToken ? `&pageToken=${nextPageToken}` : "");

    const res = await fetch(url); // 👈 fetch nativo de Node 18+
    const data = await res.json();

    if (data.error) {
      console.error("YouTube API error:", data.error);
      return;
    }

    playlists.push(
      ...data.items.map(pl => ({
        id: pl.id,
        title: pl.snippet.title
      }))
    );

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  console.log(playlists);
}

getAllPlaylists();