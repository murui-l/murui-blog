"use client";
/* eslint-disable @next/next/no-img-element -- The book must preserve complete public gallery images, including native static fallback. */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { PageFlip } from "@gullabs/flipbook-core";
import type { GallerySnapshot } from "@/lib/gallery-types";
import type { KeepsakePost } from "@/lib/keepsakes";
import MemoryBookFlat from "./MemoryBookFlat";

export type MemoryPage = { kind: "cover" | "photo" | "note"; title: string; text?: string; src?: string; href?: string; author?: string };
const perVolume = 20;
function leaf(page: MemoryPage, index: number) {
  const node = document.createElement("div"); node.className = `mk-book-leaf mk-book-${page.kind}`;
  const paper = document.createElement("div"); paper.className = "mk-book-leaf-inner";
  if (page.kind === "photo") {
    const image = document.createElement("img"); image.src = page.src!; image.alt = ""; image.decoding = "async"; paper.appendChild(image);
    if (page.author) { const credit = document.createElement("small"); credit.textContent = page.author; paper.appendChild(credit); }
  } else {
    const mark = document.createElement("span"); mark.className = "mk-book-flower"; mark.textContent = page.kind === "cover" ? "✿" : "✎";
    const heading = document.createElement("h3"); heading.textContent = page.title;
    const text = document.createElement("p"); text.textContent = page.text ?? ""; paper.append(mark, heading, text);
  }
  const number = document.createElement("span"); number.className = "mk-book-page-number"; number.textContent = String(index + 1).padStart(2, "0"); paper.appendChild(number); node.appendChild(paper); return node;
}

