const db = require("../db");
const { extractGuests } = require("./guestPipeline");

// =========================
// MAIN BATCH PROCESS
// =========================

async function processAllContent() {
  let connection;

  try {
    console.log("🚀 Iniciando procesamiento de content...");

    // usamos conexión del pool o db.js
    connection = db;

    // 1. Traer todo el contenido
    const [rows] = await connection.execute(`
      SELECT id, title, description
      FROM content
      WHERE is_visible = 1
    `);

    console.log(`📦 Total registros: ${rows.length}`);

    let processed = 0;

    // 2. Procesar uno a uno
    for (const row of rows) {
      try {
        const text = `${row.title || ""} ${row.description || ""}`;

        const guests = extractGuests(text);

        for (const name of guests) {
          if (!name || name.trim().length < 2) continue;

          const cleanName = name.trim();

          // =========================
          // BUSCAR GUEST
          // =========================
          const [found] = await connection.execute(
            "SELECT id FROM guests WHERE LOWER(name) = LOWER(?) LIMIT 1",
            [cleanName]
          );

          let guestId;

          // =========================
          // CREAR SI NO EXISTE
          // =========================
          if (found.length === 0) {
            const slug = cleanName
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9\-áéíóúñ]/gi, "");

            const [insert] = await connection.execute(
              "INSERT INTO guests (name, slug) VALUES (?, ?)",
              [cleanName, slug]
            );

            guestId = insert.insertId;
          } else {
            guestId = found[0].id;
          }

          // =========================
          // INSERT RELATION (SAFE)
          // =========================
          try {
            await connection.execute(
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
        console.error(`❌ Error en content ID ${row.id}:`, err.message);
      }
    }

    console.log("✅ PROCESO TERMINADO");
    console.log(`✔ Total procesados: ${processed}`);

  } catch (err) {
    console.error("FATAL ERROR:", err);
  }
}

// ejecutar
processAllContent();