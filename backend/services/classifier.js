const fs = require("fs");
const path = require("path");

const guestsRaw = require("../data/guests");
const conflictsRaw = require("../data/conflicts");
const topicsRaw = require("../data/topics");
const unitsRaw = require("../data/units");

const learningFile = path.resolve(__dirname, "../data/learning-log.json");

const SOURCE_WEIGHTS = {
    title: 2.6,
    description: 1.0,
    tags: 0.6,
};

const SCORE_CAPS = {
    guest: 2.5,
    unit: 3.5,
    topic: 5.5,
    conflict: 6.5,
};

const MIN_SCORES = {
    guest: 1,
    unit: 0.9,
    topic: 1.2,
    conflict: 1.2,
};

const GENERIC_SINGLE_WORDS = new Set([
    "roma",
    "china",
    "rusia",
    "ucrania",
    "iran",
    "siria",
    "israel",
    "otan",
    "usa",
    "eeuu",
    "gaza",
    "isis",
    "sudan",
    "mali",
    "niger",
    "pekin",
    "jartum",
]);

function loadLearning() {
    try {
        return JSON.parse(fs.readFileSync(learningFile, "utf-8"));
    } catch {
        return {
            guests: [],
            units: [],
            conflicts: [],
            topics: [],
        };
    }
}

function saveLearning(data) {
    fs.writeFileSync(learningFile, JSON.stringify(data, null, 2));
}

function addLearningEntry(array, entry) {
    const exists = array.some(
        item =>
            item.name === entry.name &&
            JSON.stringify(item.matchedAliases) ===
                JSON.stringify(entry.matchedAliases)
    );

    if (!exists) {
        array.push(entry);
    }
}

