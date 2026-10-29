import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { cms } from "@/lib/db";
import { isAdmin, isMember } from "@/lib/access";
import type { WritingPost } from "@/lib/writing";
import WritingWorkspace from "@/components/writing/WritingWorkspace";
import MemberLogin from "@/components/writing/MemberLogin";
import "@/components/writing/Writing.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "时间切片", robots: { index: false, follow: false } };
export default async function MyNotes({ searchParams }: { searchParams: Promise<{ id?: string; new?: string }> }) {
  const client = await cms(), { user } = await client.auth({ headers: await headers() });
  if (isAdmin(user)) redirect("/write?view=posts");
  if (!isMember(user)) return <main id="main" className="wrap writing-page"><MemberLogin /></main>;
  const query = await searchParams;
  let post: WritingPost | undefined;
  if (query.id) {
    if (!/^\d+$/.test(query.id)) notFound();
    try { post = await client.findByID({ collection: "private-notes", id: Number(query.id), user, overrideAccess: false, depth: 1 }) as unknown as WritingPost; } catch { notFound(); }
  }
  return <main id="main" className="wrap writing-page"><p className="writer-privacy">🔒 时间切片 · 仅本人和网站管理员可见，不会公开发布。</p><WritingWorkspace key={post?.id ?? query.new ?? "list"} initialPost={post} category="生活随笔" showPosts={!query.id && query.new !== "1"} privateMode /></main>;
}
