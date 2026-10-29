"use client";

/* CMS media can use a different storage host, so keep its public URL intact. */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import type { Post } from "@/lib/domain";
import { formatDate } from "@/lib/domain";
import Icon from "./Icon";
import "./AnimeFeed.css";

const PAGE_SIZE = 6;
const FIRST_PAGE_SIZE = PAGE_SIZE + 1;

function PostImage({ post }: { post: Post }) {
  if (!post.cover) return <div className="af-cover af-cover-empty" aria-hidden="true"><Icon name="book" size={46} /><span>日常，值得落笔。</span></div>;
  return (
    <img
      className="af-cover"
      src={post.cover}
      alt=""
      width={1536}
      height={1024}
      loading="lazy"
      decoding="async"
    />
  );
}

function PostMeta({ post }: { post: Post }) {
  return (
    <div className="af-meta">
      {post.category && <span className="af-category">{post.category}</span>}
      <time dateTime={post.publishedAt || undefined}>
        <Icon name="clock" size={13} />{formatDate(post.publishedAt, true)}
      </time>
    </div>
  );
}

function PostTags({ tags }: { tags: string[] }) {
  return tags.length > 0 ? (
    <div className="af-tags">{tags.slice(0, 3).map(tag => <span key={tag}># {tag}</span>)}</div>
  ) : null;
}

export default function AnimeFeed({ posts }: { posts: Post[] }) {
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(FIRST_PAGE_SIZE);
  const categories = [...new Set(posts.map(post => post.category).filter(Boolean))];
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const filtered = posts.filter(post =>
    (category === null || post.category === category) &&
    `${post.title} ${post.excerpt} ${post.tags.join(" ")}`.toLocaleLowerCase("zh-CN").includes(normalizedQuery)
  );
  const [first, ...rest] = filtered.slice(0, limit);
  const isFiltered = category !== null || normalizedQuery !== "";

  function resetFilters() {
    setQuery("");
    setCategory(null);
    setLimit(FIRST_PAGE_SIZE);
  }

  return (
    <section id="articles" className="af-section" aria-labelledby="af-title">
      <div className="af-heading">
        <div>
          <p className="af-eyebrow"><span aria-hidden="true">✦</span> THE JOURNAL</p>
          <h2 id="af-title">落在纸上的小日常<span aria-hidden="true">.</span></h2>
        </div>
        <span className="af-total">{posts.length} 篇记录</span>
      </div>

      <div className="af-tools">
        <div className="af-tabs" role="group" aria-label="按文章分类筛选">
          <button type="button" className={category === null ? "af-tab af-tab-active" : "af-tab"} aria-pressed={category === null} onClick={() => { setCategory(null); setLimit(FIRST_PAGE_SIZE); }}>全部</button>
          {categories.map(item => (
            <button type="button" key={item} className={category === item ? "af-tab af-tab-active" : "af-tab"} aria-pressed={category === item} onClick={() => { setCategory(item); setLimit(FIRST_PAGE_SIZE); }}>{item}</button>
          ))}
        </div>
        <label className="af-search">
          <Icon name="search" size={17} />
          <input id="search" type="search" aria-label="搜索文章标题、摘要或标签" placeholder="寻找一段文字…" value={query} onChange={event => { setQuery(event.target.value); setLimit(FIRST_PAGE_SIZE); }} />
        </label>
      </div>

      <p className={isFiltered ? "af-result-count" : "af-sr-only"} role="status" aria-live="polite" aria-atomic="true">
        {isFiltered ? `找到 ${filtered.length} 篇记录` : `共 ${posts.length} 篇记录`}
      </p>

      <div id="af-results">
        {!first ? (
          <div className="af-empty">
            <span className="af-empty-icon"><Icon name={posts.length ? "search" : "pen"} size={28} /></span>
            <h3>{posts.length ? "这段故事，暂时还没找到" : "故事，正准备开始。"}</h3>
            <p>{posts.length ? "换个关键词，或回到全部记录里看看吧。" : "留一页空白，等待下一个值得记住的瞬间。"}</p>
            {posts.length > 0 && <button type="button" className="af-reset" onClick={resetFilters}>查看全部文章 <Icon name="arrow" size={16} /></button>}
          </div>
        ) : (
          <>
            <article className="af-featured">
              <Link href={`/posts/${encodeURIComponent(first.slug)}`} className="af-featured-link">
                <div className="af-featured-art">
                  <PostImage post={first} />
                  {first.featured && <span className="af-pinned"><span aria-hidden="true">✦</span> 置顶手记</span>}
                  <span className="af-art-note" aria-hidden="true">a little piece of life</span>
                </div>
                <div className="af-featured-body">
                  <PostMeta post={first} />
                  <h3>{first.title}</h3>
                  {first.excerpt && <p className="af-excerpt">{first.excerpt}</p>}
                  <PostTags tags={first.tags} />
                  <span className="af-read">翻开这篇手记 <span className="af-read-arrow"><Icon name="arrow" size={17} /></span></span>
                </div>
              </Link>
            </article>

            {rest.length > 0 && <div className="af-grid">{rest.map(post => (
              <article className="af-card" key={post.id}>
                <Link href={`/posts/${encodeURIComponent(post.slug)}`} className="af-card-link">
                  <div className="af-card-art">
                    <PostImage post={post} />
                    {post.featured && <span className="af-pinned"><span aria-hidden="true">✦</span> 置顶手记</span>}
                  </div>
                  <div className="af-card-body">
                    <PostMeta post={post} />
                    <h3>{post.title}</h3>
                    {post.excerpt && <p className="af-excerpt">{post.excerpt}</p>}
                    <div className="af-card-footer"><PostTags tags={post.tags} /><span className="af-card-arrow"><Icon name="upRight" size={19} /></span></div>
                  </div>
                </Link>
              </article>
            ))}</div>}

            {filtered.length > limit && <button type="button" className="af-load-more" aria-controls="af-results" onClick={() => setLimit(current => current + PAGE_SIZE)}>再翻几页 <Icon name="plus" size={16} /><span className="af-sr-only">，还有 {filtered.length - limit} 篇文章</span></button>}
          </>
        )}
      </div>
    </section>
  );
}
