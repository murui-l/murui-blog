"use client";

import { useLayoutEffect, useRef } from "react";
import type { LyricLine } from "@/lib/music";
import LyricText from "./LyricText";

/** Use the shared lyric timings; this surface owns only its visual alignment. */
export default function TransparentMusicLyrics({ lines, active, elapsed, playing }: { lines: LyricLine[]; active: number; elapsed: number; playing: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const previous = useRef({ active: -1, elapsed: -1 });
  useLayoutEffect(() => {
    const root = host.current;
    const window = root?.parentElement;
    if (!root || !window) return;
    const current = root.querySelector<HTMLElement>(".is-current");
    const old = previous.current;
    const seek = !playing || old.elapsed < 0 || elapsed < old.elapsed || elapsed - old.elapsed > 1.5;
    previous.current = { active, elapsed };
    if (old.active === active && old.elapsed === elapsed || old.active === active && !seek) return;
    cancelAnimationFrame(frame.current);
    const base = parseFloat(getComputedStyle(window).getPropertyValue("--mlp-base-height")) || 300;
    window.style.height = `${Math.max(base, (current?.offsetHeight || 0) + 72)}px`;
    const target = current ? Math.max(0, current.offsetTop - root.clientHeight / 2 + current.offsetHeight / 2) : 0;
    if (seek) { root.scrollTop = target; return; }
    const from = root.scrollTop;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 350);
      root.scrollTop = from + (target - from) * (1 - (1 - progress) ** 3);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [active, elapsed, playing]);

  useLayoutEffect(() => {
    const root = host.current;
    const window = root?.parentElement;
    if (!root || !window) return;
    const align = () => {
      cancelAnimationFrame(frame.current);
      const current = root.querySelector<HTMLElement>(".is-current");
      const base = parseFloat(getComputedStyle(window).getPropertyValue("--mlp-base-height")) || 300;
      const height = Math.max(base, (current?.offsetHeight || 0) + 72);
      if (window.style.height !== `${height}px`) window.style.height = `${height}px`;
      root.scrollTop = current ? Math.max(0, current.offsetTop - root.clientHeight / 2 + current.offsetHeight / 2) : 0;
    };
    const observer = new ResizeObserver(align);
    observer.observe(root);
    return () => { cancelAnimationFrame(frame.current); observer.disconnect(); window.style.removeProperty("height"); };
  }, []);

  return <div ref={host} className="mlp-scroll-host mlp-transparent-scroll">
    <div className="mlp-scroll-space" aria-hidden="true" />
    {lines.map((line, index) => <p key={`${line.time}-${index}`} className={`mlp-line${active === index ? " is-current" : ""}`} aria-current={active === index ? "true" : undefined}>
      <LyricText text={line.text} />
    </p>)}
    <div className="mlp-scroll-space" aria-hidden="true" />
  </div>;
}
