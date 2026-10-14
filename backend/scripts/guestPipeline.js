const nlp = require("compromise");
const db = require("../db");

// =========================
// LISTA FIABLE DE INVITADOS (BOOST)
// =========================

const KNOWN_GUESTS = [
  "Mariano López de Miguel",
  "José María Rodríguez",
  "Jorge Gómez",
  "Javier Neira",
  "Susana Álvarez Otero",
  "Francisco García Campa",
  "Rafael Sempau",
  "José Luis Magro",
  "José Manuel Cueto González",
  "Mariano Méndez Rudilla",
  "Juan Rodríguez Garat",
  "Francisco Rubio Damián",
  "Miguel Winkels",
  "Javier Sánchez García",
  "Steven Ceglia",
  "Ignacio Cembrero",
  "Martín Tuitero",
  "Juan José Mateos",
  "Juan Carlos Pérez Álvarez",
  "Adrien Nonjon",
  "Javier Benegas"
];

// =========================
// BLACKLIST (ruido)
// =========================

const BLACKLIST = [
  "guerra", "batallones", "economía", "universidad",
  "ejército", "operaciones", "isla", "estrecho",
  "abril", "días", "curso", "defensa",
  "youtube", "bellumartis", "frente", "batalla",
  "análisis", "perspectiva", "histórico", "historia",
  "imágenes", "exclusiva", "entrevista",
  "reacción", "actividad", "introducción",
  "noticias", "debate", "cierre", "audiencia",
  "misiles", "declaraciones", "perfil",
  "presentación", "exclusiva", "imágenes", "reacción"
];

// =========================
// NORMALIZACIÓN
// =========================

function normalize(str = "") {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// =========================
// REGLA: SIN INVITADOS
// =========================

function hasNoGuestsInTitle(title = "") {
  const t = title.toLowerCase();
  return t.includes("hablamos");
}

// =========================
// VALIDACIÓN FINAL
// =========================

function isValidPerson(name) {
  if (!name) return false;

  const n = normalize(name);

  if (BLACKLIST.some(w => n.includes(w))) return false;

  if (n.length < 5 || n.length > 60) return false;

  const parts = n.split(" ");
  if (parts.length < 2 || parts.length > 6) return false;

  if (/^(de|del|la|el|y|en|con)$/i.test(n)) return false;

  // debe parecer persona real
  if (!/[a-záéíóúñ].+\s+[a-záéíóúñ]/i.test(n)) return false;

  return true;
}

// =========================
// EXTRACCIÓN
// =========================

function extractGuests(text) {
  if (!text) return [];

  const candidates = new Set();

  // =====================================================
  // 1. ASTERISCOS (*INVITADO*) → PRIORIDAD TOTAL
  // =====================================================

  const starMatches = text.matchAll(/\*([^*]+)\*/g);

  for (const m of starMatches) {
    const name = m[1].trim();
    if (isValidPerson(name)) candidates.add(name);
  }

  if (candidates.size > 0) {
    return [...candidates];
  }

  // =====================================================
  // 2. MATCH CONOCIDOS (BOOST FUERTE)
  // =====================================================

  for (const known of KNOWN_GUESTS) {
    if (text.toLowerCase().includes(known.toLowerCase())) {
      candidates.add(known);
    }
  }

  // =====================================================
  // 3. NLP (compromise)
  // =====================================================

  const doc = nlp(text);

  doc.people().out("array").forEach(p => {
    const clean = p.trim().replace(/[,.:;]+$/g, "");
    if (isValidPerson(clean)) candidates.add(clean);
  });

  // =====================================================
  // 4. REGEX CONTROLADO
  // =====================================================

  const patterns = [
    /con\s+([A-ZÁÉÍÓÚÑ][^,.]+)/gi,
    /con la participación de\s+([A-ZÁÉÍÓÚÑ][^,.]+)/gi,
    /gracias a\s+([A-ZÁÉÍÓÚÑ][^,.]+)/gi
  ];

  for (const regex of patterns) {
    for (const m of text.matchAll(regex)) {
      if (!m[1]) continue;

      const name = m[1].trim();
      if (isValidPerson(name)) candidates.add(name);
    }
  }

  return [...candidates];
}

// =========================
// MAIN
// =========================

async function run() {
  let conn;

  try {
    console.log("🚀 GUEST PIPELINE (FINAL LIMPIO)\n");

    conn = await db.getConnection();

    const [rows] = await conn.execute(`
      SELECT id, title, description
      FROM content
      WHERE is_visible = 1
      LIMIT 100
    `);

    for (const row of rows) {
      const text = `${row.title || ""} ${row.description || ""}`;

      if (hasNoGuestsInTitle(row.title)) {
        console.log("\n----------------------");
        console.log("ID:", row.id);
        console.log("TITLE:", row.title);
        console.log("GUESTS: [] (HABLAMOS)");
        continue;
      }

      const guests = extractGuests(text);

      if (guests.length > 0) {
        console.log("\n----------------------");
        console.log("ID:", row.id);
        console.log("TITLE:", row.title);
        console.log("GUESTS:", guests);
      }
    }

    console.log("\n✅ FIN PIPELINE");

  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    if (conn) conn.release(); // importante: pool-safe
  }
}

run();