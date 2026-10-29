import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isMember } from "@/lib/access";
import { cms } from "@/lib/db";
import type { WritingPost } from "@/lib/writing";
import WriterLogin from "@/components/writing/WriterLogin";
import WritingWorkspace from "@/components/writing/WritingWorkspace";
import "@/components/writing/Writing.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "小窝写作", robots: { index: false, follow: false } };
export default async function Write({ searchParams }: { searchParams: Promise<{ id?: string; category?: string; view?: string }> }) {
  const client = await cms();
  const { user } = await client.auth({ headers: await headers() });
  if (isMember(user)) redirect("/my-notes");
  if (!user) return <main id="main" className="wrap writing-page"><WriterLogin /></main>;
  const query = await searchParams;
  let post: WritingPost | undefined;
  if (query.id) {
    if (!/^\d+$/.test(query.id)) notFound();
    try {
      const doc = await client.findByID({ collection: "posts", id: Number(query.id), draft: true, depth: 1, user, overrideAccess: false });
      if (doc.deletedAt) notFound();
      post = doc as unknown as WritingPost;
    } catch { notFound(); }
  }
  return <main id="main" className="wrap writing-page"><WritingWorkspace key={post?.id ?? query.view ?? query.category ?? "new"} initialPost={post} category={query.category === "文章" ? "文章" : "生活随笔"} showPosts={query.view === "posts"} /></main>;
}
