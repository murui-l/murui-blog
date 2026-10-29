import { headers } from "next/headers";
import { cms } from "@/lib/db";
import { isMember, privateHeaders } from "@/lib/access";

export const dynamic = "force-dynamic";
export async function GET() {
  const client = await cms();
  const { user } = await client.auth({ headers: await headers() });
  if (!user || !isMember(user)) return Response.json({ member: false }, { headers: privateHeaders });
  const result = await client.find({ collection: "private-notes", user, overrideAccess: false,
    where: { owner: { equals: user.id } }, sort: "-updatedAt", limit: 3, depth: 0,
    select: { title: true, excerpt: true, updatedAt: true } });
  return Response.json({ member: true, total: result.totalDocs, notes: result.docs.map(note => ({
    id: note.id, title: note.title, excerpt: note.excerpt || "", updatedAt: note.updatedAt,
  })) }, { headers: privateHeaders });
}
