import { createClient, type Client } from "@libsql/client";
import type { Adapter } from "@payloadcms/plugin-cloud-storage/types";
import { isMember, isAdmin, privateHeaders } from "./access";
const state = globalThis as unknown as { mediaClient?: Client; mediaReady?: Promise<unknown> };
export async function mediaStore() {
  state.mediaClient ??= createClient({ url: process.env.TURSO_URL || process.env.DATABASE_URL || "file:payload-local.db", authToken: process.env.TURSO_AUTH_TOKEN });
  state.mediaReady ??= state.mediaClient.execute("CREATE TABLE IF NOT EXISTS BlogMediaBlob (filename TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL)").catch(e=>{state.mediaReady=undefined;throw e;});
  await state.mediaReady;
  return state.mediaClient;
}
// Implements Payload's official cloud-storage adapter contract. Images survive
// serverless redeployments and can move together with the SQLite database.
export const tursoMediaAdapter: Adapter = () => ({
  name: "turso-media",
  async handleUpload({ file }) {
    if (file.buffer.length>3000000) throw new Error("图片过大，请缩小到 3 MB 以内");
    await (await mediaStore()).execute({ sql:"INSERT INTO BlogMediaBlob(filename,mime,data) VALUES (?,?,?) ON CONFLICT(filename) DO UPDATE SET mime=excluded.mime,data=excluded.data", args:[file.filename,file.mimeType,file.buffer] });
  },
  async handleDelete({ filename }) { await (await mediaStore()).execute({sql:"DELETE FROM BlogMediaBlob WHERE filename=?",args:[filename]}); },
  async staticHandler(_req, { params, headers }) {
    const row=(await (await mediaStore()).execute({sql:"SELECT mime,data FROM BlogMediaBlob WHERE filename=?",args:[params.filename]})).rows[0];
    if(!row)return new Response(null,{status:404,headers:{"Cache-Control":"no-store"}});
    const responseHeaders=new Headers(headers);responseHeaders.set("Content-Type",String(row.mime));responseHeaders.set("X-Content-Type-Options","nosniff");
    responseHeaders.set("Cache-Control","public, max-age=60");
    responseHeaders.set("CDN-Cache-Control","public, max-age=300, stale-while-revalidate=60");
    responseHeaders.set("Vercel-CDN-Cache-Control","public, max-age=300, stale-while-revalidate=60");
    return new Response(new Uint8Array(row.data as ArrayBuffer),{headers:responseHeaders});
  },
});

// A separate BLOB table prevents a private filename being served through /api/media/file.
export const privateMediaAdapter: Adapter = () => ({
  name: "turso-private-media",
  async handleUpload({ file }) {
    if (file.buffer.length > 3000000) throw new Error("图片过大，请缩小到 3 MB 以内");
    await (await mediaStore()).execute({ sql: "INSERT INTO BlogPrivateMediaBlob(filename,mime,data) VALUES (?,?,?) ON CONFLICT(filename) DO UPDATE SET mime=excluded.mime,data=excluded.data", args: [file.filename, file.mimeType, file.buffer] });
  },
  async handleDelete({ filename }) { await (await mediaStore()).execute({ sql: "DELETE FROM BlogPrivateMediaBlob WHERE filename=?", args: [filename] }); },
  async staticHandler(req, { params }) {
    if (!isMember(req.user) && !isAdmin(req.user)) return new Response(null, { status: 404, headers: privateHeaders });
    const allowed = await req.payload.find({ collection: "private-media", where: { filename: { equals: params.filename } }, limit: 1, depth: 0, req, overrideAccess: false });
    if (!allowed.docs.length) return new Response(null, { status: 404, headers: privateHeaders });
    const row = (await (await mediaStore()).execute({ sql: "SELECT mime,data FROM BlogPrivateMediaBlob WHERE filename=?", args: [params.filename] })).rows[0];
    if (!row) return new Response(null, { status: 404, headers: privateHeaders });
    return new Response(new Uint8Array(row.data as ArrayBuffer), { headers: { ...privateHeaders, "Content-Type": String(row.mime), "X-Content-Type-Options": "nosniff" } });
  },
});
