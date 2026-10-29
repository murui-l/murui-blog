"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMusicPlayer } from "@/lib/music-player-store";
import { displayLrc, displayLyricLines, lyricLineIndex } from "@/lib/music-lyrics";
import LyricText from "./LyricText";
import "./MusicLyrics.css";

const ScrollingLyrics = dynamic(() => import("./ScrollingMusicLyrics"), { ssr: false });
const TransparentLyrics = dynamic(() => import("./TransparentMusicLyrics"), { ssr: false });

export default function MusicLyrics({ compact = false, variant = "paper" }: { compact?: boolean; variant?: "paper" | "transparent" }) {
  const transparent = !compact && variant === "transparent";
  const decorated = !compact && !transparent;
  const { tracks, index, elapsed, loading, lyricLoading, playing } = useMusicPlayer();
  const track = tracks[index];
  const surface = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const lines = useMemo(() => displayLyricLines(track), [track]);
  const lrc = useMemo(() => displayLrc(lines), [lines]);
  const active = lyricLineIndex(lines, elapsed);
  const current = lines[active]?.text;
  const next = lines[active + 1]?.text;
  const status = loading ? "正在加载音乐…" : lyricLoading ? "歌词加载中…" : track.instrumental ? "纯音乐" : !lines.length ? "暂无歌词" : "";

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduced(motion.matches);
    updateMotion(); motion.addEventListener("change", updateMotion);
    let intersecting = false;
    const synchronize = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(entries => { intersecting = entries.some(entry => entry.isIntersecting); synchronize(); });
    if (surface.current) observer.observe(surface.current);
    document.addEventListener("visibilitychange", synchronize);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", synchronize); motion.removeEventListener("change", updateMotion); };
  }, []);

  const still = <div className="mlp-still" key={`${track.id}-${active}`}>
    {!compact && <p className="mlp-neighbor" aria-hidden="true">{lines[active - 1]?.text || "\u00a0"}</p>}
    <p className="mlp-current"><LyricText text={status || current || "前奏"} sparkle={decorated && !status} /></p>
    <p className="mlp-neighbor">{status ? "\u00a0" : next || "\u00a0"}</p>
  </div>;

  return <div ref={surface} className={`mlp-lyrics${compact ? " mlp-compact" : transparent ? " mlp-transparent" : " mlp-paper"}${visible && !reduced ? " mlp-motion" : ""}`} aria-label="同步歌词" aria-live="off" data-playing={playing} data-lyric-ready={!status}>
    {decorated && <div className="mlp-heading" aria-hidden="true"><span>♪ &nbsp; LYRICS</span><span>把旋律，写在这一页 <i>✧</i></span></div>}
    <div className="mlp-window">
      {!compact && !status && visible && !reduced ? transparent
        ? <TransparentLyrics key={track.id} lines={lines} active={active} elapsed={elapsed} playing={playing} />
        : <ScrollingLyrics key={track.id} lrc={lrc} currentMillisecond={Math.max(0, elapsed * 1000)} /> : still}
    </div>
    {decorated && <span className="mlp-pressed-flower" aria-hidden="true"><svg viewBox="0 0 56 72" fill="none" focusable="false">
      <path d="M25 27c-3 12 8 20 13 36" stroke="#8d9caa" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M31 43c-10-1-15-7-13-12 9 0 14 5 13 12Z" fill="#b9d4c7" fillOpacity=".75" stroke="#99b4a8" strokeWidth=".7" />
      <path d="M35 53c1-10 6-15 12-13-1 9-5 14-12 13Z" fill="#c5d6c8" fillOpacity=".8" stroke="#a6bcae" strokeWidth=".7" />
      <path d="m20 34 11 9m5 8 8-9" stroke="#9cbaa9" strokeWidth=".7" strokeLinecap="round" />
      <g stroke="#b9abc6" strokeWidth=".8">
        <ellipse cx="24" cy="13" rx="7" ry="10" fill="#d1dff0" />
        <ellipse cx="24" cy="13" rx="7" ry="10" transform="rotate(72 24 22)" fill="#e8cfdf" />
        <ellipse cx="24" cy="13" rx="7" ry="10" transform="rotate(144 24 22)" fill="#d5dbed" />
        <ellipse cx="24" cy="13" rx="7" ry="10" transform="rotate(216 24 22)" fill="#ecd4e0" />
        <ellipse cx="24" cy="13" rx="7" ry="10" transform="rotate(288 24 22)" fill="#cadfed" />
      </g>
      <circle cx="24" cy="22" r="5" fill="#f0ddb2" stroke="#cdbb96" strokeWidth=".7" />
      <path d="m22 20 1 1m3 2h1m-4 2h1" stroke="#c5ab87" strokeLinecap="round" />
      <path d="m28 55 14-5 3 7-14 5Z" fill="#f3dfdb" fillOpacity=".8" />
    </svg></span>}
  </div>;
}
