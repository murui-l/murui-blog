"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { showPlayfulStars, stopPlayfulStars } from "@/lib/playful-stars";
import "./MoodScratch.css";

const ScratchSurface = dynamic(() => import("./MoodScratchSurface"), { ssr: false });
const storageKey = "murui-mood-scratched-v1";
const sessionRevealed = new Set<string>();
type Mood = { emoji: string; name: string; text: string };
type Size = { width: number; height: number };

function MoodScratch({ day, mood }: { day: string; mood: Mood }) {
  const region = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const savedCover = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [restored, setRestored] = useState(false);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [awake, setAwake] = useState(true);
  const [readyKey, setReadyKey] = useState("");
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const surfaceKey = `${size.width}-${size.height}`;

  const reveal = useCallback(() => {
    sessionRevealed.add(day);
    try { localStorage.setItem(storageKey, day); } catch { /* Session state still works without browser storage. */ }
    setRevealed(true);
  }, [day]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const restore = () => {
      let seen = sessionRevealed.has(day);
      try { seen ||= localStorage.getItem(storageKey) === day; } catch { /* Browser storage is optional. */ }
      if (seen || motion.matches) setRevealed(true);
      setRestored(true);
      setAwake(!document.hidden);
    };
    const frame = requestAnimationFrame(restore);
    const storage = (event: StorageEvent) => { if (event.key === storageKey && event.newValue === day) setRevealed(true); };
    const visibility = () => setAwake(!document.hidden);
    motion.addEventListener("change", restore);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("storage", storage);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", restore);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("storage", storage);
      savedCover.current = null;
      stopPlayfulStars();
    };
  }, [day]);

  useEffect(() => {
    const element = region.current;
    if (!element) return;
    const frame = requestAnimationFrame(() => {
      if (!("IntersectionObserver" in window)) { setNear(true); setVisible(true); }
    });
    const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
      const shown = entries.some(entry => entry.isIntersecting);
      if (shown) setNear(true);
      setVisible(shown);
    }, { rootMargin: "80px" }) : null;
    observer?.observe(element);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, []);

  const remember = useCallback((canvas: HTMLCanvasElement) => {
    // Preserve the erased alpha mask through responsive canvas recreation.
    if (!savedCover.current) savedCover.current = document.createElement("canvas");
    const copy = savedCover.current;
    copy.width = canvas.width; copy.height = canvas.height;
    copy.getContext("2d")?.drawImage(canvas, 0, 0);
  }, []);
  const getSnapshot = useCallback(() => savedCover.current, []);

  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const measure = () => {
      const width = Math.max(1, Math.round(element.clientWidth));
      const height = Math.max(1, Math.round(element.clientHeight));
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    const frame = requestAnimationFrame(measure);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    if (!observer) window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  const surfaceReady = useCallback(() => setReadyKey(surfaceKey), [surfaceKey]);
  return <div ref={region} className="mood-scratch" data-revealed={revealed} data-day={day} data-scratch-ready={size.width > 0 && readyKey === surfaceKey}>
    <div ref={surface} className="mood-scratch-paper">
      <div className="mood-scratch-content" aria-hidden={!revealed}>
        <div className="ml-mood-name"><span aria-hidden="true">{mood.emoji}</span><strong>{mood.name}</strong></div>
        <p className="ml-mood-text">{mood.text}</p>
      </div>
      {!revealed && <>
        <div className="mood-scratch-fallback" aria-hidden="true"><span>✧</span><strong>今日心情</strong><small>收一份今天的小心情</small></div>
        {restored && near && size.width > 0 && <ScratchSurface key={surfaceKey} size={size}
          active={awake && visible} getSnapshot={getSnapshot} onSnapshot={remember}
          onComplete={reveal} onReady={surfaceReady} onError={reveal} />}
      </>}
    </div>
    <div className="mood-scratch-actions">
      <button type="button" className="mood-scratch-reveal" onClick={() => { if (!revealed) reveal(); }}
        aria-disabled={revealed} tabIndex={revealed ? -1 : 0}>{revealed ? "今日已揭晓" : "直接揭晓"}</button>
      <button type="button" className="ml-mood-keep" disabled={!revealed} onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        void showPlayfulStars({ x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }).catch(() => {});
      }}>收下今天的心情 <span aria-hidden="true">✧</span></button>
    </div>
    <p className="mood-scratch-status sr-only" role="status">{revealed ? `今天是「${mood.name}」：${mood.text}` : ""}</p>
  </div>;
}

export default memo(MoodScratch);
