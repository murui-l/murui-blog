// A changed CMS file gets a different public URL even when its filename stays.
export function mediaURL(value: unknown): string {
  if (!value || typeof value !== "object" || !("url" in value)) return "";
  const media = value as { url?: unknown; updatedAt?: unknown };
  const url = typeof media.url === "string" ? media.url : "";
  if (!url || typeof media.updatedAt !== "string") return url;
  const version = Date.parse(media.updatedAt);
  if (!Number.isFinite(version)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}

export function versionRichTextMedia(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(versionRichTextMedia);
  if (!value || typeof value !== "object") return value;
  const node = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, versionRichTextMedia(child)]));
  if (node.relationTo === "media" && node.value && typeof node.value === "object") {
    node.value = { ...node.value, url: mediaURL(node.value) };
  }
  return node;
}
