import { randomUUID } from "node:crypto";
import { createClient, type Client, type Row, type Transaction } from "@libsql/client";
import { galleryCatalog } from "./gallery-catalog";
import type { GalleryCategory, GalleryImage, GallerySnapshot } from "./gallery-types";

type Catalog = { categories: GalleryCategory[]; images: GalleryImage[] };
type GalleryReader = Pick<Transaction, "execute" | "batch">;
export type GalleryMediaImage = { mediaId: number; src: string; width: number; height: number };
export type GalleryMutation = { revision: string } & (
  | { action: "createCategory"; name: string }
  | { action: "renameCategory"; categoryId: string; name: string }
  | { action: "deleteCategory" | "restoreCategory"; categoryId: string }
  | { action: "deleteImage" | "restoreImage"; id: string }
  | { action: "moveImage"; id: string; categoryId: string }
  | { action: "addImages"; categoryId: string; images: GalleryMediaImage[] }
);

export class GalleryError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
const state = globalThis as unknown as { galleryClient?: Client };
export function galleryDatabase(): Client {
  // No schema creation here: reads and deployments must never migrate a DB.
  return state.galleryClient ??= createClient({
    url: process.env.TURSO_URL || process.env.DATABASE_URL || "file:payload-local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}
const missingSchema = (error: unknown) => error instanceof Error && /no such table:\s*BlogGallery/i.test(error.message);
export const categoryName = (name: string) => name.normalize("NFKC").trim().replace(/\s+/g, " ");
const nameKey = (name: string) => categoryName(name).toLocaleLowerCase("zh-CN");

type StoredData = { revision: string; categories: Row[]; images: Row[] };
async function storedData(reader: GalleryReader): Promise<StoredData> {
  const [meta, categories, images] = await reader.batch([
    "SELECT schema_version, revision FROM BlogGalleryMeta WHERE id = 1",
    "SELECT id, name, deleted_at FROM BlogGalleryAlbum ORDER BY created_at, id",
    "SELECT id, kind, category_id, media_id, src, width, height, deleted_at FROM BlogGalleryImage ORDER BY created_at, id",
  ]);
  if (Number(meta.rows[0]?.schema_version) !== 1) throw new GalleryError("照片墙尚未完成初始化，请联系管理员。", 503);
  return { revision: String(meta.rows[0].revision), categories: categories.rows, images: images.rows };
}
function snapshot(data: StoredData, catalog: Catalog, includeTrash: boolean): GallerySnapshot {
  const categories = new Map(catalog.categories.map(category => [category.id, { ...category }]));
  const hiddenCategories = new Set<string>();
  for (const row of data.categories) {
    const id = String(row.id);
    if (row.deleted_at) { categories.delete(id); hiddenCategories.add(id); }
    else categories.set(id, { id, name: String(row.name) });
  }
  const images = new Map(catalog.images.map(image => [image.id, { ...image }]));
  const deleted = new Map<string, string>();
  for (const row of data.images) {
    const id = String(row.id);
    if (row.kind === "upload") images.set(id, {
      id, categoryId: String(row.category_id), src: String(row.src),
      width: Number(row.width), height: Number(row.height),
    });
    else if (images.has(id)) images.set(id, { ...images.get(id)!, categoryId: String(row.category_id) });
    // Removed catalog entries are never reintroduced by an old override row.
    if (row.deleted_at) deleted.set(id, String(row.deleted_at));
  }
  const visible: GalleryImage[] = [];
  const trash: Array<GalleryImage & { deletedAt: string }> = [];
  for (const image of images.values()) {
    if (deleted.has(image.id)) { if (includeTrash) trash.push({ ...image, deletedAt: deleted.get(image.id)! }); }
    else if (!hiddenCategories.has(image.categoryId) && categories.has(image.categoryId)) visible.push(image);
  }
  return { categories: [...categories.values()], images: visible, revision: data.revision, ...(includeTrash ? { trash } : {}) };
}

export async function readGallerySnapshot(options: { includeTrash?: boolean; client?: Client; catalog?: Catalog } = {}): Promise<GallerySnapshot> {
  const client = options.client || galleryDatabase();
  const catalog = options.catalog || galleryCatalog;
  const transaction = await client.transaction("read");
  try {
    const result = snapshot(await storedData(transaction), catalog, Boolean(options.includeTrash));
    await transaction.commit();
    return result;
  } catch (error) {
    if (missingSchema(error)) return { categories: catalog.categories.map(item => ({ ...item })), images: catalog.images.map(item => ({ ...item })), revision: "uninitialized", ...(options.includeTrash ? { trash: [] } : {}) };
    throw error;
  } finally { transaction.close(); }
}

export const getGallerySnapshot = readGallerySnapshot;

export async function mutateGallery(command: GalleryMutation, options: { client?: Client; catalog?: Catalog } = {}): Promise<GallerySnapshot> {
  const catalog = options.catalog || galleryCatalog;
  const transaction = await (options.client || galleryDatabase()).transaction("write");
  try {
    const data = await storedData(transaction);
    const current = snapshot(data, catalog, true);
    const allCategories = new Map([...catalog.categories, ...data.categories.map(row => ({ id: String(row.id), name: String(row.name) }))].map(item => [item.id, item]));
    const category = (id: string) => {
      const found = current.categories.find(item => item.id === id);
      if (!found) throw new GalleryError("相册不存在或已删除，请刷新后再试。", 404);
      return found;
    };
    const image = (id: string) => {
      const found = current.images.find(item => item.id === id) || current.trash?.find(item => item.id === id);
      if (!found) throw new GalleryError("图片不存在，请刷新后再试。", 404);
      return found;
    };
    // A response can be lost after commit. Replaying an already-added media batch
    // is harmless and must not duplicate it or overwrite a later move/deletion.
    if (command.action === "addImages" && command.images.length && command.images.every(item => data.images.some(row => Number(row.media_id) === item.mediaId && row.category_id === command.categoryId && !row.deleted_at))) {
      await transaction.commit();
      return current;
    }
    if (command.revision !== data.revision) throw new GalleryError("照片墙已在另一个窗口更新，请刷新后再提交。", 409);
    const now = new Date().toISOString();
    const saveCategory = async (value: GalleryCategory, deletedAt: string | null = null) => {
      await transaction.execute({ sql: "INSERT INTO BlogGalleryAlbum (id,name,name_key,deleted_at,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_key=excluded.name_key,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at", args: [value.id, value.name, nameKey(value.name), deletedAt, now, now] });
    };
    const ensureCategory = async (id: string) => { const value = category(id); await saveCategory(value); return value; };
    const uniqueName = (name: string, id?: string) => {
      if (current.categories.some(item => item.id !== id && nameKey(item.name) === nameKey(name))) throw new GalleryError("已经有同名相册，请换一个名字。", 409);
    };
    const saveImage = async (value: GalleryImage, deletedAt: string | null) => {
      await ensureCategory(value.categoryId);
      const stored = data.images.find(row => row.id === value.id);
      await transaction.execute({ sql: "INSERT INTO BlogGalleryImage (id,kind,category_id,media_id,src,width,height,deleted_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at", args: [value.id, stored?.kind === "upload" ? "upload" : "static", value.categoryId, stored?.media_id ?? null, stored?.src ?? null, value.width, value.height, deletedAt, now, now] });
    };
    switch (command.action) {
      case "createCategory": {
        if (current.categories.length >= 100) throw new GalleryError("最多可以创建 100 个相册。", 400);
        const name = categoryName(command.name); uniqueName(name);
        await saveCategory({ id: `album-${randomUUID()}`, name });
        break;
      }
      case "renameCategory": {
        const found = category(command.categoryId); const name = categoryName(command.name); uniqueName(name, found.id);
        await saveCategory({ ...found, name });
        break;
      }
      case "deleteCategory": {
        const found = category(command.categoryId);
        if (current.images.some(item => item.categoryId === found.id) || current.trash?.some(item => item.categoryId === found.id)) throw new GalleryError("相册里还有图片（包括回收站中的图片），请先移动图片再删除相册。", 409);
        await saveCategory(found, now);
        break;
      }
      case "restoreCategory": {
        const found = allCategories.get(command.categoryId);
        if (!found || !data.categories.some(row => row.id === found.id && row.deleted_at)) throw new GalleryError("没有找到可恢复的相册。", 404);
        uniqueName(found.name, found.id); await saveCategory(found);
        break;
      }
      case "deleteImage": await saveImage(image(command.id), now); break;
      case "restoreImage": await saveImage(image(command.id), null); break;
      case "moveImage": {
        category(command.categoryId);
        if (current.trash?.some(item => item.id === command.id)) throw new GalleryError("请先恢复这张图片，再移动相册。", 409);
        await saveImage({ ...image(command.id), categoryId: command.categoryId }, null);
        break;
      }
      case "addImages": {
        await ensureCategory(command.categoryId);
        if (current.images.length + (current.trash?.length || 0) + command.images.length > 5000) throw new GalleryError("照片墙最多保存 5000 张图片。", 400);
        for (const item of command.images) {
          const existing = data.images.find(row => Number(row.media_id) === item.mediaId);
          if (existing) {
            if (existing.deleted_at) throw new GalleryError("这张图片已在回收站，请通过回收站恢复。", 409);
            if (existing.category_id !== command.categoryId) throw new GalleryError("这张图片已在另一个相册，请使用移动功能。", 409);
            continue;
          }
          await transaction.execute({ sql: "INSERT INTO BlogGalleryImage (id,kind,category_id,media_id,src,width,height,created_at,updated_at) VALUES (?,'upload',?,?,?,?,?,?,?)", args: [`media-${item.mediaId}`, command.categoryId, item.mediaId, item.src, item.width, item.height, now, now] });
        }
        break;
      }
    }
    await transaction.execute("UPDATE BlogGalleryMeta SET revision = revision + 1 WHERE id = 1");
    const result = snapshot(await storedData(transaction), catalog, true);
    await transaction.commit();
    return result;
  } catch (error) {
    if (missingSchema(error)) throw new GalleryError("照片墙尚未完成初始化，请联系管理员。", 503);
    throw error;
  } finally { transaction.close(); }
}
