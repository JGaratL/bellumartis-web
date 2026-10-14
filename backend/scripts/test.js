const { isBlacklisted } = require("./blacklist");

// simulamos un título real de YouTube
const title = "Entrevista con *Francisco G. Campa* sobre historia militar";

// extracción simple (como tu sistema real)
const matches = [...title.matchAll(/\*([^*]+)\*/g)];

for (const m of matches) {
    const name = m[1];

    console.log("Detectado:", name);

    if (isBlacklisted(name)) {
        console.log("🚫 BLOQUEADO (MATCH OK):", name);
    } else {
        console.log("✔ NO bloqueado:", name);
    }
}