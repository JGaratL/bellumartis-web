const db = require("../db");
const { aliases } = require("./guestAliases");

// =========================
// SLUG SAFE (Node-safe)
// =========================
function slugify(str) {
    return String(str)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

// =========================
// FLATTEN ALIASES → CANÓNICOS
// =========================
function extractCanonicals(aliases) {
    const set = new Set();

    for (const value of Object.values(aliases)) {
        if (Array.isArray(value)) {
            for (const v of value) {
                if (typeof v === "string") set.add(v);
            }
        } else if (typeof value === "string") {
            set.add(value);
        }
    }

    return [...set];
}

// =========================
// MAIN
// =========================
async function run() {
    let conn;

    try {
        console.log("🚀 CREANDO GUESTS CANÓNICOS");

        conn = await db.getConnection();

        const canonicalGuests = extractCanonicals(aliases);

        console.log("CANÓNICOS:", canonicalGuests.length);

        let inserted = 0;
        let skipped = 0;

        for (const name of canonicalGuests) {
            if (!name || typeof name !== "string") continue;

            const slug = slugify(name);

            // 👇 EVITA DUPLICADOS (CLAVE)
            const [exists] = await conn.execute(
                "SELECT id FROM guests WHERE slug = ? LIMIT 1",
                [slug]
            );

            if (exists.length > 0) {
                skipped++;
                continue;
            }

            await conn.execute(
                `
                INSERT INTO guests (name, slug, is_visible)
                VALUES (?, ?, 1)
                `,
                [name, slug]
            );

            inserted++;
            console.log("✔", name);
        }

        console.log("\n====================");
        console.log("INSERTADOS:", inserted);
        console.log("SKIPPED:", skipped);

    } catch (err) {
        console.error("ERROR:", err);
    } finally {
        if (conn) conn.release();
    }
}

run();