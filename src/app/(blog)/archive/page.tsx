import Link from "next/link";
import { getPublicPosts } from "@/lib/db";
import { formatDate } from "@/lib/domain";
import Icon from "@/components/Icon";
export const metadata = { title: "文字归档" };
export default async function Archive({ searchParams }: { searchParams: Promise<{ category?: string; tag?: string }> }) {
  const { category,tag } = await searchParams, all = await getPublicPosts();
  const posts = all.filter(p => (!category || p.category === category) && (!tag || p.tags.includes(tag))).sort((a,b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  const years = [...new Set(posts.map(p => new Date(p.publishedAt!).getFullYear()))];
  return <main id="main" className="wrap narrow interior"><div className="page-heading"><span className="eyebrow">COLLECTED MOMENTS</span><h1>文字的足迹</h1><p>写过的日子，都在这里。共 {posts.length} 篇记录。</p></div><div className="archive-filters"><Link href="/archive" className={!category&&!tag?"selected":""}>全部文章</Link>{[...new Set(all.map(p=>p.category))].map(c => <Link key={c} href={`/archive?category=${encodeURIComponent(c)}`} className={category===c?"selected":""}>{c}</Link>)}</div>{tag&&<p className="muted">标签：#{tag} <Link href="/archive">清除筛选</Link></p>}
    {posts.length === 0 && <div className="empty-state"><Icon name="book" size={32}/><h2>这一页，还等着新的故事。</h2><Link href="/" className="text-button">回到首页 <Icon name="arrow" size={16}/></Link></div>}
    {years.map(year => <section className="archive-year" key={year}><h2>{year}<span>{posts.filter(p=>new Date(p.publishedAt!).getFullYear()===year).length} 篇</span></h2>{posts.filter(p=>new Date(p.publishedAt!).getFullYear()===year).map(p => <Link href={`/posts/${encodeURIComponent(p.slug)}`} className="archive-row" key={p.id}><time>{formatDate(p.publishedAt,true)}</time><h3>{p.title}</h3><span className="category-label">{p.category}</span><Icon name="upRight" size={18}/></Link>)}</section>)}
  </main>;
}
