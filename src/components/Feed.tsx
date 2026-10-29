"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import type { Post } from "@/lib/domain";
import { formatDate } from "@/lib/domain";
import Icon from "./Icon";
import Cottage from "./Cottage";
export default function Feed({ posts }: { posts: Post[] }) {
  const [category, setCategory] = useState("全部"), [query, setQuery] = useState(""), [limit, setLimit] = useState(8);
  const categories = ["全部", ...new Set(posts.map(p => p.category))];
  const filtered = posts.filter(p => (category === "全部" || p.category === category) && `${p.title} ${p.excerpt} ${p.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase().trim()));
  const [first, ...rest] = filtered.slice(0, limit);
  return <section id="articles" className="feed-section"><div className="section-heading"><div><span className="eyebrow">THE JOURNAL</span><h2>最近写下的</h2></div><span className="subtle">{posts.length} 篇记录</span></div>
    <div className="feed-tools"><div className="category-tabs" aria-label="按分类筛选">{categories.map(c => <button key={c} aria-pressed={category === c} className={category === c ? "selected" : ""} onClick={() => { setCategory(c); setLimit(8); }}>{c}</button>)}</div>
      <label className="search-box"><Icon name="search" size={16} /><input id="search" aria-label="搜索文章" placeholder="寻找一些文字…" value={query} onChange={e => {setQuery(e.target.value);setLimit(8);}} /></label></div>
    {!first ? <div className="empty-state"><Icon name={posts.length ? "search" : "pen"} size={30} /><h3>{posts.length ? "还没找到这段文字" : "故事，正准备开始。"}</h3><p>{posts.length ? "换个关键词，或者看看其他分类。" : "这里会慢慢收集生活里的灵感与片刻。"}</p>{posts.length > 0 && <button className="text-button" onClick={() => {setQuery("");setCategory("全部");}}>查看全部文章 <Icon name="arrow" size={16}/></button>}</div> : <>
      <Link href={`/posts/${encodeURIComponent(first.slug)}`} className="featured-post"><div className="featured-art">{first.cover ? <img src={first.cover} alt={first.title} /> : <Cottage small />}<span className="art-caption">{first.featured ? "置顶手记" : "最新手记"}</span></div><div className="featured-body"><div className="post-meta"><span className="category-label">{first.category}</span><time>{formatDate(first.publishedAt, true)}</time></div><h3>{first.title}</h3><p>{first.excerpt}</p><span className="read-link">翻开这篇 <Icon name="arrow" size={17}/></span></div></Link>
      <div className="post-list">{rest.map((p,i) => <Link key={p.id} href={`/posts/${encodeURIComponent(p.slug)}`} className="post-row"><span className="post-number">{String(i+2).padStart(2,"0")}</span><div><div className="post-meta"><span>{p.category}</span><span>·</span><time>{formatDate(p.publishedAt,true)}</time></div><h3>{p.title}</h3><p>{p.excerpt}</p><div className="post-tags">{p.tags.slice(0,3).map(t => <span key={t}># {t}</span>)}</div></div><Icon name="upRight" size={21}/></Link>)}</div>
      {filtered.length > limit && <button className="load-more" onClick={() => setLimit(limit+8)}>再读几篇 <Icon name="plus" size={16}/></button>}
    </>}
  </section>;
}
