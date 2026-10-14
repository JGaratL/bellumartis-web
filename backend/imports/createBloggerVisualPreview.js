
const fs = require("fs");
const path = require("path");

const importsDir = __dirname;
const inputPath = path.join(
    importsDir,
    "blogger-import-preview.json"
);
const outputPath = path.join(
    importsDir,
    "blogger-visual-preview.html"
);

if (!fs.existsSync(inputPath)) {
    console.error("No se encuentra blogger-import-preview.json");
    process.exit(1);
}

const report = JSON.parse(
    fs.readFileSync(inputPath, "utf8")
);

const articles = report.articles || [];

if (!articles.length) {
    console.error("El informe no contiene artículos.");
    process.exit(1);
}

const safeJson = JSON.stringify(articles)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Previsualización de Blogger | Bellumartis</title>
<style>
* { box-sizing: border-box; }

body {
    margin: 0;
    background: #e9eeee;
    color: #202a2c;
    font-family: Arial, sans-serif;
}

header {
    background: #12383b;
    color: white;
    padding: 22px 28px;
}

header h1 {
    margin: 0 0 8px;
    font-size: 23px;
}

header p {
    margin: 0;
    color: #d9e9e9;
    font-size: 14px;
}

.toolbar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    padding: 14px 20px;
    background: white;
    border-bottom: 1px solid #ccd6d6;
}

input, select, button {
    min-height: 40px;
    padding: 9px 12px;
    border: 1px solid #bdcaca;
    border-radius: 5px;
    background: white;
    color: #202a2c;
    font-size: 14px;
}

input {
    flex: 1 1 250px;
    min-width: 180px;
}

select {
    flex: 2 1 300px;
    min-width: 220px;
}

button {
    cursor: pointer;
}

button:hover {
    background: #e5eeee;
}

#position {
    color: #526466;
    font-size: 13px;
    white-space: nowrap;
}

main {
    max-width: 1150px;
    margin: 24px auto;
    padding: 0 18px 40px;
}

.details {
    margin-bottom: 16px;
    padding: 20px;
    background: white;
    border: 1px solid #d5dddd;
    border-radius: 7px;
}

.details h2 {
    margin: 0 0 12px;
    font-size: 25px;
    line-height: 1.35;
}

.meta {
    color: #647476;
    font-size: 13px;
    line-height: 1.8;
    overflow-wrap: anywhere;
}

.meta a {
    color: #0f6970;
}

.article-frame {
    display: block;
    width: 100%;
    min-height: 1000px;
    height: 75vh;
    border: 1px solid #d5dddd;
    border-radius: 7px;
    background: white;
}

.warning {
    margin-top: 12px;
    color: #58696b;
    font-size: 12px;
}

@media (max-width: 600px) {
    header { padding: 18px; }
    .toolbar { padding: 10px; }
    main { margin-top: 14px; padding: 0 10px 25px; }
    .details h2 { font-size: 21px; }
    .article-frame { height: 70vh; }
}
</style>
</head>
<body>
<header>
    <h1>Bellumartis · Importación de Blogger</h1>
    <p>Previsualización local del contenido limpio. No modifica la base de datos.</p>
</header>

<div class="toolbar">
    <input id="search" type="search"
        placeholder="Buscar por título o ID de Blogger...">
    <select id="articleSelect" aria-label="Seleccionar artículo"></select>
    <button id="previous" type="button">← Anterior</button>
    <button id="next" type="button">Siguiente →</button>
    <span id="position"></span>
</div>

<main>
    <section class="details">
        <h2 id="title"></h2>
        <div id="meta" class="meta"></div>
    </section>

    <iframe
        id="articleFrame"
        class="article-frame"
        title="Vista previa del artículo"
        sandbox="allow-scripts allow-forms allow-popups allow-presentation"
        allowfullscreen
    ></iframe>

    <p class="warning">
        Vista previa del HTML limpio. Los reproductores externos pueden
        tener restricciones de reproducción dentro de esta ventana.
    </p>
</main>

<script>
const articles = __ARTICLES_JSON__;

const searchInput = document.getElementById("search");
const select = document.getElementById("articleSelect");
const title = document.getElementById("title");
const meta = document.getElementById("meta");
const frame = document.getElementById("articleFrame");
const position = document.getElementById("position");

