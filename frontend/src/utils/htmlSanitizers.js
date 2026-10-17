import createDOMPurify from "dompurify";

const ARTICLE_IFRAME_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "ivoox.com",
  "www.ivoox.com",
]);

let articlePurifier;
let emailPurifier;
let allowRemoteEmailImages = false;

function getPurifier(kind) {
  if (typeof window === "undefined") return null;
  if (kind === "article" && !articlePurifier) {
    articlePurifier = createDOMPurify(window);
    articlePurifier.addHook("uponSanitizeAttribute", (node, data) => {
      if (node.nodeName === "IFRAME" && data.attrName.toLowerCase() === "src") {
        try {
          const url = new URL(data.attrValue);
          const host = url.hostname.toLowerCase();
          const youtube = ARTICLE_IFRAME_HOSTS.has(host) && host.includes("youtube") && /^\/embed\//i.test(url.pathname);
          const ivoox = ARTICLE_IFRAME_HOSTS.has(host) && host.includes("ivoox") && /^\/player_ej_/i.test(url.pathname);
          if (url.protocol !== "https:" || (!youtube && !ivoox)) data.keepAttr = false;
        } catch {
          data.keepAttr = false;
        }
      }
      if (data.attrName.toLowerCase() === "style" && /url|image-set|expression|@import|behavior\s*:|\\|\/\*/i.test(data.attrValue)) {
        data.keepAttr = false;
      }
    });
    articlePurifier.addHook("afterSanitizeAttributes", (node) => {
      if (node.nodeName === "IFRAME" && node.hasAttribute("src")) {
        node.setAttribute("loading", "lazy");
        node.setAttribute("referrerpolicy", "no-referrer");
        node.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
        node.setAttribute("allow", "encrypted-media; picture-in-picture");
        node.setAttribute("allowfullscreen", "");
      }
      if (node.nodeName === "A" && node.hasAttribute("href")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });
  }

  if (kind === "email" && !emailPurifier) {
    emailPurifier = createDOMPurify(window);
    emailPurifier.addHook("uponSanitizeAttribute", (node, data) => {
      if (node.nodeName === "IMG" && data.attrName.toLowerCase() === "src") {
        try {
          const url = new URL(data.attrValue, window.location.href);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            data.keepAttr = false;
          } else if (!allowRemoteEmailImages) {
            data.keepAttr = false;
            node.setAttribute("data-external-image", "blocked");
          }
        } catch {
          data.keepAttr = false;
        }
      }
      if (data.attrName.toLowerCase() === "style" && /url|image-set|expression|@import|behavior\s*:|\\|\/\*/i.test(data.attrValue)) {
        data.keepAttr = false;
      }
    });
    emailPurifier.addHook("afterSanitizeAttributes", (node) => {
      if (node.nodeName === "A" && node.hasAttribute("href")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer nofollow");
      }
      if (node.nodeName === "IMG") {
        node.removeAttribute("srcset");
        node.setAttribute("loading", "lazy");
        node.setAttribute("referrerpolicy", "no-referrer");
      }
    });
  }

  return kind === "article" ? articlePurifier : emailPurifier;
}

const ARTICLE_CONFIG = {
  ADD_TAGS: ["iframe"],
  ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "loading", "referrerpolicy", "sandbox"],
  FORBID_TAGS: ["script", "style", "form", "input", "button", "textarea", "select", "option", "object", "embed", "video", "audio", "source", "svg", "math", "template", "base", "meta", "link"],
  FORBID_ATTR: ["srcdoc"],
};

const EMAIL_CONFIG = {
  FORBID_TAGS: ["script", "style", "form", "input", "button", "textarea", "select", "option", "iframe", "object", "embed", "video", "audio", "source", "svg", "math", "template", "base", "meta", "link"],
  FORBID_ATTR: ["srcdoc", "srcset", "background", "formaction"],
};

export function sanitizeArticleHtml(html) {
  const purifier = getPurifier("article");
  if (!purifier) return "";
  const parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
  for (const iframe of parsed.querySelectorAll("iframe")) {
    try {
      const url = new URL(iframe.getAttribute("src") || "");
      const host = url.hostname.toLowerCase();
      const youtube = ARTICLE_IFRAME_HOSTS.has(host) && host.includes("youtube") && /^\/embed\//i.test(url.pathname);
      const ivoox = ARTICLE_IFRAME_HOSTS.has(host) && host.includes("ivoox") && /^\/player_ej_/i.test(url.pathname);
      if (url.protocol !== "https:" || (!youtube && !ivoox)) iframe.remove();
    } catch {
      iframe.remove();
    }
  }
  return purifier.sanitize(parsed.body.innerHTML, ARTICLE_CONFIG);
}

export function sanitizeEmailHtml(html, { allowExternalImages = false } = {}) {
  const purifier = getPurifier("email");
  if (!purifier) return "";
  allowRemoteEmailImages = allowExternalImages;
  try {
    return purifier.sanitize(String(html || ""), EMAIL_CONFIG);
  } finally {
    allowRemoteEmailImages = false;
  }
}

export function hasExternalEmailImages(html) {
  if (typeof DOMParser === "undefined") return false;
  const parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
  return [...parsed.querySelectorAll("img[src]")].some((image) => {
    try {
      const protocol = new URL(image.getAttribute("src"), window.location.href).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  });
}
