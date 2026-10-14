const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const BLOG_ID = "8154327206865027266";
const PAGE_SIZE = 500;

const OUTPUT_FILE = path.join(
  __dirname,
  "blogger-api-export.json"
);

async function exportBloggerPosts() {
  const apiKey = process.env.BLOGGER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "No se ha encontrado BLOGGER_API_KEY en backend/.env"
    );
  }

  const posts = [];
  let pageToken = null;
  let pageNumber = 0;

  do {
    const url = new URL(
      `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts`
    );

    url.searchParams.set("key", apiKey);
    url.searchParams.set("status", "live");
    url.searchParams.set("fetchBodies", "true");
    url.searchParams.set("fetchImages", "true");
    url.searchParams.set("maxResults", String(PAGE_SIZE));

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    console.log(`Descargando página ${pageNumber + 1}...`);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("Error de la API:", response.status);
      console.dir(data.error || data, { depth: null });

      throw new Error("No se pudo completar la exportación.");
    }

    const items = data.items || [];

    posts.push(...items);
    pageNumber++;

    console.log(
      `Página ${pageNumber}: ${items.length} artículos. ` +
      `Total acumulado: ${posts.length}`
    );

    pageToken = data.nextPageToken || null;
  } while (pageToken);

  const ids = new Set(posts.map((post) => post.id));
  const duplicateIds = posts.length - ids.size;

  const report = {
    exportedAt: new Date().toISOString(),
    blogId: BLOG_ID,
    totalPosts: posts.length,
    uniqueIds: ids.size,
    duplicateIds,
    posts,
  };

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  const withoutTitle = posts.filter(
    (post) => !post.title?.trim()
  ).length;

  const withoutUrl = posts.filter(
    (post) => !post.url
  ).length;

  const withoutContent = posts.filter(
    (post) => typeof post.content !== "string"
  ).length;

  console.log("\n===== EXPORTACIÓN COMPLETADA =====");
  console.log("Artículos descargados:", posts.length);
  console.log("Identificadores únicos:", ids.size);
  console.log("IDs duplicados:", duplicateIds);
  console.log("Sin título:", withoutTitle);
  console.log("Sin URL:", withoutUrl);
  console.log("Sin contenido HTML:", withoutContent);
  console.log("Archivo generado:", OUTPUT_FILE);
  console.log("No se ha escrito nada en MySQL.");
}

exportBloggerPosts().catch((error) => {
  console.error("\nERROR:", error.message);
  process.exitCode = 1;
});
