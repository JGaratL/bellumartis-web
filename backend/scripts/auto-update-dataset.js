const fs = require("fs");
const path = require("path");

const learningPath = path.resolve(__dirname, "../data/learning-log.json");

const guestsPath = path.resolve(__dirname, "../data/guests.js");
const unitsPath = path.resolve(__dirname, "../data/units.js");
const conflictsPath = path.resolve(__dirname, "../data/conflicts.js");
const topicsPath = path.resolve(__dirname, "../data/topics.js");

/* =========================================================
   LOAD LEARNING DATA
   ========================================================= */

function loadLearning() {
    return JSON.parse(fs.readFileSync(learningPath, "utf-8"));
}

/* =========================================================
   SAFE NORMALIZER
   ========================================================= */

function normalize(text = "") {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/* =========================================================
   ADD UNIQUE VALUE HELPER
   ========================================================= */

function addUnique(array, value) {
    if (!array.includes(value)) {
        array.push(value);
    }
}

/* =========================================================
   GENERATE SUGGESTIONS
   ========================================================= */

function buildSuggestions(learning) {
    const suggestions = {
        guests: {},
        units: {},
        conflicts: {},
        topics: {},
    };

    // -------------------------
    // GUESTS
    // -------------------------
    for (const g of learning.guests || []) {
        if (!suggestions.guests[g.name]) {
            suggestions.guests[g.name] = new Set();
        }

        for (const alias of g.matchedAliases || []) {
            suggestions.guests[g.name].add(alias);
        }
    }

    return suggestions;
}

/* =========================================================
   APPLY TO FILE
   ========================================================= */

function updateFile(filePath, updates, type) {
    let content = fs.readFileSync(filePath, "utf-8");

    for (const [name, aliasesSet] of Object.entries(updates)) {
        const aliases = Array.from(aliasesSet);

        const block = new RegExp(
            `name:\\s*["']${name}["'][\\s\\S]*?aliases:\\s*\\[(.*?)\\]`,
            "m"
        );

        const match = content.match(block);

        if (!match) {
            console.log(`⚠️ No encontrado en ${type}: ${name}`);
            continue;
        }

        console.log(`✔ Procesando ${type}: ${name}`);

        let aliasString = match[1];

        for (const alias of aliases) {
            const clean = `"${alias}"`;

            if (!aliasString.includes(clean)) {
                aliasString += `,\n            ${clean}`;
            }
        }

        content = content.replace(match[0], (full) =>
            full.replace(match[1], aliasString)
        );
    }

    fs.writeFileSync(filePath, content, "utf-8");
}

/* =========================================================
   MAIN EXECUTION
   ========================================================= */

function run() {
    const learning = loadLearning();

    console.log("=================================");
    console.log("AUTO-UPDATE DATASET START");
    console.log("=================================");

    const suggestions = buildSuggestions(learning);

    // 🔥 GUESTS
    updateFile(guestsPath, suggestions.guests, "GUESTS");

    // (en el futuro añadiremos units/conflicts/topics igual)

    console.log("=================================");
    console.log("DONE");
    console.log("=================================");
}

run();