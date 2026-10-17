const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { sanitizeArticleHtml } = require("../services/htmlSanitizers");

const PREVIEW_PATH = path.join(
  __dirname,
  "blogger-import-preview.json"
);

function normalizePublishedAt(value) {
  if (!value) {
    throw new Error("Artículo sin fecha de publicación");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha no válida: ${value}`);
  }

  return date.toISOString().slice(0, 19).replace("T", " ");
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
        "El archivo de previsualización no contiene artículos"
      );
    }

    console.log(`Artículos encontrados: ${articles.length}`);
    console.log("Conectando con MySQL...");

    connection = await pool.getConnection();

    const [columns] = await connection.query(
      "SHOW COLUMNS FROM content"
    );

    const columnNames = new Set(
      columns.map((column) => column.Field)
    );

    const requiredColumns = [
      "title",
      "slug",
      "description",
      "body",
      "theme",
      "type",
      "source",
      "source_url",
      "published_at",
      "is_visible",
    ];

    const missingColumns = requiredColumns.filter(
      (column) => !columnNames.has(column)
    );

    if (missingColumns.length) {
      throw new Error(
        `Faltan columnas en content: ${missingColumns.join(", ")}`
      );
    }

    console.log("Validando artículos...");

    const validated = articles.map((article, index) => {
      if (
        !article.title ||
        !article.slug ||
        typeof article.body !== "string" ||
        !article.body.trim()
      ) {
        throw new Error(
          `El artículo ${index + 1} no tiene título, slug o HTML`
        );
      }

      const theme =
        article.theme === "historia_militar" ||
        article.theme === "actualidad_militar"
          ? article.theme
          : null;

      if (!theme) {
        throw new Error(
          `Tema no válido en "${article.title}": ${article.theme}`
        );
      }

      return {
        title: article.title,
        slug: article.slug,
        description: article.description || null,
        body: sanitizeArticleHtml(article.body),
        theme,
        source_url:
          article.blogger_url || article.source_url || null,
        published_at: normalizePublishedAt(
          article.published_at
        ),
      };
    });

    const slugs = new Set();

    for (const article of validated) {
      if (slugs.has(article.slug)) {
        throw new Error(
          `Slug duplicado dentro del archivo: ${article.slug}`
        );
      }

      slugs.add(article.slug);
    }

    console.log("Validación completada.");
    console.log("Iniciando importación...");

    await connection.beginTransaction();
    transactionStarted = true;

    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < validated.length; i++) {
      const article = validated[i];

      // El slug es único en toda la tabla, no solo en los blogs.
      const [existing] = await connection.execute(
        `SELECT id
         FROM content
         WHERE slug = ?
         LIMIT 1`,
        [article.slug]
      );

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await connection.execute(
        `INSERT INTO content (
          title,
          slug,
          description,
          body,
          theme,
          type,
          source,
          source_url,
          published_at,
          is_visible
        ) VALUES (?, ?, ?, ?, ?, 'articulo', 'blog', ?, ?, 1)`,
        [
          article.title,
          article.slug,
          article.description,
          article.body,
          article.theme,
          article.source_url,
          article.published_at,
        ]
      );

      inserted++;

      if ((i + 1) % 100 === 0 || i + 1 === validated.length) {
        console.log(
          `Procesados ${i + 1}/${validated.length} | Nuevos: ${inserted} | Omitidos: ${skipped}`
        );
      }
    }

    await connection.commit();
    transactionStarted = false;

    console.log("\n==================================");
    console.log("IMPORTACIÓN TERMINADA");
    console.log("==================================");
    console.log(`Artículos revisados: ${validated.length}`);
    console.log(`Artículos nuevos publicados: ${inserted}`);
    console.log(`Artículos omitidos por duplicados: ${skipped}`);
    console.log("Estado de publicación: is_visible = 1");
    console.log("Origen: blog");
    console.log("Tipo: articulo");
    console.log("==================================\n");
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
        console.error(
          "Se ha revertido la transacción. No se han guardado cambios parciales."
        );
      } catch (rollbackError) {
        console.error(
          "Error al revertir la transacción:",
          rollbackError.message
        );
      }
    }

    console.error(
      "\nImportación cancelada:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    if (connection) {
      connection.release();
    }

    await pool.end();
  }
}

main();
