import { generatePayloadCookie } from "payload/shared";
import { LockedAuth } from "payload";
import { cms } from "@/lib/db";
import { privateHeaders } from "@/lib/access";

export const dynamic = "force-dynamic";
const failure = (message: string, status: number) => Response.json({ errors: [{ message }] }, { status, headers: privateHeaders });
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(request.url).origin, new URL(process.env.SITE_URL || request.url).origin]);
  if (!origin || !allowed.has(origin)) return failure("请从本站登录页面提交。", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return failure("请使用登录表单提交。", 415);
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return failure("登录信息格式不正确。", 400); }
  if (!data || typeof data.username !== "string" || typeof data.password !== "string" || !data.username.trim() || !data.password || data.username.length > 128 || data.password.length > 1024) return failure("请输入有效的账号和密码。", 400);
  const username = data.username.trim().toLowerCase(), password = data.password;
  try {
    const client = await cms();
    // Identity comes only from a password-verified collection, never a client role.
    const collections = ["users", "members"] as const;
    const matches = await Promise.all(collections.map(collection => client.find({ collection, where: { username: { equals: username } }, limit: 1, depth: 0, overrideAccess: true, select: { username: true } })));
    let locked = false;
    for (let i = 0; i < collections.length; i++) {
      if (!matches[i].docs.length) continue;
      const collection = collections[i];
      try {
        const result = await client.login({ collection, data: { username, password }, depth: 0, overrideAccess: false, req: { headers: request.headers } });
        if (!result.token) throw new Error("Missing login token");
        const cookie = generatePayloadCookie({ collectionAuthConfig: client.collections[collection].config.auth, cookiePrefix: client.config.cookiePrefix, token: result.token });
        const kind = collection === "users" ? "admin" : "member";
        return Response.json({ authenticated: true, kind, redirectTo: kind === "admin" ? "/write" : "/my-notes" }, { headers: { ...privateHeaders, "Set-Cookie": cookie } });
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 401 && status !== 403) throw error;
        locked ||= error instanceof LockedAuth;
      }
    }
    return failure(locked ? "登录未成功，账号可能暂时锁定，请稍后再试。" : "账号或密码不正确；还没有账号的话，请先注册。", locked ? 429 : 401);
  } catch { return failure("登录服务暂时不可用，请稍后重试。", 503); }
}
