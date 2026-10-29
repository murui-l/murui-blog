"use client";
// Preserve the existing animated WebP and its reduced-motion still.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import "./KokomiWhisper.css";

const whispers = [
  "今天也记得给自己留一点余裕。没有安排的时间，也很珍贵。",
  "欢迎回来。先坐一会儿吧，今天不用急着把所有事都做完。",
  "听完这首歌，再去忙也来得及。",
  "如果今天有点累，就把下一步变得小一点。",
  "你收藏的这些小小喜欢，已经把这里照顾得很好了。",
  "偶尔发一会儿呆，也是在给心里的电量慢慢充满。",
  "今天遇到什么有趣的事了吗？一点点小事，也值得记下来。",
  "晚一点回复世界也没关系，先照顾好自己。",
  "这张背景很好看呢。再看一会儿，好不好？",
  "不用每一天都很厉害。平平常常的一天，也可以很喜欢。",
  "翻到这里遇见你，今天就多了一件开心的小事。",
  "偷偷告诉你：能一直喜欢一些东西，是很可爱的本领。",
];

const cloudPath = "M49 144C25 146 9 135 9 117C9 104 16 93 28 87C20 65 33 42 58 39C64 16 89 7 111 18C127 2 155 8 165 27C188 7 221 15 228 40C252 29 278 42 278 65C300 66 313 85 306 105C322 128 306 151 281 152C277 176 245 187 224 173C203 190 175 189 159 173C139 193 107 188 95 170C72 182 48 171 49 144Z";

const repeatMs = 20_000;
const visibleMs = 7_000;
const fadeMs = 500;
type Bubble = { index: number; serial: number; leaving: boolean };

export default function KokomiWhisper({ onOpen, autoOpen = false }: { onOpen?: () => void; autoOpen?: boolean }) {
  const [bubble, setBubble] = useState<Bubble | null>(autoOpen ? { index: 0, serial: 0, leaving: false } : null);
  const last = useRef(autoOpen ? 0 : -1);
  const sequence = useRef(0);
  const restartCycle = useRef<(() => void) | null>(null);
  const cloud = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const bubbleId = useId();
  const cloudId = `kokomi-cloud-${bubbleId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const open = bubble !== null && !bubble.leaving;
  const serial = bubble?.serial;
  const leaving = bubble?.leaving ?? false;
  const nextLine = useCallback(() => {
    if (cloud.current?.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true });
    const next = last.current < 0 ? Math.floor(Math.random() * whispers.length) : (last.current + 1) % whispers.length;
    last.current = next;
    setBubble({ index: next, serial: ++sequence.current, leaving: false });
  }, []);
  const dissolve = useCallback((expectedSerial?: number) => {
    if (expectedSerial !== undefined && expectedSerial !== sequence.current) return;
    if (cloud.current?.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true });
    setBubble(current => current && !current.leaving && (expectedSerial === undefined || current.serial === expectedSerial) ? { ...current, leaving: true } : current);
  }, []);
  const close = useCallback(() => {
    dissolve();
    trigger.current?.focus({ preventScroll: true });
  }, [dissolve]);

  // Each new sentence owns its display and fade timers, including manual changes.
  useEffect(() => {
    if (serial === undefined) return;
    const displayTimer = setTimeout(() => dissolve(serial), visibleMs);
    return () => clearTimeout(displayTimer);
  }, [serial, dissolve]);

  // Clicking the cloud and the automatic timeout share the same exit animation.
  useEffect(() => {
    if (serial === undefined || !leaving) return;
    const fadeTimer = setTimeout(() => setBubble(current => current?.serial === serial ? null : current), fadeMs);
    return () => clearTimeout(fadeTimer);
  }, [serial, leaving]);

  // Start-to-start cadence: 7 seconds visible, a fade, then quiet until 20 seconds.
  // Hidden tabs stop completely; returning starts a fresh interval with no backlog.
  useEffect(() => {
    if (!autoOpen) return;
    let repeatTimer: ReturnType<typeof setInterval> | undefined;
    const resume = () => {
      clearInterval(repeatTimer);
      if (document.hidden) { setBubble(null); return; }
      repeatTimer = setInterval(() => {
        if (!document.hidden && !document.querySelector("dialog[open]")) nextLine();
      }, repeatMs);
    };
    restartCycle.current = resume;
    if (!document.hidden) repeatTimer = setInterval(() => {
      if (!document.hidden && !document.querySelector("dialog[open]")) nextLine();
    }, repeatMs);
    document.addEventListener("visibilitychange", resume);
    return () => { clearInterval(repeatTimer); restartCycle.current = null; document.removeEventListener("visibilitychange", resume); };
  }, [autoOpen, nextLine]);

  useEffect(() => {
    if (!open) return;
    const hidden = () => { if (document.hidden) setBubble(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented && !document.querySelector("dialog[open]")) { event.preventDefault(); close(); } };
    document.addEventListener("visibilitychange", hidden); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("visibilitychange", hidden); document.removeEventListener("keydown", escape); };
  }, [open, close]);
  return <div className="header-mascot kokomi-whisper" onKeyDown={event => {
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
  }}>
    <button ref={trigger} type="button" className="kw-trigger" aria-label={open ? "再听一句心海悄悄话" : "听听心海悄悄话"} aria-expanded={open} aria-controls={bubbleId} onClick={() => {
      nextLine(); restartCycle.current?.(); onOpen?.();
    }}>
      <picture><source media="(prefers-reduced-motion: reduce)" srcSet="/images/stickers/kokomi-heart-still.png" /><img src="/images/stickers/kokomi-heart.webp" width="68" height="68" alt="" /></picture>
    </button>
    {bubble && <button key={bubble.serial} ref={cloud} id={bubbleId} type="button" className={`kw-bubble${bubble.leaving ? " is-leaving" : ""}`} aria-label="轻点云朵，让悄悄话消散" aria-describedby={`${bubbleId}-text`} aria-hidden={bubble.leaving || undefined} inert={bubble.leaving} onClick={() => dissolve(bubble.serial)}>
      <span className="kw-cloud-glass" aria-hidden="true" style={{ clipPath: `url(#${cloudId}-clip)` }} />
      <svg className="kw-cloud-shape" viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${cloudId}-fill`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--murui-paper-a, #fff5faf5)" /><stop offset="1" stopColor="var(--murui-paper-b, #eff5fff5)" /></linearGradient>
          <clipPath id={`${cloudId}-clip`} clipPathUnits="objectBoundingBox"><path d={cloudPath} transform="scale(.003125 .005)" /></clipPath>
        </defs>
        <path d={cloudPath} fill={`url(#${cloudId}-fill)`} stroke="#ffffffed" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <span id={`${bubbleId}-text`} className="kw-text" role="status" aria-live="polite" aria-atomic="true">{whispers[bubble.index]}</span>
    </button>}
  </div>;
}
