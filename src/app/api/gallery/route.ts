import { revalidatePath } from "next/cache";
import { isAdmin, privateHeaders } from "@/lib/access";
import { cms } from "@/lib/db";
import { GalleryError, categoryName, galleryDatabase, getGallerySnapshot, mutateGallery, type GalleryMediaImage, type GalleryMutation } from "@/lib/gallery-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MAX_JSON_BYTES = 64 * 1024;
const failure = (message: string, status: number) => Response.json({ errors: [{ message }] }, { status, headers: privateHeaders });
const errorResponse = (error: unknown) => error instanceof GalleryError
  ? failure(error.message, error.status)
  : failure("照片墙服务暂时不可用，请稍后重试。", 503);

function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(request.url).origin, new URL(process.env.SITE_URL || request.url).origin]);
  if (!origin || !allowed.has(origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new GalleryError("请从本站照片墙提交操作。", 403);
}
async function requireAdmin(request: Request) {
  const client = await cms();
  const { user } = await client.auth({ headers: request.headers });
  if (!isAdmin(user)) throw new GalleryError("请先登录管理员账号。", 403);
  return { client, user: user! };
}
async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) throw new GalleryError("请使用照片墙表单提交。", 415);
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_JSON_BYTES) throw new GalleryError("提交的信息过大。", 413);
  if (!request.body) throw new GalleryError("没有收到操作信息。", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_JSON_BYTES) { await reader.cancel(); throw new GalleryError("提交的信息过大。", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer)); }
  catch { throw new GalleryError("操作信息格式不正确。", 400); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new GalleryError("操作信息格式不正确。", 400);
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/.test(value)) throw new GalleryError("图片或相册编号不正确。", 400);
  return value;
}
function name(value: unknown): string {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) throw new GalleryError("请输入有效的相册名称。", 400);
  const result = categoryName(value);
  if (!result || Array.from(result).length > 40) throw new GalleryError("相册名称需要 1—40 个字。", 400);
  return result;
}
function revision(value: unknown): string {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d{0,15})$/.test(value)) throw new GalleryError("请刷新照片墙后再提交。", 409);
  return value;
}
async function mediaImages(values: unknown, auth: Awaited<ReturnType<typeof requireAdmin>>): Promise<GalleryMediaImage[]> {
  if (!Array.isArray(values) || !values.length || values.length > 20 || values.some(value => typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)) throw new GalleryError("每次请选择 1—20 张有效图片。", 400);
  const ids = [...new Set(values as number[])];
  const images: GalleryMediaImage[] = [];
  for (const mediaId of ids) {
    // Only the public Payload media collection is accepted. URLs, file paths,
    // private-media IDs and caller-supplied dimensions are never persisted.
    const media = await auth.client.findByID({ collection: "media", id: mediaId, user: auth.user, overrideAccess: false, depth: 0 }).catch(() => null);
    if (!media) throw new GalleryError("有图片不存在，请重新上传后再试。", 404);
    const { filename, mimeType, width, height, filesize } = media;
    if (!filename || /[/\\\u0000-\u001f\u007f]/.test(filename) || filename.length > 255 || !["image/jpeg", "image/png", "image/webp"].includes(mimeType || "")) throw new GalleryError("照片墙只支持 JPG、PNG 或 WebP 图片。", 400);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || !width || !height || width < 1 || height < 1 || width > 20000 || height > 20000 || !Number.isSafeInteger(filesize) || !filesize || filesize < 1 || filesize > 3000000) throw new GalleryError("图片尺寸或大小不符合要求，请重新上传 3 MB 以内的图片。", 400);
    const blob = (await galleryDatabase().execute({ sql: "SELECT mime, length(data) AS bytes FROM BlogMediaBlob WHERE filename = ?", args: [filename] })).rows[0];
    if (!blob || Number(blob.bytes) < 1 || Number(blob.bytes) > 3000000 || String(blob.mime) !== mimeType) throw new GalleryError("图片文件尚未保存完整，请重新上传。", 400);
    const version = Date.parse(media.updatedAt);
    const src = `/api/media/file/${encodeURIComponent(filename)}${Number.isFinite(version) ? `?v=${version}` : ""}`;
    images.push({ mediaId, src, width, height });
  }
  return images;
}
async function mutation(data: Record<string, unknown>, auth: Awaited<ReturnType<typeof requireAdmin>>): Promise<GalleryMutation> {
  const currentRevision = revision(data.revision);
  switch (data.action) {
    case "createCategory": return { action: data.action, name: name(data.name), revision: currentRevision };
    case "renameCategory": return { action: data.action, categoryId: id(data.categoryId), name: name(data.name), revision: currentRevision };
    case "deleteCategory": case "restoreCategory": return { action: data.action, categoryId: id(data.categoryId), revision: currentRevision };
    case "deleteImage": case "restoreImage": return { action: data.action, id: id(data.id), revision: currentRevision };
    case "moveImage": return { action: data.action, id: id(data.id), categoryId: id(data.categoryId), revision: currentRevision };
    case "addImage": case "addImages": return {
      action: "addImages", categoryId: id(data.categoryId), revision: currentRevision,
      images: await mediaImages(data.action === "addImage" ? [data.mediaId] : data.mediaIds, auth),
    };
    default: throw new GalleryError("不支持的照片墙操作。", 400);
  }
}

export async function GET(request: Request) {
  try {
    const includeTrash = new URL(request.url).searchParams.get("trash") === "1";
    if (includeTrash) await requireAdmin(request);
    const data = await getGallerySnapshot({ includeTrash });
    return Response.json(data, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const auth = await requireAdmin(request);
    const command = await mutation(await jsonBody(request), auth);
    const data = await mutateGallery(command);
    try {
      revalidatePath("/", "page");
      revalidatePath("/gallery", "page");
      revalidatePath("/megumin", "page");
    } catch {
      // The DB commit has succeeded. Never turn a cache refresh issue into an
      // apparent failed upload/deletion; clients already receive the new state.
      console.warn("[gallery] Page cache refresh deferred.");
    }
    return Response.json(data, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