export default function MemoryBook({ gallery, posts }: { gallery: GallerySnapshot; posts: KeepsakePost[] }) {
  const initialAlbum = gallery.categories.find(album => album.name === "首页背景")?.id ?? gallery.categories[0]?.id ?? "";
  const [albumId, setAlbum] = useState(initialAlbum);
  const [mode, setMode] = useState<"photos" | "notes">("photos");
  const [volume, setVolume] = useState(0);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(260);
  const [active, setActive] = useState(false);
  const [compact, setCompact] = useState(true);
  const [turning, setTurning] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<PageFlip | null>(null);
  const pageIndex = useRef(0);
  const album = gallery.categories.find(item => item.id === albumId) ?? gallery.categories[0];
  const photos = useMemo(() => gallery.images.filter(image => image.categoryId === album?.id), [gallery.images, album?.id]);
  const notePosts = useMemo(() => posts.filter(post => ["生活随笔", "随笔"].includes(post.category.trim())), [posts]);
  const count = mode === "photos" ? photos.length : notePosts.length;
  const volumeCount = Math.max(1, Math.ceil(count / perVolume));
  const currentVolume = Math.min(volume, volumeCount - 1);
  const pages = useMemo<MemoryPage[]>(() => {
    const entries: MemoryPage[] = mode === "photos" ? photos.slice(currentVolume * perVolume, (currentVolume + 1) * perVolume).map(photo => ({ kind: "photo", title: album?.name ?? "收藏", src: photo.src, author: photo.author, href: `/gallery?album=${encodeURIComponent(photo.categoryId)}&image=${encodeURIComponent(photo.id)}` }))
      : notePosts.slice(currentVolume * perVolume, (currentVolume + 1) * perVolume).map(post => ({ kind: "note", title: post.title, text: `${post.date}\n\n${post.excerpt || "这篇随笔还没有摘要。"}`, href: post.href }));
    return [{ kind: "cover", title: mode === "photos" ? album?.name ?? "照片回忆" : "生活随笔", text: `MURUI / MEMORY BOOK\n第 ${currentVolume + 1} 册 · ${entries.length} ${mode === "photos" ? "张照片" : "篇随笔"}\n\n把喜欢的，轻轻翻过去。` }, ...entries, { kind: "cover", title: "谢谢你，翻到这一页", text: "回忆在慢慢增加。\n下次来，再一起翻一翻。\n\n✧ Murui" }];
  }, [mode, photos, notePosts, album?.name, currentVolume]);
  useEffect(() => {
    const node = shell.current;
    if (!node) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 600px), (hover: none) and (pointer: coarse)");
    const update = () => { setActive(!motion.matches && !document.hidden); setCompact(mobile.matches); };
    const measure = () => setWidth(Math.max(120, Math.min(280, Math.floor(node.clientWidth - 12))));
    const frame = requestAnimationFrame(() => { measure(); update(); });
    const observer = new ResizeObserver(measure); observer.observe(node);
    motion.addEventListener("change", update); mobile.addEventListener("change", update); document.addEventListener("visibilitychange", update);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); motion.removeEventListener("change", update); mobile.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  useEffect(() => {
    const root = host.current;
    if (!root || !active || compact) return;
    let disposed = false; let book: PageFlip | undefined;
    const inner = document.createElement("div"); root.appendChild(inner);
    void import("@gullabs/flipbook-core").then(({ PageFlip: Engine }) => {
      if (disposed) return;
      const created = new Engine(inner, { width, height: Math.round(width * 1.38), usePortrait: true, autoSize: true, hardCovers: true, initialPage: Math.min(pageIndex.current, pages.length - 1), flippingTime: 650, maxShadowOpacity: .18, allowTouchScroll: true, flipOnClick: "corners", respectInteractiveContent: true });
      book = created; instance.current = created;
      created.on("flip", event => { if (!disposed) { pageIndex.current = event.data.page; setIndex(event.data.page); } });
      created.loadFromHTML(pages.map(leaf));
      if (!disposed) { setReady(true); setFailed(false); }
    }).catch(() => { if (!disposed) { setFailed(true); setReady(false); } });
    return () => { disposed = true; book?.destroy(); inner.remove(); if (instance.current === book) instance.current = null; };
  }, [pages, width, active, compact]);
  const reset = () => { pageIndex.current = 0; setIndex(0); setReady(false); setTurning(false); };
  const turn = (direction: "prev" | "next") => {
    if (compact && turning) return;
    if (!compact && active && !failed && instance.current?.isReady()) { if (direction === "prev") instance.current.flipPrev(); else instance.current.flipNext(); }
    else { const next = Math.min(pages.length - 1, Math.max(0, pageIndex.current + (direction === "prev" ? -1 : 1))); pageIndex.current = next; setIndex(next); }
  };
  const current = pages[Math.min(index, pages.length - 1)];
  return <div className="mk-memory-book" onKeyDown={event => {
    if (event.target instanceof Element && event.target.closest("select,input,textarea")) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); turn(event.key === "ArrowRight" ? "next" : "prev"); }
  }}>
    <div className="mk-book-tools"><div className="mk-segment" role="group" aria-label="回忆册内容"><button type="button" aria-pressed={mode === "photos"} onClick={() => { reset(); setVolume(0); setMode("photos"); }}>照片回忆</button><button type="button" aria-pressed={mode === "notes"} onClick={() => { reset(); setVolume(0); setMode("notes"); }}>公开随笔</button></div>
      {mode === "photos" && <label>相册 <select value={album?.id ?? ""} onChange={event => { reset(); setVolume(0); setAlbum(event.target.value); }}>{gallery.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      {volumeCount > 1 && <label>分册 <select value={currentVolume} onChange={event => { reset(); setVolume(Number(event.target.value)); }}>{Array.from({ length: volumeCount }, (_, number) => <option key={number} value={number}>第 {number + 1} 册</option>)}</select></label>}
    </div>
    {!count && <p className="mk-book-empty">{mode === "photos" ? "这个相册还没有图片，等下一张喜欢的瞬间。" : "还没有公开随笔，等日常慢慢写满纸页。"}</p>}
    <div ref={shell} className="mk-book-shell" style={{ minHeight: Math.round(width * 1.38) + 14 }}>
      <div ref={host} className="mk-book-engine" aria-hidden="true" inert={!active || compact || failed} data-ready={!compact && active && ready && !failed} />
      {compact ? <MemoryBookFlat key={`${mode}-${album?.id}-${currentVolume}`} pages={pages} index={Math.min(index, pages.length - 1)} width={width} animated={active} onBusyChange={setTurning} onTurn={turn} /> : (!active || failed || !ready) && <div className={`mk-book-static mk-book-${current.kind}`} style={{ width, height: Math.round(width * 1.38) }}>
        {current.src ? <img src={current.src} alt="当前收藏图片" /> : <><span aria-hidden="true">✿</span><h3>{current.title}</h3><p>{current.text}</p></>}
      </div>}
    </div>
    <div className="mk-book-controls"><button type="button" disabled={index <= 0 || turning} onClick={() => turn("prev")}>← 上一页</button><span role="status" aria-live="polite">{index + 1} / {pages.length}</span><button type="button" disabled={index >= pages.length - 1 || turning} onClick={() => turn("next")}>下一页 →</button></div>
    <p className="mk-book-current">{current.kind === "photo" ? `当前：${album?.name} · 收藏图片` : current.title}{current.href && <Link href={current.href}>{current.kind === "photo" ? "去相册看大图 ↗" : "阅读全文 ↗"}</Link>}</p>
    {active && current.text && <p className="sr-only">{current.text}</p>}
    <small className="mk-book-source">翻页引擎 <a href="https://github.com/gul-labs/flipbook" target="_blank" rel="noopener noreferrer">GulLabs Flipbook · MPL-2.0 · 源码</a></small>
  </div>;
}
