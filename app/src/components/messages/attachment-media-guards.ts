/** Shared guards for message/issue attachment tiles and lightbox. */

export function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function isVideoMime(mime: string, originalFilename: string) {
  if (mime.startsWith("video/")) return true;
  if (!mime || mime === "application/octet-stream") {
    return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(originalFilename ?? "");
  }
  return false;
}

/** MIME types that typically render inline in a new browser tab (not PhotoSwipe). */
const TAB_PREVIEW_EXACT_MIMES = new Set([
  "application/pdf",
  "application/json",
  "application/ld+json",
  "text/json",
  "application/xml",
  "text/xml",
  "text/csv",
  "text/tab-separated-values",
  "text/markdown",
  "text/x-markdown",
  "application/yaml",
  "application/x-yaml",
  "text/yaml",
  "application/geo+json",
  "application/vnd.geo+json",
]);

/** Dangerous or non-inline `text/*` types we never open as a navigable tab target. */
const TAB_PREVIEW_TEXT_DENY = new Set(["text/html", "text/javascript", "text/ecmascript"]);

const TAB_PREVIEW_EXT = /\.(pdf|json|geojson|txt|csv|tsv|xml|md|markdown|yaml|yml|toml|log|map)(\?|$)/i;

/**
 * Whether this attachment should open in a new browser tab (PDF, JSON, plain text, etc.).
 * Images and videos stay false so callers keep using PhotoSwipe.
 */
export function attachmentOpensInBrowserTab(mimeType: string, originalFilename: string): boolean {
  const mime = (mimeType ?? "").trim().toLowerCase();
  const name = originalFilename ?? "";
  if (isImageMime(mime)) return false;
  if (isVideoMime(mime, name)) return false;

  if (TAB_PREVIEW_EXACT_MIMES.has(mime)) return true;

  if (mime.startsWith("text/")) {
    if (TAB_PREVIEW_TEXT_DENY.has(mime)) return false;
    return true;
  }

  if (!mime || mime === "application/octet-stream") {
    return TAB_PREVIEW_EXT.test(name);
  }

  return false;
}
