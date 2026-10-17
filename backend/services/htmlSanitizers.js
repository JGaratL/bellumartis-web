const sanitizeHtml = require("sanitize-html");

const ARTICLE_IFRAME_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "ivoox.com",
  "www.ivoox.com",
]);

const articleTags = [
  "a", "abbr", "b", "blockquote", "br", "caption", "center", "cite", "code",
  "dd", "del", "div", "dl", "dt", "em", "figcaption", "figure", "h1", "h2",
  "h3", "h4", "h5", "h6", "hr", "i", "img", "ins", "li", "ol", "p", "pre",
  "s", "small", "span", "strike", "strong", "sub", "sup", "table", "tbody",
  "td", "tfoot", "th", "thead", "tr", "u", "ul", "iframe",
];

const articleStyles = {
  "text-align": [/^(left|right|center|justify)$/i],
  "font-family": [/^[\w\s,'"-]{1,100}$/],
  "font-size": [/^\d{1,3}(px|pt|em|rem|%)$/i],
  "font-weight": [/^(normal|bold|[1-9]00)$/i],
  "font-style": [/^(normal|italic|oblique)$/i],
  "text-decoration": [/^(none|underline|line-through|overline)$/i],
  "margin-top": [/^(auto|\d+(\.\d+)?(px|pt|em|rem|%)?)$/i],
  "margin-bottom": [/^(auto|\d+(\.\d+)?(px|pt|em|rem|%)?)$/i],
  "padding-top": [/^\d+(\.\d+)?(px|pt|em|rem|%)?$/i],
  "padding-bottom": [/^\d+(\.\d+)?(px|pt|em|rem|%)?$/i],
  color: [/^(#[\da-f]{3,8}|[a-z]{1,20}|rgba?\([\d\s.,%]+\))$/i],
  "background-color": [/^(#[\da-f]{3,8}|[a-z]{1,20}|rgba?\([\d\s.,%]+\))$/i],
  "line-height": [/^(normal|\d+(\.\d+)?(px|pt|em|rem|%)?)$/i],
  margin: [/^(auto|\d+(\.\d+)?(px|pt|em|rem|%)?)(\s+(auto|\d+(\.\d+)?(px|pt|em|rem|%)?)){0,3}$/i],
  "margin-left": [/^(auto|\d+(\.\d+)?(px|pt|em|rem|%)?)$/i],
  "margin-right": [/^(auto|\d+(\.\d+)?(px|pt|em|rem|%)?)$/i],
};

const articleAttributes = {
  "*": ["class", "dir", "lang", "title", "style"],
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "width", "height", "loading"],
  iframe: ["src", "width", "height", "title", "allowfullscreen", "frameborder", "allow", "loading", "referrerpolicy", "sandbox"],
  ol: ["start", "type"],
  li: ["value"],
  table: ["summary", "width", "border", "cellpadding", "cellspacing"],
  td: ["colspan", "rowspan", "align", "valign", "width"],
  th: ["colspan", "rowspan", "align", "valign", "scope", "width"],
  p: ["align"],
  div: ["align"],
  span: ["align"],
};

const cleanArticleIframe = (tagName, attribs) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(attribs.src || "");
  } catch {
    return { tagName: "span", attribs: {} };
  }

  const host = parsedUrl.hostname.toLowerCase();
  const isYoutube = ARTICLE_IFRAME_HOSTS.has(host) &&
    (host.includes("youtube") && /^\/embed\//i.test(parsedUrl.pathname));
  const isIvoox = ARTICLE_IFRAME_HOSTS.has(host) &&
    host.includes("ivoox") && /^\/player_ej_/i.test(parsedUrl.pathname);

  if (parsedUrl.protocol !== "https:" || (!isYoutube && !isIvoox)) {
    return { tagName: "span", attribs: {} };
  }

  return {
    tagName,
    attribs: {
      src: parsedUrl.href,
      ...(attribs.width ? { width: attribs.width } : {}),
      ...(attribs.height ? { height: attribs.height } : {}),
      ...(attribs.title ? { title: attribs.title } : {}),
      loading: "lazy",
      referrerpolicy: "no-referrer",
      sandbox: "allow-scripts allow-same-origin allow-presentation",
      allow: "encrypted-media; picture-in-picture",
      allowfullscreen: "",
    },
  };
};

const articleOptions = {
  allowedTags: articleTags,
  allowedAttributes: articleAttributes,
  allowedStyles: articleStyles,
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  allowedIframeHostnames: [...ARTICLE_IFRAME_HOSTS],
  allowIframeRelativeUrls: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        ...(attribs.href ? { target: "_blank", rel: "noopener noreferrer" } : {}),
      },
    }),
    iframe: cleanArticleIframe,
  },
};

function sanitizeArticleHtml(html) {
  return sanitizeHtml(String(html || ""), articleOptions);
}

module.exports = { sanitizeArticleHtml };
