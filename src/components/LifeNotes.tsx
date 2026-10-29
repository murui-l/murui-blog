import Link from "next/link";
import type { Post } from "@/lib/domain";
import { formatDate } from "@/lib/domain";
import Icon from "./Icon";
import "./LifeNotes.css";

export default function LifeNotes({ posts, standalone = false }: { posts: Post[]; standalone?: boolean }) {
  const notes = posts.filter(post => ["生活随笔", "随笔"].includes(post.category)).sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  const visible = standalone ? notes : notes.slice(0, 3);
  const Heading = standalone ? "h1" : "h2";
  return <section id="life-notes" className={`life-notes${standalone ? " life-notes-page" : ""}`} aria-labelledby="life-notes-title">
    <div className="life-notes-heading">
      <div><p className="life-notes-kicker"><span aria-hidden="true">✿</span> LITTLE MOMENTS, BIG MEMORIES</p><Heading id="life-notes-title">沐瑞の生活随笔<span aria-hidden="true">.</span></Heading><p className="life-notes-description">记一顿好吃的饭，一场偶遇的晚霞，也记今天的自己。</p></div>
      <span className="life-notes-mark" aria-hidden="true"><Icon name="pen" size={34}/><span>把日子写慢一点</span></span>
    </div>
    {visible.length ? <div className="life-notes-grid">{visible.map((post, index) => <article className="life-notes-card" key={post.id}>
      <Link href={`/posts/${encodeURIComponent(post.slug)}`}>
        <div className="life-notes-meta"><time dateTime={post.publishedAt || undefined}>{formatDate(post.publishedAt, true)}</time><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span></div>
        <h3>{post.title}</h3><p>{post.excerpt}</p>
        <span className="life-notes-read">读这一页 <Icon name="arrow" size={17}/></span>
      </Link>
    </article>)}</div> : <div className="life-notes-empty">
      <div className="life-notes-paper" aria-hidden="true"><span>Dear diary,</span><i/><i/><i/><b>♡</b></div>
      <div><span className="life-notes-empty-label">日子里的小小片刻</span><h3>留一页，给今天。</h3><p>那些想记住的心情、琐事和小确幸，<br/>会慢慢写在这里。</p></div>
    </div>}
    <div className="life-notes-footer"><span>{notes.length ? `${notes.length} 篇随笔 · 慢慢记录，慢慢收藏` : "故事未完，日常待续。"}</span>{standalone ? <Link href="/">回到小窝 <Icon name="arrow" size={16}/></Link> : <Link href="/notes">翻开随笔本 <Icon name="arrow" size={16}/></Link>}</div>
  </section>;
}
