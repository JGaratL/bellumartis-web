const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const pool = require("../db");

const PREVIEW_PATH = path.join(
  __dirname,
  "blogger-import-preview.json"
);

function getImageUrl(image) {
  if (typeof image === "string") {
    return image;
  }

  if (image && typeof image === "object") {
    return (
      image.url ||
      image.src ||
      image.image_url ||
      image.thumbnail_url ||
      image.href ||
      null
    );
  }

  return null;
}

function normalizeImageUrl(value) {
  if (typeof value !== "string") {
    return null;
  }

  let url = value.trim();

  if (!url || url.startsWith("data:")) {
    return null;
  }

  if (url.startsWith("//")) {
    url = `https:${url}`;
  }

  if (!/^https?:\/\//i.test(url)) {
    return null;
  }

  if (/^(https?:\/\/)?(www\.)?doubleclick\.net/i.test(url)) {
    return null;
  }

  return url;
}

function getThumbnail(article) {
  // Primero intenta utilizar las imágenes detectadas en la previsualización.
  if (Array.isArray(article.images)) {
    for (const image of article.images) {
      const url = normalizeImageUrl(getImageUrl(image));

      if (url) {
        return url;
      }
    }
  }

  // Si no hay imágenes en esa lista, busca directamente en el HTML.
  if (typeof article.body === "string" && article.body.trim()) {
    const $ = cheerio.load(article.body);

    let thumbnail = null;

    $("img").each((_, element) => {
      if (thumbnail) {
        return;
      }

      const image = $(element);

      const candidates = [
        image.attr("src"),
        image.attr("data-src"),
        image.attr("data-original"),
        image.attr("data-lazy-src"),
      ];

      for (const candidate of candidates) {
        const url = normalizeImageUrl(candidate);

        if (url) {
          thumbnail = url;
          break;
        }
      }
    });

    if (thumbnail) {
      return thumbnail;
    }
  }

  return null;
}

async function main() {
  let connection;
  let transactionStarted = false;

  try {
    if (!fs.existsSync(PREVIEW_PATH)) {
      throw new Error(
        `No se encuentra el archivo: ${PREVIEW_PATH}`
      );
    }

    const raw = JSON.parse(
      fs.readFileSync(PREVIEW_PATH, "utf8")
    );

    const articles = Array.isArray(raw)
      ? raw
      : raw.articles || raw.items || [];

    if (!articles.length) {
      throw new Error(
        "La previsualización no contiene artículos."
      );
    }

    connection = await pool.getConnection();

    const [columns] = await connection.query(
      "SHOW COLUMNS FROM content"
    );

    const columnNames = new Set(
      columns.map((column) => column.Field)
    );

    if (!columnNames.has("thumbnail_url")) {
      throw new Error(
        "La tabla content no tiene la columna thumbnail_url."
      );
    }

    const updates = [];

    for (const article of articles) {
      if (!article.slug) {
        continue;
      }

      const thumbnail = getThumbnail(article);

      if (thumbnail) {
        updates.push({
          slug: article.slug,
          thumbnail,
        });
      }
    }

    console.log(`Artículos de la previsualización: ${articles.length}`);
    console.log(`Artículos con imagen candidata: ${updates.length}`);

    await connection.beginTransaction();
    transactionStarted = true;

    let updated = 0;
    let alreadyHadThumbnail = 0;
    let notFound = 0;

    for (const article of updates) {
      const [result] = await connection.execute(
        `UPDATE content
         SET thumbnail_url = ?
         WHERE slug = ?
           AND source = 'blog'
           AND (thumbnail_url IS NULL OR thumbnail_url = '')`,
        [article.thumbnail, article.slug]
      );

      if (result.affectedRows > 0) {
        updated++;
      } else {
        const [existing] = await connection.execute(
          `SELECT id, thumbnail_url
           FROM content
           WHERE slug = ?
             AND source = 'blog'
           LIMIT 1`,
          [article.slug]
        );

        if (!existing.length) {
          notFound++;
        } else if (existing[0].thumbnail_url) {
          alreadyHadThumbnail++;
        }
      }
    }

    await connection.commit();
    transactionStarted = false;

    console.log("\n==================================");
    console.log("ACTUALIZACIÓN DE MINIATURAS TERMINADA");
    console.log("==================================");
    console.log(`Miniaturas añadidas: ${updated}`);
    console.log(`Ya tenían miniatura: ${alreadyHadThumbnail}`);
    console.log(`Artículos no encontrados: ${notFound}`);
    console.log(
      `Sin imagen candidata en la previsualización: ${
        articles.length - updates.length
      }`
    );
    console.log("No se ha modificado el HTML de los artículos.");
    console.log("==================================");
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Error al revertir la transacción:",
          rollbackError.message
        );
      }
    }

    console.error("\nError:", error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      connection.release();
    }

    await pool.end();
  }
}

main();