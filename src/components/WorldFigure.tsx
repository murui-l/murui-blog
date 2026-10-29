"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type Figure = "kokomi" | "hutao";

/** A short decorative response inside the existing figure's grid cell. */
export default function WorldFigure({ kind }: { kind: Figure }) {
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [burst, setBurst] = useState(0);
  const [active, setActive] = useState(false);
  const name = kind === "kokomi" ? "心海" : "胡桃";
  const stop = () => { window.clearTimeout(timer.current); setActive(false); };
  const start = () => {
    if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = button.current?.getBoundingClientRect();
    if (!rect || rect.bottom <= 0 || rect.top >= window.innerHeight) return;
    window.clearTimeout(timer.current);
    setBurst(value => value + 1);
    setActive(true);
    timer.current = window.setTimeout(() => setActive(false), 1800);
  };
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const quiet = () => { if (document.hidden || motion.matches) { window.clearTimeout(timer.current); setActive(false); } };
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) { window.clearTimeout(timer.current); setActive(false); }
    });
    if (button.current) observer.observe(button.current);
    motion.addEventListener("change", quiet);
    document.addEventListener("visibilitychange", quiet);
    return () => { window.clearTimeout(timer.current); observer.disconnect(); motion.removeEventListener("change", quiet); document.removeEventListener("visibilitychange", quiet); };
  }, []);

  return <button ref={button} type="button" className={`home-world__figure home-world__figure--${kind}`} aria-label={`${name}，${kind === "kokomi" ? "浮起水泡" : "唤起幽蝶"}`}
    onPointerEnter={event => { if (event.pointerType !== "touch" && window.matchMedia("(hover: hover)").matches) start(); }}
    onPointerLeave={stop} onFocus={start} onBlur={stop} onClick={start}>
    <Image src={`/images/artworks/${kind}-map-cutout.webp`} alt="" draggable={false} width={kind === "kokomi" ? 959 : 1012} height={kind === "kokomi" ? 1256 : 1541} sizes={kind === "kokomi" ? "(min-width: 1120px) 32vw, 48vw" : "(min-width: 1120px) 27vw, 48vw"} />
    {active && <span key={burst} className={`world-figure-effects world-figure-effects--${kind}`} aria-hidden="true">
      {kind === "kokomi" ? [0, 1, 2, 3, 4].map(index => <span className="world-figure-bubble" key={index} style={{ "--effect-index": index } as CSSProperties} />)
        : [0, 1, 2].map(index => <span className="world-figure-butterfly" key={index} style={{ "--effect-index": index } as CSSProperties}>
          <svg viewBox="0 0 48 40" fill="none" focusable="false">
            <path d="M23 20C9-1 0 8 8 20c3 4 7 5 13 5-10 7-7 14-1 12 5-2 6-9 4-15Z" fill="currentColor" fillOpacity=".85" />
            <path d="M25 20C39-1 48 8 40 20c-3 4-7 5-13 5 10 7 7 14 1 12-5-2-6-9-4-15Z" fill="currentColor" fillOpacity=".85" />
            <path d="m24 23-1-9m1 0-4-4m4 4 4-4" stroke="#fff5de" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </span>)}
    </span>}
  </button>;
}
