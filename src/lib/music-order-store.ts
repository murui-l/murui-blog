import { createClient, type Client, type Transaction } from "@libsql/client";
import { cloudMusicIds, musicTracks } from "./music";
import { reconcileTrackIds } from "./music-queue";
import { validMusicIds, validMusicRevision, type MusicOrderSnapshot } from "./music-order";

export class MusicOrderError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export const defaultMusicOrder = [...new Set([...cloudMusicIds.map(id => `netease-${id}`), ...musicTracks.map(track => track.id)])];
const allowedIds = new Set(defaultMusicOrder);
const globalState = globalThis as unknown as { muruiMusicOrderClient?: Client };
export function musicOrderDatabase() {
  // Schema changes are explicit migrations, never side effects of reads/builds.
  return globalState.muruiMusicOrderClient ??= createClient({
    url: process.env.TURSO_URL || process.env.DATABASE_URL || "file:payload-local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}
const unavailable = (error: unknown) => error instanceof Error && /no such table:\s*BlogMusicOrder/i.test(error.message);
async function readOrder(reader: Pick<Transaction, "execute">): Promise<MusicOrderSnapshot> {
  const row = (await reader.execute("SELECT schema_version, revision, track_ids, updated_at FROM BlogMusicOrder WHERE id = 1")).rows[0];
  if (!row || Number(row.schema_version) !== 1) throw new MusicOrderError("电台云端顺序尚未初始化。", 503);
  let ids: unknown;
  try { ids = JSON.parse(String(row.track_ids)); } catch { throw new MusicOrderError("云端顺序暂时不可用。", 503); }
  if (!validMusicIds(ids) || !validMusicRevision(String(row.revision))) throw new MusicOrderError("云端顺序暂时不可用。", 503);
  return { revision: String(row.revision), trackIds: reconcileTrackIds(ids, defaultMusicOrder, true), updatedAt: row.updated_at === null ? null : String(row.updated_at) };
}
export async function getMusicOrder() {
  try { return await readOrder(musicOrderDatabase()); }
  catch (error) { if (unavailable(error)) throw new MusicOrderError("电台云端顺序尚未初始化。", 503); throw error; }
}
export async function saveMusicOrder(revision: unknown, trackIds: unknown) {
  if (!validMusicRevision(revision)) throw new MusicOrderError("请重新读取云端顺序后再保存。", 409);
  if (!validMusicIds(trackIds) || trackIds.some(id => !allowedIds.has(id))) throw new MusicOrderError("播放列表包含无效或重复的歌曲。", 400);
  const ids = reconcileTrackIds(trackIds, defaultMusicOrder, true);
  const transaction = await musicOrderDatabase().transaction("write");
  try {
    const current = await readOrder(transaction);
    if (current.revision !== revision) throw new MusicOrderError("另一窗口已更新顺序，请重新读取云端顺序后再调整。", 409);
    if (current.trackIds.join("\n") !== ids.join("\n")) {
      const result = await transaction.execute({ sql: "UPDATE BlogMusicOrder SET track_ids = ?, revision = revision + 1, updated_at = ? WHERE id = 1 AND revision = ?", args: [JSON.stringify(ids), new Date().toISOString(), revision] });
      if (result.rowsAffected !== 1) throw new MusicOrderError("云端顺序已更新，请重新读取。", 409);
    }
    const saved = await readOrder(transaction);
    await transaction.commit();
    return saved;
  } catch (error) {
    await transaction.rollback().catch(() => {});
    if (unavailable(error)) throw new MusicOrderError("电台云端顺序尚未初始化。", 503);
    throw error;
  } finally { transaction.close(); }
}
