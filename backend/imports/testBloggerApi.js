const path = require("path");

require("dotenv").config({
    path: path.resolve(__dirname, "../.env"),
});

const BLOG_ID = "8154327206865027266";

async function testBloggerApi() {
    const apiKey = process.env.BLOGGER_API_KEY;

    if (!apiKey) {
        console.error("ERROR: No se ha encontrado BLOGGER_API_KEY en backend/.env");
        process.exitCode = 1;
        return;
    }

    const url = new URL(
        `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts`
    );

    url.searchParams.set("key", apiKey);
    url.searchParams.set("status", "live");
    url.searchParams.set("fetchBodies", "true");
    url.searchParams.set("maxResults", "1");

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("Error de la API:", response.status);
            console.dir(data, { depth: null });
            process.exitCode = 1;
            return;
        }

        const post = data.items?.[0];

        console.log("\n===== PRUEBA BLOGGER API =====");
        console.log("API conectada correctamente");
        console.log("Artículos devueltos en esta prueba:", data.items?.length || 0);
        console.log("¿Hay más páginas?:", Boolean(data.nextPageToken));

        if (post) {
            console.log("\nPrimer artículo:");
            console.log("Título:", post.title);
            console.log("URL original:", post.url);
            console.log("Fecha:", post.published);
            console.log("ID:", post.id);
            console.log("Contenido HTML recibido:", typeof post.content === "string");
            console.log("Longitud del HTML:", post.content?.length || 0);
            console.log(
                "HTML de ejemplo:",
                (post.content || "").slice(0, 300)
            );
        }

        console.log("\nNo se ha escrito nada en MySQL.");
    } catch (error) {
        console.error("No se pudo conectar con Blogger API:");
        console.error(error.message);
        process.exitCode = 1;
    }
}

testBloggerApi();