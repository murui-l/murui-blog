import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cms } from "@/lib/db";
import { isMember } from "@/lib/access";
import MemberProfile from "@/components/MemberProfile";
import type { WritingMedia } from "@/lib/writing";
export const dynamic = "force-dynamic";
export const metadata = { title: "个人资料", robots: { index: false, follow: false } };
export default async function Account() {
  const client = await cms();
  const { user } = await client.auth({ headers: await headers() });
  if (!user) redirect("/login");
  if (!isMember(user)) redirect("/write");
  const member = await client.findByID({ collection: "members", id: user.id, user, overrideAccess: false, depth: 1 });
  return <main id="main" className="profile-page wrap"><MemberProfile initial={{ id: member.id, username: member.username || "", name: member.name, bio: member.bio || "", avatar: typeof member.avatar === "object" ? member.avatar as WritingMedia | null : null }} /></main>;
}
