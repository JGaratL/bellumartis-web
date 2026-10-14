require("dotenv").config();
const db = require("../db");

const conflicts = [
    // =========================
    // GUERRAS MUNDIALES / SIGLO XX
    // =========================
    { name: "Primera Guerra Mundial", slug: "primera-guerra-mundial" },
    { name: "Segunda Guerra Mundial", slug: "segunda-guerra-mundial" },
    { name: "Guerra de Ucrania", slug: "guerra-de-ucrania" },
    { name: "Guerra Fría", slug: "guerra-fria" },

    // =========================
    // ESPAÑA / EUROPA OCCIDENTAL
    // =========================
    { name: "Guerra Civil Española", slug: "guerra-civil-espanola" },
    { name: "Guerra de la Independencia Española", slug: "guerra-de-la-independencia-espanola" },
    { name: "Reconquista", slug: "reconquista" },

    // =========================
    // EDAD MODERNA
    // =========================
    { name: "Guerra de los Cien Años", slug: "guerra-de-los-cien-anos" },
    { name: "Guerras de Italia", slug: "guerras-de-italia" },
    { name: "Flandes", slug: "flandes" },
    { name: "Batalla de Lepanto", slug: "batalla-de-lepanto" },
    { name: "Conquista de América", slug: "conquista-de-america" },
    { name: "Conquista de México", slug: "conquista-de-mexico" },

    // =========================
    // EDAD MEDIA
    // =========================
    { name: "Cruzadas", slug: "cruzadas" },
    { name: "Bizancio", slug: "bizancio" },

    // =========================
    // EDAD ANTIGUA
    // =========================
    { name: "Roma", slug: "roma" },
    { name: "Macedonia", slug: "macedonia" },
    { name: "Persia", slug: "persia" },
    { name: "Mesopotamia", slug: "mesopotamia" },

    // =========================
    // AMÉRICAS
    // =========================
    { name: "Guerra de Secesión", slug: "guerra-de-secesion" },
    { name: "Guerras de independencia hispanoamericanas", slug: "guerras-independencia-hispanoamericanas" },
];

async function run() {
    console.log("📡 Insertando conflicts...");

    let inserted = 0;
    let skipped = 0;

    for (const c of conflicts) {
        try {
            await db.execute(
                `
                INSERT INTO conflicts (name, slug)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE name = VALUES(name)
                `,
                [c.name, c.slug]
            );

            inserted++;
            console.log("✔", c.name);
        } catch (err) {
            skipped++;
            console.log("⚠️ error:", c.name, err.message);
        }
    }

    console.log("\n====================");
    console.log("📦 TOTAL:", conflicts.length);
    console.log("✔ INSERT/UPDATE:", inserted);
    console.log("⚠️ SKIPPED:", skipped);
    console.log("====================");

    process.exit(0);
}

run();