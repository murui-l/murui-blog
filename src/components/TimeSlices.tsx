"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/domain";
import Icon from "./Icon";
import "./LifeNotes.css";
import "./TimeSlices.css";

type Slices = { member: boolean; total?: number; notes?: { id: number; title: string; excerpt: string; updatedAt: string }[] };
export default function TimeSlices() {
  const [slices, setSlices] = useState<Slices | null>(null);
  useEffect(() => {
    let controller: AbortController | undefined;
    const refresh = async () => {
      controller?.abort();
      const current = new AbortController(); controller = current;
      setSlices(null);
      try {
        const response = await fetch("/api/time-slices", { cache: "no-store", signal: current.signal });
        if (response.ok) { const data: Slices = await response.json(); if (!current.signal.aborted) setSlices(data); }
      } catch { /* Keep private content hidden if the session cannot be verified. */ }
    };
    const visibility = () => { if (document.visibilityState === "visible") void refresh(); else { controller?.abort(); setSlices(null); } };
    void refresh(); window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", visibility);
    return () => { controller?.abort(); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  if (!slices?.member) return null;
  return <section id="time-slices" className="life-notes time-slices" aria-labelledby="time-slices-title">
    <div className="life-notes-heading"><div><p className="life-notes-kicker"><span aria-hidden="true">✧</span> PIECES OF MY DAYS</p><h2 id="time-slices-title">时间切片<span aria-hidden="true">.</span></h2><p className="life-notes-description">把一闪而过的心情，收进属于你的时间里。</p></div><Link className="time-slices-write" href="/my-notes?new=1"><Icon name="pen" size={17} />记下这一刻</Link></div>
    {slices.notes?.length ? <div className="life-notes-grid">{slices.notes.map((note, index) => <article className="life-notes-card" key={note.id}><Link href={`/my-notes?id=${note.id}`}><div className="life-notes-meta"><time dateTime={note.updatedAt}>{formatDate(note.updatedAt, true)}</time><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span></div><h3>{note.title}</h3><p>{note.excerpt || "有些心情，翻开这一页就能想起。"}</p><span className="life-notes-read">翻开这一刻 <Icon name="arrow" size={17} /></span></Link></article>)}</div> : <div className="life-notes-empty"><div className="life-notes-paper" aria-hidden="true"><span>Dear myself,</span><i/><i/><i/><b>♡</b></div><div><span className="life-notes-empty-label">你的第一枚时间切片</span><h3>从今天的一件小事开始。</h3><p>写下心情，留住片刻，<br/>日子会在这里慢慢成册。</p></div></div>}
    <div className="life-notes-footer"><span>{slices.total || 0} 枚切片 · 属于你的日常收藏</span><Link href="/my-notes">查看全部时间切片 <Icon name="arrow" size={16} /></Link></div>
  </section>;
}
