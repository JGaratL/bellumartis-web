
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const importsDir = __dirname;
const apiPath = path.join(importsDir, "blogger-api-export.json");
const reportPath = path.join(importsDir, "blogger-import-preview.json");

function asArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
}

function normalizeUrl(url) {
    return String(url || "").trim();
}

function isYouTubeUrl(url) {
    return /(^|\/\/)(www\.)?(youtube\.com|youtu\.be)(\/|$)/i.test(url);
}

function isIvooxUrl(url) {
    return /(^|\/\/)(www\.)?ivoox\.com(\/|$)/i.test(url);
}

function isAdUrl(url) {
    return (
        /adsbygoogle/i.test(url) ||
        /amazon-adsystem\.com/i.test(url) ||
        /doubleclick\.net/i.test(url) ||
        /googlesyndication\.com/i.test(url) ||
        /googleadservices\.com/i.test(url)
    );
}

function getPostId(post) {
    return String(post.id || "").trim();
}

function getPostTitle(post) {
    return String(post.title || "").trim();
}

function getPostUrl(post) {
    const url = normalizeUrl(post.url || post.selfLink);
    return /^https?:\/\//i.test(url) ? url : "";
}

function getPostHtml(post) {
    if (typeof post.content === "string") {
        return post.content;
    }

    if (typeof post.content?.value === "string") {
        return post.content.value;
    }

    return "";
}

function getPostDate(post) {
    const value = String(post.published || "").trim();

    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function getPostCategories(post) {
    return asArray(post.labels)
        .map((label) => {
            if (typeof label === "string") return label.trim();
            return String(label?.name || "").trim();
        })
        .filter(Boolean);
}

function makeSlug(title, postId) {
    const base = String(title || "articulo")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 160);

    const id = String(postId || "").match(/\d+/);
    const suffix = id ? id[0] : "";

    return suffix
        ? `${base || "articulo"}-${suffix}`
        : base || "articulo";
}

function inferTheme(categories, title, html) {
    const text = [
        ...(categories || []),
        title || "",
        html || "",
    ]
        .join(" ")
        .toLowerCase();

    if (
        /actualidad|noticias|conflicto actual|guerra de ucrania|geopol[ií]tica actual/.test(
            text
        )
    ) {
        return "actualidad_militar";
    }

    return "historia_militar";
}

