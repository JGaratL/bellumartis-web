const db = require("../db");
const { aliases } = require("./guestAliases");

// =========================
// NORMALIZADOR ROBUSTO
// =========================
function normalize(str) {
    return String(str)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// =========================
// PREPROCESAR ALIASES
// =========================
const aliasMap = Object.entries(aliases).map(([alias, canonical]) => ({
    aliasNorm: normalize(alias),
    canonical: Array.isArray(canonical) ? canonical : [canonical]
}));

// =========================
// MATCHING INTELIGENTE
// =========================
function findMatches(title) {
    const t = normalize(title);

    const matches = new Set();

    for (const entry of aliasMap) {
        if (t.includes(entry.aliasNorm)) {
            entry.canonical.forEach(c => matches.add(c));
        }
    }

    return [...matches];
}

// =========================
// MAIN
// =========================
async function run() {
    let conn;

    try {
        console.log("🚀 LINKING v2 (ROBUST)");

        conn = await db.getConnection();

        const [rows] = await conn.execute(`
            SELECT id, title
            FROM content
            WHERE is_visible = 1
        `);

        let linked = 0;

        for (const row of rows) {

            const canonicals = findMatches(row.title || "");

            if (canonicals.length === 0) continue;

            for (const canonical of canonicals) {

                const [guest] = await conn.execute(
                    "SELECT id FROM guests WHERE name = ? LIMIT 1",
                    [canonical]
                );

                if (!guest.length) continue;

                try {
                    await conn.execute(
                        `
                        INSERT INTO content_guests (content_id, guest_id)
                        VALUES (?, ?)
                        `,
                        [row.id, guest[0].id]
                    );

                    linked++;

                } catch (err) {
                    if (err.code !== "ER_DUP_ENTRY") throw err;
                }
            }
        }

        console.log("✅ DONE");
        console.log("RELACIONES:", linked);

    } catch (err) {
        console.error(err);
    } finally {
        if (conn) conn.release();
    }
}

run();