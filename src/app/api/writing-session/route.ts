import { headers } from "next/headers";
import { cms } from "@/lib/db";
import { isAdmin, isMember } from "@/lib/access";
import { mediaURL } from "@/lib/media-url";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const client = await cms();
  const { user } = await client.auth({ headers: await headers() });
  const kind = isAdmin(user) ? "admin" : isMember(user) ? "member" : null;
  let profile: { username: string; name: string; avatar: string } | undefined;
  if (user && kind && new URL(request.url).searchParams.get("profile") === "1") {
    if (kind === "member") {
      const member = await client.findByID({ collection: "members", id: user.id, user, overrideAccess: false, depth: 1 });
      profile = { username: member.username || "", name: member.name, avatar: mediaURL(member.avatar) };
    } else {
      const settings = await client.findGlobal({ slug: "site-settings", user, overrideAccess: false, depth: 1 });
      profile = { username: user.username || "", name: user.name || settings.author || "管理员", avatar: mediaURL(settings.avatar) };
    }
  }
  return Response.json({ authenticated: Boolean(user), kind, ...(profile ? { profile } : {}) }, { headers: {
    "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store",
  } });
}
