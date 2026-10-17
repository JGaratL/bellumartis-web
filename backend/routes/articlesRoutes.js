const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const slugify = require("slugify");

const db = require("../db");
const verifyToken = require("../middleware/auth");
const checkRole = require("../middleware/role");
const { sanitizeArticleHtml } = require("../services/htmlSanitizers");

const router = express.Router();

const articlesUploadsRoot = path.join(__dirname, "..", "uploads", "articles");
if (!fs.existsSync(articlesUploadsRoot)) {
  fs.mkdirSync(articlesUploadsRoot, { recursive: true });
}

const articleUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const valid = String(file.mimetype || "").startsWith("image/");

    if (valid) {
      cb(null, true);
    } else {
      cb(new Error("Solo imagenes permitidas"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

const parseArticleUpload = (fieldName) => (req, res, next) => {
  articleUpload.single(fieldName)(req, res, (err) => {
    if (err) {
      console.error("ARTICLE IMAGE UPLOAD ERROR:", err);
      return res.status(400).json({
        error: err.message || "No se pudo subir la imagen",
      });
    }

    return next();
  });
};

const normalizeNullable = (value) => {
  const next = String(value ?? "").trim();
  return next || null;
};

const readBodyValue = (body, keys) => {
  for (const key of keys) {
    const value = normalizeNullable(body?.[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
};

const normalizeForeignKey = (value) => {
  const normalized = normalizeNullable(value);

  if (!normalized) {
    return null;
  }

  return /^\d+$/.test(normalized) ? Number(normalized) : null;
};

const buildArticleSignature = (row) =>
  [
    String(row?.title || "").trim(),
    String(row?.description || "").trim(),
    String(row?.content_html || row?.body || "").trim(),
    String(row?.theme || "").trim(),
    String(row?.published_at || "").trim(),
    String(row?.thumbnail_url || "").trim(),
    String(row?.period_id ?? "").trim(),
    String(row?.subperiod_id ?? "").trim(),
  ].join("::");

const dedupeArticleRows = (rows) => {
  const seen = new Map();

  for (const row of rows || []) {
    const signature = buildArticleSignature(row);
    const existing = seen.get(signature);

    if (!existing || Number(row.id) > Number(existing.id)) {
      seen.set(signature, row);
    }
  }

  return [...seen.values()];
};

const slugifyText = (value = "") =>
  slugify(String(value || ""), {
    lower: true,
    strict: true,
    locale: "es",
    trim: true,
  });

const isLocalAsset = (value) => {
  const clean = String(value || "").trim();
  return clean.startsWith("/uploads/articles/") || clean.startsWith("uploads/articles/");
};

const deleteLocalImageByUrl = (imageUrl) => {
  if (!isLocalAsset(imageUrl)) return;

  const relativePath = String(imageUrl).replace(/^\/+/, "");
  const absolutePath = path.join(__dirname, "..", relativePath);

  if (!absolutePath.startsWith(articlesUploadsRoot)) {
    return;
  }

  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (error) {
      console.error("DELETE ARTICLE IMAGE ERROR:", error);
    }
  }
};

const extractLocalImagesFromHtml = (html) => {
  if (!html) return [];

  const matches = [];
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match = null;

  while ((match = regex.exec(html))) {
    const src = match[1];
    if (isLocalAsset(src)) {
      matches.push(src);
    }
  }

  return matches;
};

const getUniqueSlug = async (baseSlug, excludeId = null) => {
  const cleanBase = (baseSlug || "").toString().trim() || "articulo";
  let candidate = cleanBase;
  let suffix = 2;

  while (true) {
    const params = [candidate];
    let sql = `
      SELECT id
      FROM content
      WHERE slug = ?
    `;

    if (excludeId) {
      sql += ` AND id <> ?`;
      params.push(excludeId);
    }

    sql += ` LIMIT 1`;

    const [rows] = await db.query(sql, params);
    if (!rows.length) {
      return candidate;
    }

    candidate = `${cleanBase}-${suffix}`;
    suffix += 1;
  }
};

const uploadArticleImage = async (file) => {
  if (!file) return null;

  const filename = `article-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const outputPath = path.join(articlesUploadsRoot, filename);

  await sharp(file.buffer)
    .resize(1800, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);

  return `/uploads/articles/${filename}`;
};

const uploadArticleThumbnailImage = async (file) => {
  if (!file) return null;

  const filename = `article-thumb-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const outputPath = path.join(articlesUploadsRoot, filename);

  await sharp(file.buffer)
    .resize(1280, 720, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(outputPath);

  return `/uploads/articles/${filename}`;
};

const uploadArticleInlineImage = async (file) => {
  if (!file) return null;

  const filename = `article-inline-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const outputPath = path.join(articlesUploadsRoot, filename);

  await sharp(file.buffer)
    .resize(1800, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);

  return `/uploads/articles/${filename}`;
};

const formatRow = (row) => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  description: row.description,
  content_html: row.content_html || "",
  thumbnail_url: row.thumbnail_url || "",
  published_at: row.published_at || null,
  theme: row.theme || "historia_militar",
  period_id: row.period_id || "",
  subperiod_id: row.subperiod_id || "",
  period: row.period || row.period_name || "",
  subperiod: row.subperiod_id || "",
  is_visible: Number(row.is_visible) === 1,
  type: row.type || "articulo",
  source: row.source || "blog",
  source_url: row.source_url || null,
});

const articleSelectSql = `
  SELECT
    c.id,
    c.title,
    c.slug,
    c.description,
    c.body AS content_html,
    c.thumbnail_url,
    DATE_FORMAT(c.published_at, '%Y-%m-%d') AS published_at,
    c.theme,
    c.period_id,
    c.subperiod_id,
    p.name AS period_name,
    c.is_visible,
    c.type,
    c.source,
    c.source_url
  FROM content c
  LEFT JOIN periods p
    ON p.id = c.period_id
  WHERE c.type = 'articulo'
`;

router.get("/meta", verifyToken, checkRole(["admin", "owner"]), async (req, res) => {
  try {
    const [periods] = await db.query(`
      SELECT id, name, slug, sort_order
      FROM periods
      ORDER BY sort_order ASC, id ASC
    `);

    return res.json({
      periods,
      themes: [
        { value: "historia_militar", label: "Historia militar" },
        { value: "actualidad_militar", label: "Actualidad militar" },
      ],
    });
  } catch (error) {
    console.error("ADMIN ARTICLES META ERROR:", error);
    return res.status(500).json({ error: "No se pudo obtener la metadata de articulos" });
  }
});

router.get("/", verifyToken, checkRole(["admin", "owner"]), async (req, res) => {
  try {
    const [rows] = await db.query(`
      ${articleSelectSql}
      ORDER BY published_at DESC, id DESC
    `);

    return res.json(dedupeArticleRows(rows.map(formatRow)));
  } catch (error) {
    console.error("ADMIN ARTICLES LIST ERROR:", error);
    return res.status(500).json({ error: "No se pudo obtener la lista de articulos" });
  }
});

router.post(
  "/upload-image",
  verifyToken,
  checkRole(["admin", "owner"]),
  parseArticleUpload("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Selecciona una imagen" });
      }

      const url = await uploadArticleInlineImage(req.file);
      const absoluteUrl = `${req.protocol}://${req.get("host")}${url}`;
      return res.status(201).json({ url: absoluteUrl, path: url });
    } catch (error) {
      console.error("ADMIN ARTICLES IMAGE UPLOAD ERROR:", error);
      return res.status(500).json({ error: "No se pudo subir la imagen" });
    }
  }
);

router.post(
  "/",
  verifyToken,
  checkRole(["admin", "owner"]),
  parseArticleUpload("image"),
  async (req, res) => {
    try {
      const title = String(req.body?.title || "").trim();
      const slugInput = String(req.body?.slug || "").trim();
      const description = normalizeNullable(req.body?.description);
      const content = sanitizeArticleHtml(String(req.body?.content || "").trim());
      const publishedAt = normalizeNullable(req.body?.published_at);
      const theme = normalizeNullable(
        readBodyValue(req.body, ["theme"])
      ) || "historia_militar";
      const periodId = normalizeForeignKey(
        readBodyValue(req.body, ["period_id", "periodId", "period"])
      );
      const subperiodId = normalizeForeignKey(
        readBodyValue(req.body, ["subperiod_id", "subperiodId", "subpriod_id", "subperiod"])
      );
      const isVisible = req.body?.is_visible === "0" || req.body?.is_visible === 0
        ? 0
        : 1;
      const imageUrlInput = normalizeNullable(req.body?.image_url);

      if (!title) {
        return res.status(400).json({ error: "El titulo es obligatorio" });
      }

      if (!content) {
        return res.status(400).json({ error: "El contenido del articulo es obligatorio" });
      }

      if (!["historia_militar", "actualidad_militar"].includes(theme)) {
        return res.status(400).json({ error: "El tema del articulo es invalido" });
      }

      const effectivePeriodId = theme === "actualidad_militar" ? null : periodId;

      let thumbnailUrl = imageUrlInput;
      if (req.file) {
        thumbnailUrl = await uploadArticleThumbnailImage(req.file);
      }

      if (!thumbnailUrl) {
        return res.status(400).json({ error: "La imagen principal es obligatoria" });
      }

      const baseSlug = slugifyText(slugInput || title) || "articulo";
      const uniqueSlug = await getUniqueSlug(baseSlug);

      const [duplicateRows] = await db.query(
        `
        SELECT
          c.id,
          c.title,
          c.slug,
          c.description,
          c.body AS content_html,
          c.thumbnail_url,
          DATE_FORMAT(c.published_at, '%Y-%m-%d') AS published_at,
          c.theme,
          c.period_id,
          c.subperiod_id,
          c.is_visible,
          c.type,
          c.source,
          c.source_url
        FROM content c
        WHERE c.type = 'articulo'
          AND c.source = 'blog'
          AND c.title = ?
          AND c.description <=> ?
          AND c.body = ?
          AND c.theme = ?
          AND DATE_FORMAT(c.published_at, '%Y-%m-%d') = ?
          AND COALESCE(c.thumbnail_url, '') = ?
          AND c.period_id <=> ?
          AND c.subperiod_id <=> ?
        ORDER BY c.id DESC
        LIMIT 1
        `,
        [
          title,
          description,
          content,
          theme,
          publishedAt,
          thumbnailUrl,
          effectivePeriodId,
          subperiodId,
        ]
      );

      if (duplicateRows.length > 0) {
        return res.status(200).json({
          message: "Articulo ya existente",
          article: formatRow(duplicateRows[0]),
        });
      }

      const [result] = await db.query(
        `
        INSERT INTO content (
          title,
          slug,
          description,
          body,
          theme,
          thumbnail_url,
          published_at,
          period_id,
          subperiod_id,
          is_visible,
          type,
          source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'articulo', 'blog')
        `,
        [
          title,
          uniqueSlug,
          description,
          content,
          theme,
          thumbnailUrl,
          publishedAt,
          effectivePeriodId,
          subperiodId,
          isVisible,
        ]
      );

      const [rows] = await db.query(
        `
        ${articleSelectSql}
        AND c.id = ?
        LIMIT 1
        `,
        [result.insertId]
      );

      return res.status(201).json({
        message: "Articulo creado correctamente",
        article: formatRow(rows[0] || {
          id: result.insertId,
          title,
          slug: uniqueSlug,
          description,
          content_html: content,
          thumbnail_url: thumbnailUrl,
          published_at: publishedAt,
          theme,
          period_id: effectivePeriodId,
          subperiod_id: subperiodId,
          is_visible: isVisible,
          type: "articulo",
          source: "blog",
          source_url: null,
        }),
      });
    } catch (error) {
      console.error("ADMIN ARTICLES CREATE ERROR:", error);
      return res.status(500).json({ error: "No se pudo crear el articulo" });
    }
  }
);

router.put(
  "/:id",
  verifyToken,
  checkRole(["admin", "owner"]),
  parseArticleUpload("image"),
  async (req, res) => {
    try {
      const articleId = Number(req.params.id);

      if (!Number.isInteger(articleId) || articleId <= 0) {
        return res.status(400).json({ error: "ID de articulo invalido" });
      }

      const title = String(req.body?.title || "").trim();
      const slugInput = String(req.body?.slug || "").trim();
      const description = normalizeNullable(req.body?.description);
      const content = sanitizeArticleHtml(String(req.body?.content || "").trim());
      const publishedAt = normalizeNullable(req.body?.published_at);
      const theme = normalizeNullable(
        readBodyValue(req.body, ["theme"])
      ) || "historia_militar";
      const periodId = normalizeForeignKey(
        readBodyValue(req.body, ["period_id", "periodId", "period"])
      );
      const subperiodId = normalizeForeignKey(
        readBodyValue(req.body, ["subperiod_id", "subperiodId", "subpriod_id", "subperiod"])
      );
      const isVisible = req.body?.is_visible === "0" || req.body?.is_visible === 0
        ? 0
        : 1;
      const imageUrlInput = normalizeNullable(req.body?.image_url);

      if (!title) {
        return res.status(400).json({ error: "El titulo es obligatorio" });
      }

      if (!content) {
        return res.status(400).json({ error: "El contenido del articulo es obligatorio" });
      }

      if (!["historia_militar", "actualidad_militar"].includes(theme)) {
        return res.status(400).json({ error: "El tema del articulo es invalido" });
      }

      const effectivePeriodId = theme === "actualidad_militar" ? null : periodId;

      const [existingRows] = await db.query(
        `
        SELECT thumbnail_url, body AS content_html, slug
        FROM content
        WHERE id = ? AND type = 'articulo'
        LIMIT 1
        `,
        [articleId]
      );

      const existing = existingRows[0];
      if (!existing) {
        return res.status(404).json({ error: "Articulo no encontrado" });
      }

      let thumbnailUrl = imageUrlInput || existing.thumbnail_url || null;
      if (req.file) {
        thumbnailUrl = await uploadArticleThumbnailImage(req.file);
      }

      if (!thumbnailUrl) {
        return res.status(400).json({ error: "La imagen principal es obligatoria" });
      }

      const baseSlug = slugifyText(slugInput || title || existing.slug) || "articulo";
      const uniqueSlug = await getUniqueSlug(baseSlug, articleId);

      await db.query(
        `
        UPDATE content
        SET
          title = ?,
          slug = ?,
          description = ?,
          body = ?,
          theme = ?,
          thumbnail_url = ?,
          published_at = ?,
          period_id = ?,
          subperiod_id = ?,
          is_visible = ?,
          type = 'articulo',
          source = 'blog'
        WHERE id = ? AND type = 'articulo'
        `,
        [
          title,
          uniqueSlug,
          description,
          content,
          theme,
          thumbnailUrl,
          publishedAt,
          effectivePeriodId,
          subperiodId,
          isVisible,
          articleId,
        ]
      );

      const [rows] = await db.query(
        `
        ${articleSelectSql}
        AND c.id = ?
        LIMIT 1
        `,
        [articleId]
      );

      if (req.file && existing.thumbnail_url && existing.thumbnail_url !== thumbnailUrl) {
        deleteLocalImageByUrl(existing.thumbnail_url);
      }

      return res.json({
        message: "Articulo actualizado correctamente",
        article: formatRow(rows[0] || {
          id: articleId,
          title,
          slug: uniqueSlug,
          description,
          content_html: content,
          thumbnail_url: thumbnailUrl,
          published_at: publishedAt,
          theme,
          period_id: effectivePeriodId,
          subperiod_id: subperiodId,
          is_visible: isVisible,
          type: "articulo",
          source: "blog",
          source_url: null,
        }),
      });
    } catch (error) {
      console.error("ADMIN ARTICLES UPDATE ERROR:", error);
      return res.status(500).json({ error: "No se pudo actualizar el articulo" });
    }
  }
);

router.delete(
  "/:id",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const articleId = Number(req.params.id);

      if (!Number.isInteger(articleId) || articleId <= 0) {
        return res.status(400).json({ error: "ID de articulo invalido" });
      }

      const [existingRows] = await db.query(
        `
        SELECT thumbnail_url, body AS content_html
        FROM content
        WHERE id = ? AND type = 'articulo'
        LIMIT 1
        `,
        [articleId]
      );

      const existing = existingRows[0];
      if (!existing) {
        return res.status(404).json({ error: "Articulo no encontrado" });
      }

      await db.query(
        `
        DELETE FROM content
        WHERE id = ? AND type = 'articulo'
        `,
        [articleId]
      );

      deleteLocalImageByUrl(existing.thumbnail_url);
      for (const imageUrl of extractLocalImagesFromHtml(existing.content_html)) {
        deleteLocalImageByUrl(imageUrl);
      }

      return res.json({ message: "Articulo eliminado correctamente" });
    } catch (error) {
      console.error("ADMIN ARTICLES DELETE ERROR:", error);
      return res.status(500).json({ error: "No se pudo eliminar el articulo" });
    }
  }
);

module.exports = router;
