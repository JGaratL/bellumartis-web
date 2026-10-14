import { resolveAssetUrl } from "./assetHelpers";

export function rewriteContentHtmlAssetUrls(html) {
  const source = String(html || "");

  if (!source) return "";

  return source.replace(
    /(<img[^>]+src=["'])([^"']+)(["'][^>]*>)/gi,
    (match, prefix, src, suffix) => {
      const cleanSrc = String(src || "").trim();

      if (
        !cleanSrc ||
        /^https?:\/\//i.test(cleanSrc) ||
        cleanSrc.startsWith("data:")
      ) {
        return match;
      }

      return `${prefix}${resolveAssetUrl(cleanSrc)}${suffix}`;
    }
  );
}