function normalize(text = "") {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeAliases(aliases = []) {
    return [...new Set(aliases.map(alias => normalize(alias)).filter(Boolean))];
}

function mergeByName(items = []) {
    const merged = new Map();

    for (const item of items) {
        if (!item || !item.name) continue;

        const current = merged.get(item.name);
        if (!current) {
            merged.set(item.name, {
                ...item,
                aliases: dedupeAliases(item.aliases || []),
            });
            continue;
        }

        current.aliases = dedupeAliases([
            ...(current.aliases || []),
            ...(item.aliases || []),
        ]);
        current.weight = Math.max(current.weight || 1, item.weight || 1);
        current.period = current.period || item.period || null;
        current.theme = current.theme || item.theme || null;
    }

    return [...merged.values()];
}

function hasAliasMatch(sourceText, alias) {
    if (!sourceText || !alias) return false;

    const pattern = new RegExp(
        `(?:^|\\s)${escapeRegExp(alias)}(?:$|\\s)`
    );

    return pattern.test(sourceText);
}

function aliasStrength(alias) {
    const parts = alias.split(" ").filter(Boolean);
    if (!parts.length) return 0;

    if (parts.length === 1) {
        if (alias.length <= 4) return 0.25;
        if (GENERIC_SINGLE_WORDS.has(alias)) return 0.45;
        return 0.6;
    }

    if (parts.length === 2) return 0.85;
    return 1;
}

function scoreAlias(alias, normTitle, normDesc, normTags) {
    const weight = aliasStrength(alias);
    let score = 0;

    if (hasAliasMatch(normTitle, alias)) {
        score += SOURCE_WEIGHTS.title * weight;
    }

    if (hasAliasMatch(normDesc, alias)) {
        score += SOURCE_WEIGHTS.description * weight;
    }

    if (hasAliasMatch(normTags, alias)) {
        score += SOURCE_WEIGHTS.tags * weight;
    }

    return score;
}

const guests = mergeByName(guestsRaw);
const conflicts = mergeByName(conflictsRaw);
const topics = mergeByName(topicsRaw);
const units = mergeByName(unitsRaw);

function detectPeriodFromText(text) {
    const t = text.toLowerCase();

    if (t.includes("primera guerra mundial") || t.includes("ww1")) {
        return "ww1";
    }

    if (t.includes("segunda guerra mundial") || t.includes("ww2")) {
        return "ww2";
    }

    if (t.includes("roma") || t.includes("imperio romano")) {
        return "antigua";
    }

    if (
        t.includes("ucrania") ||
        t.includes("iran") ||
        t.includes("china") ||
        t.includes("geopolitica") ||
        t.includes("petroleo")
    ) {
        return "contemporanea";
    }

    return null;
}

function classifyContent(title = "", description = "", tags = [], options = {}) {
    const text = normalize(`${title} ${description} ${tags.join(" ")}`);
    const normTitle = normalize(title);
    const normDesc = normalize(description);
    const normTags = normalize(tags.join(" "));

    const LEARN = options.learn === true;
    const learning = LEARN ? loadLearning() : null;

    const result = {
        guests: [],
        conflicts: [],
        units: [],
        topics: {},
        period: null,
        theme: null,
        main: null,
        debug: {
            matches: {},
            scores: {},
            winnerTrace: [],
        },
    };

    const finalScores = {};

    function addDebug(category, name, value) {
        if (!result.debug.scores[name]) {
            result.debug.scores[name] = 0;
        }

        result.debug.scores[name] += value;

        if (!result.debug.matches[name]) {
            result.debug.matches[name] = [];
        }

        result.debug.matches[name].push(`${category}:${value.toFixed(2)}`);
    }

    function commitScore(type, name, rawScore) {
        const score = Math.min(rawScore, SCORE_CAPS[type]);
        if (score < MIN_SCORES[type]) {
            return 0;
        }

        finalScores[name] = (finalScores[name] || 0) + score;
        return score;
    }

    for (const guest of guests) {
        let rawScore = 0;
        const matchedAliases = [];

        for (const alias of guest.aliases || []) {
            const aliasScore = scoreAlias(alias, normTitle, normDesc, normTags);
            if (aliasScore <= 0) continue;

            matchedAliases.push(alias);
            rawScore += aliasScore;
            addDebug("guest", guest.name, aliasScore);
        }

        const score = commitScore("guest", guest.name, rawScore);
        if (!score) continue;

        result.guests.push(guest.name);

        if (LEARN) {
            addLearningEntry(learning.guests, {
                name: guest.name,
                matchedAliases,
            });
        }
    }

    for (const unit of units) {
        let rawScore = 0;

        for (const alias of unit.aliases || []) {
            const aliasScore = scoreAlias(alias, normTitle, normDesc, normTags);
            if (aliasScore <= 0) continue;

            rawScore += aliasScore * (unit.weight || 1.3);
        }

        const score = commitScore("unit", unit.name, rawScore);
        if (!score) continue;

        addDebug("unit", unit.name, score);
        result.units.push(unit.name);

        if (!result.period && unit.period) {
            result.period = unit.period;
        }

        if (!result.theme && unit.theme) {
            result.theme = unit.theme;
        }
    }

    for (const topic of topics) {
        let rawScore = 0;

        for (const alias of topic.aliases || []) {
            const aliasScore = scoreAlias(alias, normTitle, normDesc, normTags);
            if (aliasScore <= 0) continue;

            rawScore += aliasScore * (topic.weight || 1);
        }

        const score = commitScore("topic", topic.name, rawScore);
        if (!score) continue;

        addDebug("topic", topic.name, score);

        if (!result.period && topic.period) {
            result.period = topic.period;
        }

        if (!result.theme && topic.theme) {
            result.theme = topic.theme;
        }
    }

    for (const conflict of conflicts) {
        let rawScore = 0;

        for (const alias of conflict.aliases || []) {
            const aliasScore = scoreAlias(alias, normTitle, normDesc, normTags);
            if (aliasScore <= 0) continue;

            rawScore += aliasScore * (conflict.weight || 1);
        }

        const score = commitScore("conflict", conflict.name, rawScore);
        if (!score) continue;

        addDebug("conflict", conflict.name, score);

        if (!result.conflicts.includes(conflict.name)) {
            result.conflicts.push(conflict.name);
        }

        if (!result.period && conflict.period) {
            result.period = conflict.period;
        }

        if (!result.theme && conflict.theme) {
            result.theme = conflict.theme;
        }
    }

    const ranked = Object.entries(finalScores).sort((a, b) => b[1] - a[1]);
    result.debug.winnerTrace = ranked.map(([name, score]) => ({ name, score }));
    result.main = ranked.length > 0 ? ranked[0][0] : null;
    result.debug.winner = result.main;

    if (!result.period) {
        result.period = detectPeriodFromText(text) || null;
    }

    if (LEARN) {
        saveLearning(learning);
    }

    return result;
}

module.exports = {
    classifyContent,
};
