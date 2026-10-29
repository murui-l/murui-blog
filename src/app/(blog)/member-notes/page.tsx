/* eslint-disable @next/next/no-img-element */
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { cms } from "@/lib/db";
import { isAdmin } from "@/lib/access";
import { mediaURL } from "@/lib/media-url";
import RichContent from "@/components/RichContent";
import "@/components/writing/Writing.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "用户随笔", robots: { index: false, follow: false } };
export default async function MemberNotes({ searchParams }: { searchParams: Promise<{ id?: string; page?: string }> }) {
  const client = await cms(), { user } = await client.auth({ headers: await headers() });
  if (!isAdmin(user)) redirect("/write");
  const query = await searchParams;
  if (query.id) {
    let note;
    try { note = await client.findByID({ collection: "private-notes", id: Number(query.id), user, overrideAccess: false, depth: 1 }); } catch { notFound(); }
    return <main id="main" className="wrap article-wrap"><a href="/member-notes">← 用户随笔</a><p className="writer-privacy">管理员查看 · 此随笔不公开</p><h1>{note.title}</h1>{mediaURL(note.cover) && <img className="article-cover" src={mediaURL(note.cover)} alt={note.title} />}<RichContent data={note.content} /></main>;
  }
  const page = Math.max(1, Number(query.page) || 1);
  const result = await client.find({ collection: "private-notes", page, limit: 20, sort: "-updatedAt", user, overrideAccess: false, depth: 1, select: { title: true, owner: true, updatedAt: true } });
  return <main id="main" className="wrap writing-page"><h1>用户随笔</h1><p className="writer-hint">这里仅管理员可以查看，用户之间互不可见。</p><div className="writer-post-list">{result.docs.map(note => <a key={note.id} href={`/member-notes?id=${note.id}`}><span><small>{typeof note.owner === "object" ? note.owner.name : `用户 #${note.owner}`}</small><strong>{note.title}</strong></span><span>查看 →</span></a>)}</div>{!result.docs.length && <p>还没有用户随笔。</p>}<div className="writer-pagination">{page > 1 && <a href={`/member-notes?page=${page - 1}`}>上一页</a>}{result.hasNextPage && <a href={`/member-notes?page=${page + 1}`}>下一页</a>}</div></main>;
}
