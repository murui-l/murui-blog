import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicPost, getPublicPosts, getSettings } from "@/lib/db";
import { formatDate, readingTime } from "@/lib/domain";
import RichContent from "@/components/RichContent";
import Icon from "@/components/Icon";
import SoftImage from "@/components/SoftImage";
import ArticleTOC from "@/components/ArticleTOC";
import { prepareArticleHeadings } from "@/lib/article-headings";
import "@/components/ArticleJournal.css";
export function generateStaticParams() { return []; }
export const revalidate=300;
export async function generateMetadata({ params }: { params: Promise<{slug:string}> }): Promise<Metadata> {
  const p = await getPublicPost((await params).slug);
  return p ? { title: p.title, description: p.excerpt, alternates: { canonical: `/posts/${encodeURIComponent(p.slug)}` }, openGraph: { title: p.title, description: p.excerpt, type: "article", publishedTime: p.publishedAt || undefined, ...(p.cover ? { images: [p.cover] } : {}) } } : { title: "文章未找到" };
}
export default async function Article({ params }: { params: Promise<{slug:string}> }) {
  const p = await getPublicPost((await params).slug);
  if (!p) notFound();
  const [s,posts] = await Promise.all([getSettings(),getPublicPosts()]);
  const others = posts.filter(x=>x.id!==p.id).slice(0,2);
  const prepared = p.richContent ? prepareArticleHeadings(p.richContent) : null;
  const hasTOC = !!prepared && prepared.headings.length >= 3;
  return <main id="main" className={`wrap article-wrap article-journal${hasTOC ? " article-journal-with-toc" : ""}`}>
    <span className="aj-tape" aria-hidden="true" />
    <Link href="/" className="back-link">← 回到小窝</Link>
    <article className={`aj-layout${hasTOC ? " aj-layout-with-toc" : ""}`}>
      <header className="article-heading">
        <div className="aj-heading-meta"><Link className="category-label" href={`/archive?category=${encodeURIComponent(p.category)}`}>{p.category}</Link><time className="aj-date-stamp" dateTime={p.publishedAt || undefined}>{formatDate(p.publishedAt)}</time></div>
        <h1>{p.title}</h1>
        <p className="article-excerpt">{p.excerpt}</p>
        <div className="article-byline"><span className="mini-avatar">{s.author.slice(0,1)}</span><span>{s.author}</span><span aria-hidden="true">·</span><span>{readingTime(p.content)} 分钟阅读</span></div>
      </header>
      {prepared && <ArticleTOC headings={prepared.headings} />}
      <div className="aj-reading">
        {p.cover && <SoftImage className="aj-cover" src={p.cover} alt={p.title} width={p.coverWidth || 1600} height={p.coverHeight || 1000} sizes="(max-width: 650px) calc(100vw - 64px), (max-width: 1050px) calc(100vw - 140px), 740px" priority />}
        {prepared && <RichContent data={prepared.data} journal />}
        <footer className="article-end"><div className="post-tags">{p.tags.map(t=><Link key={t} href={`/archive?tag=${encodeURIComponent(t)}`}># {t}</Link>)}</div><p>感谢你读到这里。<Icon name="leaf" size={16}/></p><span className="aj-signature">{s.author} <span aria-hidden="true">✿</span></span></footer>
      </div>
    </article>
    {others.length>0 && <section className="related"><span className="eyebrow">STAY A LITTLE LONGER</span><h2>或许，你还想读</h2><div>{others.map(p=><Link href={`/posts/${encodeURIComponent(p.slug)}`} key={p.id}><span>{p.category}</span><h3>{p.title}</h3><Icon name="arrow" size={20}/></Link>)}</div></section>}
  </main>;
}

