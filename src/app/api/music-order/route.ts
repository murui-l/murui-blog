import { cms } from "@/lib/db";
import { isAdmin, privateHeaders } from "@/lib/access";
import { getMusicOrder, saveMusicOrder, MusicOrderError } from "@/lib/music-order-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const failure = (message: string, status: number) => Response.json({ message }, { status, headers: privateHeaders });
const errorResponse = (error: unknown) => error instanceof MusicOrderError ? failure(error.message, error.status)
  : failure("云端顺序暂时无法连接，请稍后重试。", 503);
async function canEdit(request: Request) {
  const { user } = await (await cms()).auth({ headers: request.headers });
  return isAdmin(user);
}
async function body(request: Request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) throw new MusicOrderError("请从播放列表保存顺序。", 415);
  if (Number(request.headers.get("content-length")) > 16_384) throw new MusicOrderError("提交的信息过大。", 413);
  if (!request.body) throw new MusicOrderError("没有收到顺序。", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16_384) { await reader.cancel(); throw new MusicOrderError("提交的信息过大。", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer)); } catch { throw new MusicOrderError("顺序格式不正确。", 400); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new MusicOrderError("顺序格式不正确。", 400);
  return value as Record<string, unknown>;
}
export async function GET(request: Request) {
  try {
    const [order, editable] = await Promise.all([getMusicOrder(), canEdit(request)]);
    return Response.json({ ...order, canEdit: editable }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const allowed = new Set([new URL(request.url).origin, new URL(process.env.SITE_URL || request.url).origin]);
    if (!origin || !allowed.has(origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new MusicOrderError("请从本站播放列表保存顺序。", 403);
    if (!await canEdit(request)) throw new MusicOrderError("只有管理员可以修改全站播放顺序。", 403);
    const data = await body(request);
    return Response.json({ ...await saveMusicOrder(data.revision, data.trackIds), canEdit: true }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
