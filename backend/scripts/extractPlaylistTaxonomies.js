// scripts/extractPlaylistTaxonomies.js

const playlists = require("../data/playlistMetadata");

const periods = new Set();
const subperiods = new Set();
const regions = new Set();
const countries = new Set();
const conflicts = new Set();
const tags = new Set();

function addValue(set, value) {
    if (!value) return;

    if (Array.isArray(value)) {
        value.forEach(v => {
            if (v && String(v).trim()) {
                set.add(String(v).trim());
            }
        });
    } else {
        const v = String(value).trim();
        if (v) set.add(v);
    }
}

for (const metadata of Object.values(playlists)) {
    addValue(periods, metadata.period);
    addValue(subperiods, metadata.subperiod);

    // por si queda algún typo antiguo
    addValue(subperiods, metadata.superiod);

    addValue(regions, metadata.regions);
    addValue(countries, metadata.countries);
    addValue(conflicts, metadata.conflicts);
    addValue(tags, metadata.tags);
}

const result = {
    periods: [...periods].sort(),
    subperiods: [...subperiods].sort(),
    regions: [...regions].sort(),
    countries: [...countries].sort(),
    conflicts: [...conflicts].sort(),
    tags: [...tags].sort(),
};

console.log(JSON.stringify(result, null, 2));