let filteredArticles = articles.slice();
let currentIndex = 0;

function escapeHtml(value) {
    return String(value == null ? "" : value).replace(
        /[&<>"']/g,
        function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        }
    );
}

function populateSelect() {
    const previousId = filteredArticles[currentIndex]
        ? filteredArticles[currentIndex].blogger_id
        : null;

    const query = searchInput.value.trim().toLowerCase();

    filteredArticles = articles.filter(function (article) {
        return (
            String(article.title || "").toLowerCase().includes(query) ||
            String(article.blogger_id || "").includes(query)
        );
    });

    select.innerHTML = "";

    filteredArticles.forEach(function (article, index) {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent =
            article.title + " [" + article.blogger_id + "]";
        select.appendChild(option);
    });

    const retainedIndex = filteredArticles.findIndex(function (article) {
        return article.blogger_id === previousId;
    });

    currentIndex = retainedIndex >= 0 ? retainedIndex : 0;

    if (filteredArticles.length) {
        select.value = String(currentIndex);
        renderArticle();
    } else {
        title.textContent = "No se encontraron artículos";
        meta.textContent = "";
        frame.srcdoc = "";
        position.textContent = "0 artículos";
    }
}

function renderArticle() {
    const article = filteredArticles[currentIndex];

    if (!article) return;

    title.textContent = article.title || "Sin título";

    const sourceUrl = article.blogger_url || article.source_url || "";

    meta.innerHTML =
        "<strong>Fecha:</strong> " +
        escapeHtml(article.published_at || "Sin fecha") +
        " &nbsp;·&nbsp; <strong>ID:</strong> " +
        escapeHtml(article.blogger_id || "") +
        "<br><strong>Categorías:</strong> " +
        escapeHtml(
            Array.isArray(article.categories)
                ? article.categories.join(", ")
                : article.categories || "Sin categorías"
        ) +
        (sourceUrl
            ? '<br><a href="' + escapeHtml(sourceUrl) +
              '" target="_blank" rel="noopener noreferrer">' +
              "Abrir artículo original de Blogger</a>"
            : "");

    const articleCss = [
        "body{font-family:Arial,sans-serif;color:#252b2d;line-height:1.75;",
        "font-size:17px;max-width:850px;margin:0 auto;padding:28px 24px;",
        "overflow-wrap:anywhere}",
        "img{max-width:100%;height:auto}",
        "iframe,video,embed,object{max-width:100%}",
        "iframe{width:100%;min-height:300px}",
        "table{max-width:100%;}",
        "a{color:#0f6970}",
        "blockquote{border-left:4px solid #0f6970;padding-left:16px;",
        "margin-left:0;color:#4c595a}",
        "pre{white-space:pre-wrap;overflow-wrap:anywhere}",
        "@media(max-width:600px){body{padding:16px 12px;font-size:16px}}"
    ].join("");

    frame.srcdoc =
        "<!DOCTYPE html><html lang='es'><head>" +
        "<meta charset='UTF-8'>" +
        "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
        "<style>" + articleCss + "</style></head><body>" +
        (article.body || "<p>Este artículo no contiene HTML.</p>") +
        "</body></html>";

    position.textContent =
        (currentIndex + 1) + " de " + filteredArticles.length +
        " · " + articles.length + " en total";
}

searchInput.addEventListener("input", function () {
    populateSelect();
});

select.addEventListener("change", function () {
    currentIndex = Number(select.value);
    renderArticle();
});

document.getElementById("previous").addEventListener("click", function () {
    if (!filteredArticles.length) return;
    currentIndex =
        (currentIndex - 1 + filteredArticles.length) %
        filteredArticles.length;
    select.value = String(currentIndex);
    renderArticle();
});

document.getElementById("next").addEventListener("click", function () {
    if (!filteredArticles.length) return;
    currentIndex = (currentIndex + 1) % filteredArticles.length;
    select.value = String(currentIndex);
    renderArticle();
});

populateSelect();
</script>
</body>
</html>`;

fs.writeFileSync(
    outputPath,
    html.replace("__ARTICLES_JSON__", safeJson),
    "utf8"
);

console.log("Visor creado correctamente.");
console.log("Artículos disponibles:", articles.length);
console.log("Archivo:", outputPath);
console.log("Abre blogger-visual-preview.html en tu navegador.");
