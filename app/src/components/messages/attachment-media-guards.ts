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
