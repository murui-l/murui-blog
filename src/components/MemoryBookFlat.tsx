"use client";
/* eslint-disable @next/next/no-img-element -- Preserve complete gallery pictures. */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { MemoryPage } from "./MemoryBook";

function Face({ page, index }: { page: MemoryPage; index: number }) {
  return <div className={`mk-book-leaf-inner${page.kind === "cover" ? " mk-flat-cover" : ""}`}>
    {page.src ? <><img src={page.src} alt="当前收藏图片" decoding="sync" draggable={false} />{page.author && <small>{page.author}</small>}</> : <><span className="mk-book-flower" aria-hidden="true">{page.kind === "cover" ? "✿" : "✎"}</span><h3>{page.title}</h3><p>{page.text}</p></>}
    <span className="mk-book-page-number">{String(index + 1).padStart(2, "0")}</span>
  </div>;
}

/** A two-dimensional paper turn for mobile WebViews. The opaque old page stays
 * underneath until the decoded incoming picture has finished sliding in. No
 * cloned image, 3D perspective or animated clip-path is involved. */
export default function MemoryBookFlat({ pages, index, width, animated, onBusyChange, onTurn }: {
  pages: MemoryPage[]; index: number; width: number; animated: boolean;
  onBusyChange: (busy: boolean) => void; onTurn: (direction: "prev" | "next") => void;
}) {
  const [shown, setShown] = useState(index);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const shownRef = useRef(index);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    if (index === shownRef.current) return;
    let cancelled = false;
    let timer = 0;
    let image: HTMLImageElement | undefined;
    let cancelImage: (() => void) | undefined;
    onBusyChange(true);
    const prepare = async () => {
      setLoading(true);
      const src = pages[index].src;
      if (src) {
        image = new Image(); image.decoding = "sync";
        await new Promise<void>(resolve => {
          let finished = false;
          const done = () => { if (finished) return; finished = true; window.clearTimeout(timer); resolve(); };
          cancelImage = done;
          image!.onload = done; image!.onerror = done;
          timer = window.setTimeout(done, 15000);
          image!.src = src;
          if (image!.complete) done();
        });
        if (cancelled) return;
        // Keep the old page visible during image decoding too.
        try { await image.decode(); } catch { /* A failed image still has a paper face. */ }
      }
      if (cancelled) return;
      setLoading(false);
      if (!animated) { shownRef.current = index; setShown(index); setIncoming(null); onBusyChange(false); return; }
      setIncoming(index);
      timer = window.setTimeout(() => {
        shownRef.current = index; setShown(index); setIncoming(null); onBusyChange(false);
      }, 380);
    };
    void prepare();
    return () => { cancelled = true; window.clearTimeout(timer); cancelImage?.(); if (image) { image.onload = null; image.onerror = null; } onBusyChange(false); };
  }, [pages, index, animated, onBusyChange]);
  const visible = animated ? shown : index;
  return <div className="mk-book-flat" data-turning={incoming !== null} aria-busy={loading || incoming !== null}
    style={{ width, height: Math.round(width * 1.38), "--book-turn-direction": index >= shown ? 1 : -1 } as CSSProperties}
    onPointerDown={event => { if (event.isPrimary && event.button === 0) gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; }}
    onPointerCancel={() => { gesture.current = null; }}
    onPointerUp={event => {
      const start = gesture.current; gesture.current = null;
      if (!start || start.id !== event.pointerId || loading || incoming !== null) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.4) onTurn(dx < 0 ? "next" : "prev");
    }}>
    <div className="mk-flat-page mk-flat-rest"><Face page={pages[visible]} index={visible} /></div>
    {animated && incoming !== null && <div key={incoming} className="mk-flat-page mk-flat-incoming" aria-hidden="true"><Face page={pages[incoming]} index={incoming} /></div>}
    {loading && <span className="mk-flat-loading" role="status">正在准备下一页…</span>}
  </div>;
}
