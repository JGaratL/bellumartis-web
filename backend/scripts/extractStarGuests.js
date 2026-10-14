const db = require("../db");
const { isBlacklisted } = require("./blacklist");

// =========================
// EXTRACTOR
// =========================
function extractStarGuests(title = "") {
    const matches = title.matchAll(/\*([^*]+)\*/g);

    const guests = [];

    for (const m of matches) {
        let name = m[1]
            .trim()
            .replace(/[,.:;]+$/g, "")
            .replace(/\s+/g, " ");

        if (name.length < 3) continue;
        if (name.toLowerCase().includes("bellum")) continue;

        // Separar invitados múltiples:
        // "José Soto Chica y Yeyo Balbás"
        // "Antonio Gómez, David Nievas, Félix Lancho"
        const people = name
            .split(/\s+y\s+|,/i)
            .map(x => x.trim())
            .filter(Boolean);

        guests.push(...people);
    }

    return guests;
}

// =========================
// MAIN
// =========================
async function run() {
    let conn;

    try {
        console.log("🚀 EXTRAYENDO INVITADOS");

        conn = await db.getConnection();

        const [rows] = await conn.execute(`
            SELECT id, title
            FROM content
            WHERE is_visible = 1
        `);

        const allGuests = new Set();

        for (const row of rows) {
            const guests = extractStarGuests(row.title || "");

            for (const g of guests) {
                if (isBlacklisted(g)) {
                    console.log("🚫 BLOQUEADO:", g);
                    continue;
                }

                allGuests.add(g);
            }
        }

        const result = [...allGuests];

        console.log("\n==================");
        console.log("TOTAL:", result.length);

        console.log(JSON.stringify(result, null, 2));

    } catch (err) {
        console.error("ERROR:", err);
    } finally {
        if (conn) conn.release();
    }
}

run();