function cleanArticleHtml(rawHtml) {
    const $ = cheerio.load(String(rawHtml || ""), {
        decodeEntities: false,
    });

    const stats = {
        adsRemoved: 0,
        promotionalBlocksRemoved: 0,
        emptyLinksRemoved: 0,
        emptyContainersRemoved: 0,
    };

    function removeElement(element, counter) {
        const $element = $(element);

        if (!$element.length) return;

        $element.remove();

        if (Object.prototype.hasOwnProperty.call(stats, counter)) {
            stats[counter]++;
        }
    }

    function normalizedText(element) {
        return $(element).text().replace(/\s+/g, " ").trim();
    }

    function hasMedia(element) {
        return $(element).find(
            "img, iframe, video, audio, picture, svg, object, embed"
        ).length > 0;
    }

    function hasEditorialContent(element) {
        const $element = $(element);

        return (
            hasMedia(element) ||
            $element.find("a[href]").length > 0 ||
            $element.find("blockquote, pre, code").length > 0
        );
    }

    function getDepth(element) {
        let depth = 0;
        let current = element;

        while (current && current.parent) {
            depth++;
            current = current.parent;
        }

        return depth;
    }

    function getAllElementText(element) {
        return normalizedText(element)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function hasYellowBackground(element) {
        const styles = [
            $(element).attr("style") || "",
            $(element)
                .find("[style]")
                .map((_, child) => $(child).attr("style") || "")
                .get()
                .join(" "),
        ].join(" ");

        return /background(?:-color)?\s*:\s*(?:yellow|#ffff00|#ff0\b|rgb\(\s*255\s*,\s*255\s*,\s*0\s*\))/i.test(
            styles
        );
    }

    function isPromotionalImage(element) {
        const $element = $(element);
        const src = $element.attr("src") || $element.attr("data-src") || "";
        const alt = $element.attr("alt") || "";
        const title = $element.attr("title") || "";

        return (
            isAdUrl(src) ||
            /amazon.?bhm|banner.*(promo|publicidad)|promo.*banner/i.test(
                `${src} ${alt} ${title}`
            )
        );
    }

    function isExplicitAdElement(element) {
        const $element = $(element);
        const id = $element.attr("id") || "";
        const className = $element.attr("class") || "";
        const src = $element.attr("src") || "";
        const title = $element.attr("title") || "";

        return (
            isAdUrl(src) ||
            /(^|[\s_-])(adsbygoogle|advertisement|advertising|google-ad|banner-ad)([\s_-]|$)/i.test(
                `${id} ${className}`
            ) ||
            /publicidad patrocinada/i.test(title)
        );
    }

    // 1. Eliminar scripts publicitarios identificables.
    $("script").each((_, element) => {
        const $element = $(element);
        const src = $element.attr("src") || "";
        const content = $element.html() || "";

        if (
            isAdUrl(src) ||
            /adsbygoogle|googlesyndication|doubleclick|amazon-adsystem/i.test(
                content
            )
        ) {
            removeElement(element, "adsRemoved");
        }
    });

    // 2. Eliminar únicamente elementos publicitarios identificables.
    $(
        [
            "ins.adsbygoogle",
            ".adsbygoogle",
            '[id*="google_ads"]',
            '[class*="google-ad"]',
            '[id*="banner-ad"]',
            '[class*="banner-ad"]',
        ].join(",")
    ).each((_, element) => {
        removeElement(element, "adsRemoved");
    });

    // 3. Eliminar reproductores que sean anuncios externos.
    $("iframe, object, embed").each((_, element) => {
        const $element = $(element);
        const src =
            $element.attr("src") ||
            $element.attr("data") ||
            $element.attr("data-src") ||
            "";

        if (isAdUrl(src)) {
            removeElement(element, "adsRemoved");
        }
    });

    // 4. Eliminar imágenes publicitarias, sin afectar a las editoriales.
    $("img").each((_, element) => {
        if (isPromotionalImage(element)) {
            removeElement(element, "adsRemoved");
        }
    });


    // 5. Eliminar enlaces promocionales propios sin borrar imágenes,
    // títulos, descripciones ni otros contenidos editoriales.
    const promotionalPatterns = [
        /\bcompra este libro\b/i,
        /\bcompra aqui el libro\b/i,
        /\bcompra aqui este libro\b/i,
        /\bcompra aqui\b.*\bayuda a bhm\b/i,
        /\bayuda a bhm\b/i,
        /\bcolabora con bhm\b/i,
        /\bapoya a bhm\b/i,
        /\bcompra en nuestra tienda\b/i,
        /\bhazte con el libro\b.*\bcolabora con bhm\b/i,
    ];

    function isPromotionalText(text) {
        const normalized = String(text || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

        return promotionalPatterns.some((pattern) =>
            pattern.test(normalized)
        );
    }

    // Primero actuamos sobre el enlace concreto que contiene la promoción.
    $("a[href]").each((_, element) => {
        const $link = $(element);

        if (
            !$link.length ||
            !$.contains($.root()[0], element)
        ) {
            return;
        }

        const text = normalizedText(element);

        if (!text || !isPromotionalText(text)) {
            return;
        }

        // Si el enlace contiene una imagen u otro medio, no lo eliminamos
        // entero para evitar perder una portada o una imagen editorial.
        if (hasMedia(element)) {
            return;
        }

        removeElement(element, "promotionalBlocksRemoved");

        // Limpiar únicamente los contenedores de formato que hayan quedado
        // vacíos. Nunca se elimina un contenedor que conserve texto,
        // imágenes, reproductores u otros enlaces.
        let parent = element.parent;

        while (
            parent &&
            parent.type === "tag" &&
            ["span", "b", "strong", "u", "i", "em", "font", "div", "p", "td"].includes(
                parent.name
            )
        ) {
            const $parent = $(parent);

            if (
                normalizedText(parent) ||
                hasMedia(parent) ||
                $parent.find("a[href]").length > 0
            ) {
                break;
            }

            const grandparent = parent.parent;

            $parent.remove();
            parent = grandparent;
        }
    });

    // Después, eliminar bloques promocionales de texto que no sean enlaces
    // y que no contengan ningún contenido editorial.
    const promotionalCandidates = $(
        "div, p, span, table, section, td"
    ).toArray();

    promotionalCandidates.sort(
        (a, b) => getDepth(b) - getDepth(a)
    );

    for (const element of promotionalCandidates) {
        const $element = $(element);

        if (
            !$element.length ||
            !$.contains($.root()[0], element)
        ) {
            continue;
        }

        const text = normalizedText(element);

        if (!text || text.length > 250 || !isPromotionalText(text)) {
            continue;
        }

        // No borrar imágenes, reproductores ni enlaces que puedan contener
        // contenido editorial legítimo.
        if (hasMedia(element) || $element.find("a[href]").length > 0) {
            continue;
        }

        // Evitar borrar un contenedor exterior si la promoción ya está
        // dentro de otro bloque promocional que se procesará por separado.
        const hasPromotionalDescendant = $element
            .find("div, p, span, table, section, td")
            .toArray()
            .some((child) => {
                const childText = normalizedText(child);

                return (
                    childText.length > 0 &&
                    childText.length <= 250 &&
                    isPromotionalText(childText)
                );
            });

        if (hasPromotionalDescendant) {
            continue;
        }

        removeElement(element, "promotionalBlocksRemoved");
    }


    // 6. Eliminar restos del botón amarillo AQUÍ/AQUI.
    $("div, span, p").each((_, element) => {
        const $element = $(element);

        if (!$element.length || !$.contains($.root()[0], element)) {
            return;
        }

        const text = getAllElementText(element);
        const isYellow = hasYellowBackground(element);

        if (!isYellow || hasEditorialContent(element)) {
            return;
        }

        if (
            /^(aqui|aquí)$/.test(text) ||
            (!text && $element.children().length === 0)
        ) {
            removeElement(element, "promotionalBlocksRemoved");
        }
    });

    // 7. Eliminar enlaces realmente vacíos.
    $("a").each((_, element) => {
        const $element = $(element);

        if (
            !$element.length ||
            !$.contains($.root()[0], element)
        ) {
            return;
        }

        const hasText = Boolean(normalizedText(element));
        const containsMedia = hasMedia(element);

        if (!hasText && !containsMedia) {
            removeElement(element, "emptyLinksRemoved");
        }
    });

    // 8. Limpiar contenedores vacíos desde los más profundos.
    // Se conservan los elementos con atributos relevantes o contenido.
    const emptyCandidates = $(
        "div, span, p, section, table, tbody, tr, td"
    ).toArray();

    emptyCandidates.sort(
        (a, b) => getDepth(b) - getDepth(a)
    );

    for (const element of emptyCandidates) {
        const $element = $(element);

        if (
            !$element.length ||
            !$.contains($.root()[0], element)
        ) {
            continue;
        }

        if (normalizedText(element)) {
            continue;
        }

        if (hasMedia(element)) {
            continue;
        }

        if ($element.find("a[href]").length > 0) {
            continue;
        }

        // No eliminar elementos estructurales con atributos que puedan
        // ser necesarios para mantener la presentación del contenido.
        const hasRelevantAttributes = [
            "id",
            "class",
            "style",
            "src",
            "href",
            "data",
        ].some((attribute) => $element.attr(attribute));

        if (hasRelevantAttributes) {
            continue;
        }

        if ($element.children().length > 0) {
            continue;
        }

        removeElement(element, "emptyContainersRemoved");
    }

    // 9. Extraer las imágenes que se han conservado.
    const images = [];

    $("img").each((_, element) => {
        const $element = $(element);
        const src =
            $element.attr("src") ||
            $element.attr("data-src") ||
            "";

        if (
            src &&
            /^https?:\/\//i.test(src) &&
            !isAdUrl(src)
        ) {
            images.push({
                url: normalizeUrl(src),
                alt: $element.attr("alt") || "",
            });
        }
    });

    // 10. Detectar reproductores de YouTube e iVoox en iframe, object y embed.
    const players = [];

    $("iframe, object, embed").each((_, element) => {
        const $element = $(element);
        const src = normalizeUrl(
            $element.attr("src") ||
            $element.attr("data") ||
            $element.attr("data-src") ||
            ""
        );

        if (!src || isAdUrl(src)) {
            return;
        }

        let provider = null;

        if (isYouTubeUrl(src)) {
            provider = "youtube";
        } else if (isIvooxUrl(src)) {
            provider = "ivoox";
        }

        if (!provider) {
            return;
        }

        players.push({
            provider,
            url: src,
            kind: element.name.toLowerCase(),
        });
    });

    // 11. Detectar enlaces editoriales a YouTube e iVoox.
    const mediaLinks = [];

    $("a[href]").each((_, element) => {
        const $element = $(element);
        const href = normalizeUrl($element.attr("href"));

        if (!href || isAdUrl(href)) {
            return;
        }

        let provider = null;

        if (isYouTubeUrl(href)) {
            provider = "youtube";
        } else if (isIvooxUrl(href)) {
            provider = "ivoox";
        }

        if (provider) {
            mediaLinks.push({
                provider,
                url: href,
                text: $element.text().trim(),
            });
        }
    });

    // 12. Devolver el contenido interior del documento.
    const bodyHtml = $("body").length
        ? $("body").html() || ""
        : $.root().html() || "";

    const totalAdsRemoved =
        stats.adsRemoved + stats.promotionalBlocksRemoved;

    return {
        html: bodyHtml,
        images,
        players,
        mediaLinks,
        removedAds: totalAdsRemoved,
        cleanupStats: {
            ...stats,
            totalAdsAndPromotionsRemoved: totalAdsRemoved,
            totalEmptyElementsRemoved:
                stats.emptyLinksRemoved + stats.emptyContainersRemoved,
        },
    };
}

function main() {
    if (!fs.existsSync(apiPath)) {
        throw new Error(`No se encuentra el archivo: ${apiPath}`);
    }

    console.log("Leyendo la exportación de la API de Blogger...");

    const rawData = fs.readFileSync(apiPath, "utf8");
    const data = JSON.parse(rawData);

    if (!data || !Array.isArray(data.posts)) {
        throw new Error(
            "El JSON no contiene un array 'posts'. Revisa la estructura de blogger-api-export.json."
        );
    }

    const posts = data.posts;

    let analyzed = 0;
    let postsWithoutTitle = 0;
    let postsWithoutDate = 0;
    let postsWithoutUrl = 0;
    let postsWithoutHtml = 0;

    let totalImages = 0;
    let totalRemovedAds = 0;
    let totalPromotionalBlocksRemoved = 0;
    let totalEmptyLinksRemoved = 0;
    let totalEmptyContainersRemoved = 0;

    let postsWithPlayers = 0;
    let youtubePlayers = 0;
    let ivooxPlayers = 0;
    let youtubeLinks = 0;
    let ivooxLinks = 0;

    const articles = [];
    const seenIds = new Set();
    const seenSlugs = new Set();
    const duplicateIds = [];
    const duplicateSlugs = [];

    for (const post of posts) {
        const bloggerId = getPostId(post);
        const title = getPostTitle(post);
        const bloggerUrl = getPostUrl(post);
        const publishedAt = getPostDate(post);
        const categories = getPostCategories(post);
        const rawHtml = getPostHtml(post);

        if (!title) postsWithoutTitle++;
        if (!publishedAt) postsWithoutDate++;
        if (!bloggerUrl) postsWithoutUrl++;
        if (!rawHtml.trim()) postsWithoutHtml++;

        if (bloggerId) {
            if (seenIds.has(bloggerId)) {
                duplicateIds.push(bloggerId);
            }

            seenIds.add(bloggerId);
        }

        const slug = makeSlug(title, bloggerId);

        if (seenSlugs.has(slug)) {
            duplicateSlugs.push(slug);
        }

        seenSlugs.add(slug);

        const cleaned = cleanArticleHtml(rawHtml);
        const sourceUrl = cleaned.players[0]?.url || null;

        const article = {
            blogger_id: bloggerId,
            title,
            slug,
            source: "blog",
            type: "articulo",
            theme: inferTheme(categories, title, cleaned.html),
            source_url: sourceUrl,
            blogger_url: bloggerUrl || null,
            published_at: publishedAt,
            categories,
            body_length: cleaned.html.length,
            body: cleaned.html,
            images: cleaned.images,
            players: cleaned.players,
            media_links: cleaned.mediaLinks,
            removed_ads: cleaned.removedAds,
            cleanup_stats: cleaned.cleanupStats,
        };

        articles.push(article);

        analyzed++;
        totalImages += cleaned.images.length;
        totalRemovedAds += cleaned.cleanupStats.totalAdsAndPromotionsRemoved;
        totalPromotionalBlocksRemoved +=
            cleaned.cleanupStats.promotionalBlocksRemoved;
        totalEmptyLinksRemoved += cleaned.cleanupStats.emptyLinksRemoved;
        totalEmptyContainersRemoved +=
            cleaned.cleanupStats.emptyContainersRemoved;

        if (cleaned.players.length > 0) {
            postsWithPlayers++;
        }

        youtubePlayers += cleaned.players.filter(
            (player) => player.provider === "youtube"
        ).length;

        ivooxPlayers += cleaned.players.filter(
            (player) => player.provider === "ivoox"
        ).length;

        youtubeLinks += cleaned.mediaLinks.filter(
            (link) => link.provider === "youtube"
        ).length;

        ivooxLinks += cleaned.mediaLinks.filter(
            (link) => link.provider === "ivoox"
        ).length;
    }

    const report = {
        generated_at: new Date().toISOString(),
        source_file: apiPath,
        mode: "PREVIEW_ONLY_NO_DATABASE_WRITES",

        summary: {
            api_posts_received: posts.length,
            published_articles_analyzed: analyzed,
            unique_blogger_ids: seenIds.size,
            duplicate_ids: duplicateIds.length,
            duplicate_slugs: duplicateSlugs.length,
            posts_without_title: postsWithoutTitle,
            posts_without_valid_date: postsWithoutDate,
            posts_without_url: postsWithoutUrl,
            posts_without_html: postsWithoutHtml,
            articles_with_players: postsWithPlayers,
            youtube_embedded_players: youtubePlayers,
            ivoox_embedded_players: ivooxPlayers,
            youtube_links: youtubeLinks,
            ivoox_links: ivooxLinks,
            images_found: totalImages,
            ads_and_promotions_removed: totalRemovedAds,
            promotional_blocks_removed: totalPromotionalBlocksRemoved,
            empty_links_removed: totalEmptyLinksRemoved,
            empty_containers_removed: totalEmptyContainersRemoved,
            total_empty_elements_removed:
                totalEmptyLinksRemoved + totalEmptyContainersRemoved,
        },

        duplicate_ids: duplicateIds,
        duplicate_slugs: duplicateSlugs,
        articles,
    };

    fs.writeFileSync(
        reportPath,
        JSON.stringify(report, null, 2),
        "utf8"
    );

    console.log("\n===== RESULTADO DEL ANÁLISIS =====");
    console.log(`Artículos recibidos de la API: ${posts.length}`);
    console.log(`Artículos analizados: ${analyzed}`);
    console.log(`IDs únicos: ${seenIds.size}`);
    console.log(`IDs duplicados: ${duplicateIds.length}`);
    console.log(`Slugs duplicados: ${duplicateSlugs.length}`);
    console.log(`Artículos sin título: ${postsWithoutTitle}`);
    console.log(`Artículos sin fecha válida: ${postsWithoutDate}`);
    console.log(`Artículos sin URL: ${postsWithoutUrl}`);
    console.log(`Artículos sin HTML: ${postsWithoutHtml}`);
    console.log(`Artículos con reproductores: ${postsWithPlayers}`);
    console.log(`Reproductores YouTube: ${youtubePlayers}`);
    console.log(`Reproductores iVoox: ${ivooxPlayers}`);
    console.log(`Enlaces a YouTube: ${youtubeLinks}`);
    console.log(`Enlaces a iVoox: ${ivooxLinks}`);
    console.log(`Imágenes encontradas: ${totalImages}`);
    console.log(`Anuncios y promociones eliminados: ${totalRemovedAds}`);
    console.log(
        `Bloques promocionales eliminados: ${totalPromotionalBlocksRemoved}`
    );
    console.log(`Enlaces vacíos eliminados: ${totalEmptyLinksRemoved}`);
    console.log(
        `Contenedores vacíos eliminados: ${totalEmptyContainersRemoved}`
    );
    console.log(`Informe generado: ${reportPath}`);
    console.log("No se ha escrito nada en MySQL.");

    if (
        posts.length !== 1241 ||
        postsWithoutTitle ||
        postsWithoutDate ||
        postsWithoutUrl ||
        postsWithoutHtml ||
        duplicateIds.length ||
        duplicateSlugs.length
    ) {
        console.log(
            "\nATENCIÓN: hay diferencias o datos que conviene revisar antes de importar."
        );
    } else {
        console.log(
            "\nLa comprobación básica ha terminado sin detectar datos incompletos ni duplicados."
        );
    }
}

try {
    main();
} catch (error) {
    console.error("\nERROR AL ANALIZAR LA EXPORTACIÓN:");
    console.error(error.message);
    process.exitCode = 1;
}
