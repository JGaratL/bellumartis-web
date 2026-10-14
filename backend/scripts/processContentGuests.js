const db = require("../db");
const { extractStarGuests } = require("./guestPipeline");
const { isBlacklisted } = require("./blacklist");

// =========================
// MAIN PROCESS
// =========================
async function run() {
    let conn;

    try {
        console.log("🚀 PROCESANDO CONTENT → GUESTS");

        conn = await db.getConnection();

        const [rows] = await conn.execute(`
            SELECT id, title
            FROM content
            WHERE is_visible = 1
        `);

        console.log(`📦 Vídeos encontrados: ${rows.length}`);

        let processed = 0;

        for (const row of rows) {

            try {
                const guests = extractStarGuests(row.title || "");

                // 🔒 PASO CLAVE: evitar duplicados por vídeo
                const guestsInVideo = new Set();

                for (const g of guests) {
                    if (!g || g.trim().length < 2) continue;

                    const clean = g.trim();

                    if (isBlacklisted(clean)) {
                        console.log("🚫 BLOQUEADO:", clean);
                        continue;
                    }

                    guestsInVideo.add(clean);
                }

                // =========================
                // INSERT / LINK BD
                // =========================
                for (const name of guestsInVideo) {

                    // buscar guest
                    const [found] = await conn.execute(
                        "SELECT id FROM guests WHERE LOWER(name) = LOWER(?) LIMIT 1",
                        [name]
                    );

                    let guestId;

                    if (found.length === 0) {
                        const slug = name
                            .toLowerCase()
                            .replace(/\s+/g, "-")
                            .replace(/[^a-z0-9\-áéíóúñ]/gi, "");

                        const [insert] = await conn.execute(
                            "INSERT INTO guests (name, slug) VALUES (?, ?)",
                            [name, slug]
                        );

                        guestId = insert.insertId;
                    } else {
                        guestId = found[0].id;
                    }

                    // relación (content ↔ guest)
                    try {
                        await conn.execute(
                            "INSERT INTO content_guests (content_id, guest_id) VALUES (?, ?)",
                            [row.id, guestId]
                        );
                    } catch (err) {
                        if (err.code !== "ER_DUP_ENTRY") {
                            throw err;
                        }
                    }
                }

                processed++;

                if (processed % 50 === 0) {
                    console.log(`✔ Procesados: ${processed}/${rows.length}`);
                }

            } catch (err) {
                console.error(`❌ Error en vídeo ${row.id}:`, err.message);
            }
        }

        console.log("✅ FIN DEL PROCESO");
        console.log(`✔ Total procesados: ${processed}`);

    } catch (err) {
        console.error("FATAL ERROR:", err);
    } finally {
        if (conn) conn.release();
    }
}

run();