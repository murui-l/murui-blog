export type MusicOrderSnapshot = { revision: string; trackIds: string[]; updatedAt: string | null };
export const validMusicRevision = (value: unknown): value is string => typeof value === "string" && /^(?:0|[1-9]\d{0,14})$/.test(value);
export const validMusicIds = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 1000
  && value.every(id => typeof id === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(id))
  && new Set(value).size === value.length;
export function parseMusicOrder(value: unknown): MusicOrderSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!validMusicRevision(row.revision) || !validMusicIds(row.trackIds)
    || !(row.updatedAt === null || typeof row.updatedAt === "string")) return null;
  return { revision: row.revision, trackIds: row.trackIds, updatedAt: row.updatedAt };
}
