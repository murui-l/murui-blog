/** Only anonymous, raster media may enter Next's shared public image cache. */
function allowedPublicPath(src: string): boolean {
  if (!src.startsWith("/") || src.startsWith("//") || /[\\#\u0000-\u0020]/.test(src)) return false;
  const [pathname, query = ""] = src.split("?");
  if (src.split("?").length > 2) return false;
  // Reject encoded separators/dot segments rather than letting URL normalization
  // turn an apparently public path into a different route.
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return false; }
  if (/[\\#?\u0000-\u001f\u007f]/.test(decoded) || decoded.includes("%") || decoded.split("/").some(part => part === "." || part === "..")) return false;
  if (decoded !== pathname && /%2f|%5c/i.test(pathname)) return false;
  if (query && !/^v=\d+$/.test(query)) return false;
  if (!/\.(?:jpe?g|png|webp|avif)$/i.test(decoded)) return false;
  if (/^\/api\/media\/file\/[^/]+$/.test(decoded)) return true;
  if (!/^\/images\/(?:artworks|backgrounds|megumin)\/[^/]+$/.test(decoded)) return false;
  return decoded !== "/images/megumin/pet-collapse.webp";
}

/** Payload stores older public media as canonical absolute URLs. Optimize them
 * through this deployment's public route, preserving the version query. */
export function publicImageSource(src: string): string | null {
  const canonical = "https://muruiwen.cn";
  const local = src.startsWith(`${canonical}/`) ? src.slice(canonical.length) : src;
  return allowedPublicPath(local) ? local : null;
}

export function isPublicOptimizableImage(src: string): boolean {
  return publicImageSource(src) !== null;
}
