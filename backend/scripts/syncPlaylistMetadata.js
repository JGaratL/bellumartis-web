require("dotenv").config();
const db = require("../db");

const playlistMetadata = require("../data/playlistMetadata");

// cache simple para conflictos
async function findConflictId(name, cache) {
    if (!name) return null;

    if (cache[name] !== undefined) return cache[name];

    const [rows] = await db.execute(
        `SELECT id FROM conflicts WHERE name = ? LIMIT 1`,
        [name]
    );

    const id = rows.length ? rows[0].id : null;
    cache[name] = id;

    return id;
}

async function sync() {
    console.log("📡 Sync playlistMetadata → playlists");

    const conflictCache = {};

    let total = 0;
    let updated = 0;

    let changedPeriod = 0;
    let changedSubperiod = 0;
    let changedTheme = 0;
    let changedConflict = 0;

    for (const [youtube_playlist_id, item] of Object.entries(playlistMetadata)) {
        total++;

        const [rows] = await db.execute(
            `SELECT id, period, subperiod_id, theme, conflict_id
             FROM playlists
             WHERE youtube_playlist_id = ?`,
            [youtube_playlist_id]
        );

        if (rows.length === 0) {
            console.log("⚠️ No existe playlist:", youtube_playlist_id);
            continue;
        }

        const playlist = rows[0];

        const conflictId =
            item.conflicts
                ? await findConflictId(item.conflicts, conflictCache)
                : null;

        const newPeriod = item.period || null;
        const newSubperiod = item.subperiod || null;
        const newTheme = item.theme || null;

        let changed = false;

        if (newPeriod !== playlist.period) {
            changedPeriod++;
            changed = true;
        }

        if (newTheme !== playlist.theme) {
            changedTheme++;
            changed = true;
        }

        if (conflictId !== playlist.conflict_id) {
            changedConflict++;
            changed = true;
        }

        // subperiod ahora va por ID real (subperiods table)
        let subperiodId = null;

        if (newSubperiod) {
            const [sp] = await db.execute(
                `SELECT id FROM subperiods WHERE name = ? LIMIT 1`,
                [newSubperiod]
            );

            subperiodId = sp.length ? sp[0].id : null;

            if (subperiodId !== playlist.subperiod_id) {
                changedSubperiod++;
                changed = true;
            }
        }

        await db.execute(
            `
            UPDATE playlists
            SET 
                period = ?,
                subperiod_id = ?,
                theme = ?,
                conflict_id = ?
            WHERE id = ?
            `,
            [
                newPeriod,
                subperiodId,
                newTheme,
                conflictId,
                playlist.id,
            ]
        );

        if (changed) updated++;

        console.log(
            `✔ ${youtube_playlist_id}
   period: ${newPeriod || "-"}
   subperiod: ${newSubperiod || "-"}
   theme: ${newTheme || "-"}
   conflict: ${item.conflicts || "-"}`
        );
    }

    console.log("\n====================");
    console.log("📦 TOTAL:", total);
    console.log("✔ UPDATED:", updated);
    console.log("📊 period:", changedPeriod);
    console.log("📊 subperiod:", changedSubperiod);
    console.log("📊 theme:", changedTheme);
    console.log("📊 conflict:", changedConflict);
    console.log("====================");

    process.exit(0);
}

sync();