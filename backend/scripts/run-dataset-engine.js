require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { classifyContent } = require("../services/classifier");

// ==============================
// PATHS
// ==============================

const VIDEOS_PATH = path.resolve(__dirname, "../data/youtube-videos.json");
const LEARNING_PATH = path.resolve(__dirname, "../data/learning-log.json");
const OUTPUT_PATH = path.resolve(__dirname, "../data/dataset-suggestions.json");

// dataset actual
const guests = require("../data/guests");
const units = require("../data/units");
const conflicts = require("../data/conflicts");
const topics = require("../data/topics");

// ==============================

function loadJSON(file, fallback) {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
}

// ==============================

function addUnique(arr, value) {
    if (!arr.includes(value)) arr.push(value);
}

// ==============================

function main() {
    console.log("=================================");
    console.log("🚀 DATASET ENGINE START");
    console.log("=================================");

    const videos = loadJSON(VIDEOS_PATH, []);
    const learning = loadJSON(LEARNING_PATH, {
        guests: [],
    });

    const suggestions = {
        guests: [],
        units: [],
        conflicts: [],
        topics: [],
    };

    const knownGuests = new Set(guests.map(g => g.name));
    const knownUnits = new Set(units.map(u => u.name));
    const knownConflicts = new Set(conflicts.map(c => c.name));
    const knownTopics = new Set(topics.map(t => t.name));

    for (const video of videos) {
        const result = classifyContent(
            video.title,
            video.description,
            video.tags,
            { learn: true }
        );

        // =========================
        // GUESTS
        // =========================
        for (const g of result.guests) {
            if (!knownGuests.has(g)) {
                addUnique(suggestions.guests, g);
            }
        }

        // =========================
        // UNITS
        // =========================
        for (const u of result.units) {
            if (!knownUnits.has(u)) {
                addUnique(suggestions.units, u);
            }
        }

        // =========================
        // CONFLICTS
        // =========================
        for (const c of result.conflicts) {
            if (!knownConflicts.has(c)) {
                addUnique(suggestions.conflicts, c);
            }
        }

        // =========================
        // TOPIC (main signal)
        // =========================
        if (result.main && !knownTopics.has(result.main)) {
            addUnique(suggestions.topics, result.main);
        }
    }

    fs.writeFileSync(
        OUTPUT_PATH,
        JSON.stringify(suggestions, null, 2)
    );

    console.log("=================================");
    console.log("✅ DONE");
    console.log("Guests nuevos:", suggestions.guests.length);
    console.log("Units nuevos:", suggestions.units.length);
    console.log("Conflicts nuevos:", suggestions.conflicts.length);
    console.log("Topics nuevos:", suggestions.topics.length);
    console.log("OUTPUT:", OUTPUT_PATH);
    console.log("=================================");
}

main();