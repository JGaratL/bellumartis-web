require("dotenv").config();
const db = require("../db");

const API_KEY = process.env.YOUTUBE_API_KEY;

// -----------------------------------
// TODAS LAS PLAYLISTS
// -----------------------------------

const PLAYLISTS = [
    "PL4EAF6A03E61F4740",
    "PL57EC7AA3E429C9E0",
    "PLFFtscowOtCydYHQNBxNTOUP584e5D8VJ",
    "PLFFtscowOtCw1AeDPY7oLv83jG0fz7bMo",
    "PLFFtscowOtCxpM2CzeoCGSSqXmwExDeT8",
    "PLFFtscowOtCxnfWdgJHU9A1wM4DmpCHgw",
    "PLFFtscowOtCzKHs9InSw62_NIp3Lg5zmd",
    "PLFFtscowOtCxeG0uKcCmUcvW_kfDAtyuS",
    "PLFFtscowOtCyMiEtgjcfh-_NUuaSoV4LH",
    "PLFFtscowOtCyG4p3ItchyhrCW48M5BeSX",
    "PLFFtscowOtCxTjBmYjVyJcPsOlY1k0RaG",
    "PLFFtscowOtCz-MDSpxUU4-UsoU_sOErNw",
    "PLFFtscowOtCz35LmGKEBW4WwBHOyWcOXt",
    "PLFFtscowOtCydYtwLlmYWzVz-dtgbRqke",
    "PLFFtscowOtCxIRv8ryHBt0SEGCYqf56fZ",
    "PLFFtscowOtCyAZrKIJeX6TZ8zz323-1Er",
    "PLFFtscowOtCy6NQyo8S8z2pm7Xql7Hmkw",
    "PLFFtscowOtCztC5hQ-rRYp1nuaP6_cSoV",
    "PLFFtscowOtCzaxT4giEEGq1uF8PYjH7wd",
    "PLFFtscowOtCyJmZYBy4IPgLr2J6y2DHx3",
    "PLFFtscowOtCwpFI5CGWph2OUZJJdlhEUS",
    "PLFFtscowOtCxnRSvpWFVxpN3XXorF6aFK",
    "PLFFtscowOtCw_sHiJENTuDl-otUK10l1Y",
    "PLFFtscowOtCwZha-sKyP3Ya0LJ7YVt2nW",
    "PLFFtscowOtCyEsV6Trw9acYjm8btv_UB1",
    "PLFFtscowOtCyGX4nKPvnQmCcGw0i8NYdn",
    "PLFFtscowOtCx0j80jOp2Tm1uPC7gnIlwL",
    "PLFFtscowOtCyoi5aUcxwx9jtcUBtB5B2G",
    "PLFFtscowOtCwQYNwoB5grDhFLCYtAPccG",
    "PLFFtscowOtCw0HVRWnn4QXm32JgGuO6E_",
    "PLFFtscowOtCwfg1NF6WE-aJW7axoRPAkR",
    "PLFFtscowOtCxFHwtr6rv_Gh1O-0dYXYcw",
    "PLFFtscowOtCwJK2thYPNvatUvrlxVbIA7",
    "PLFFtscowOtCxmghi_lTuGPLSOrgSZhuwi",
    "PLFFtscowOtCzRj_FfTQ2AERPPo0UpSF77",
    "PLFFtscowOtCxfINZKH-MTdkjCK4vqzxd_",
    "PLFFtscowOtCyKKXPlvHoHGBCj3mjQvyUK",
    "PLFFtscowOtCzalPRn_Ypu_kY5k4fm8QiW",
    "PLFFtscowOtCxRn_fmYyhc5nrIhNDA0d-t",
    "PLFFtscowOtCxqayjaokIrHLzwc2WczI5E",
    "PLFFtscowOtCxC7ZSgaruwjZhGAdfdR8Mk",
    "PLFFtscowOtCxdYNmz9dIHTQBaEalK8FiA",
    "PLFFtscowOtCyOZR0mBj9GCK00il48qPdn",
    "PLFFtscowOtCzrcOdqbUGQ4MZK9Iqaw3fP",
    "PLFFtscowOtCz7_G9Rs_3az4xz0d7yWOJi",
    "PLFFtscowOtCy9fivZkAVAkyRlcvYk3aMa"
];

// -----------------------------------
// GET VIDEOS FROM PLAYLIST
// -----------------------------------

async function getPlaylistVideoIds(playlistId) {
    let videoIds = [];
    let nextPageToken = null;

    do {
        const url =
            `https://www.googleapis.com/youtube/v3/playlistItems` +
            `?part=contentDetails` +
            `&playlistId=${playlistId}` +
            `&maxResults=50` +
            `&pageToken=${nextPageToken || ""}` +
            `&key=${API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.items) {
            for (const item of data.items) {
                videoIds.push(
                    item.contentDetails.videoId
                );
            }
        }

        nextPageToken = data.nextPageToken || null;

    } while (nextPageToken);

    return videoIds;
}

// -----------------------------------
// MAIN
// -----------------------------------

async function main() {
    try {
        console.log("📥 Cargando playlists...");

        const allIds = new Set();

        for (const playlistId of PLAYLISTS) {
            console.log(
                `➡️ Procesando: ${playlistId}`
            );

            const ids =
                await getPlaylistVideoIds(
                    playlistId
                );

            ids.forEach(id => allIds.add(id));

            console.log(
                `   + ${ids.length} vídeos`
            );
        }

        const finalIds = [...allIds];

        console.log(
            `🎯 Total vídeos únicos: ${finalIds.length}`
        );

        const placeholders = finalIds
            .map(() => "?")
            .join(",");

        const [result] = await db.query(
            `
            UPDATE content
            SET theme = 'historia_militar'
            WHERE youtube_video_id IN (${placeholders})
            `,
            finalIds
        );

        console.log(
            `✅ Actualizados: ${result.affectedRows}`
        );

        process.exit(0);

    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

main();