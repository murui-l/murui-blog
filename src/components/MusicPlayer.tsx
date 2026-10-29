"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { formatMusicTime } from "@/lib/music";
import { attachMusicAudio, musicActions, useMusicPlayer } from "@/lib/music-player-store";
import qqPlaylist from "@/lib/qq-playlist.json";
import MusicPlaylist from "./MusicPlaylist";
import MusicLyrics from "./MusicLyrics";
import "./MusicPlayer.css";

type Glyph = "play" | "pause" | "previous" | "next" | "volume" | "muted" | "expand" | "collapse" | "list" | "repeat" | "shuffle" | "external" | "note";
export function PlayerIcon({ name }: { name: Glyph }) {
  const paths: Record<Glyph, string> = {
    play: "m9 5 11 7-11 7Z", pause: "M8 5v14M16 5v14",
    previous: "M5 5v14m14-14L8 12l11 7Z", next: "M19 5v14M5 5l11 7-11 7Z",
    volume: "M11 5 6 9H3v6h3l5 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
    muted: "M11 5 6 9H3v6h3l5 4ZM16 9l6 6m0-6-6 6",
    expand: "m7 14 5-5 5 5", collapse: "m7 10 5 5 5-5",
    list: "M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01",
    repeat: "m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-3v5a2 2 0 0 1-2 2H3",
    shuffle: "m18 3 3 3-3 3M3 18h3c4 0 8-12 12-12h3M3 6h3c2 0 4 3 6 6s4 6 6 6h3m-3-3 3 3-3 3",
    external: "M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",
    note: "M9 18V5l12-2v13M9 9l12-2M9 18a3 3 0 1 1-3-3c1.7 0 3 .9 3 3Zm12-2a3 3 0 1 1-3-3c1.7 0 3 .9 3 3Z",
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export function MusicPlayMode({ label = "" }: { label?: string }) {
  const { playMode } = useMusicPlayer();
  const modes = {
    list: { text: "列表循环", next: "随机播放", icon: "repeat" },
    shuffle: { text: "随机播放", next: "单曲循环", icon: "shuffle" },
    "repeat-one": { text: "单曲循环", next: "列表循环", icon: "repeat" },
  } as const;
  const mode = modes[playMode];
  const description = `${label}当前${mode.text}，点击切换到${mode.next}`;
  return <button type="button" className="music-mode-button" onClick={musicActions.cyclePlayMode} aria-label={description} title={description}>
    <span className="music-mode-icon"><PlayerIcon name={mode.icon} />{playMode === "repeat-one" && <span className="music-repeat-one">1</span>}</span><span>{mode.text}</span>
  </button>;
}

export function MusicSeek({ label = "播放进度" }: { label?: string }) {
  const { elapsed, duration } = useMusicPlayer();
  const progress = duration > 0 ? Math.min(100, elapsed / duration * 100) : 0;
  return <div className="music-seek"><input type="range" min="0" max={duration || 1} step=".1" value={Math.min(elapsed, duration || 1)} disabled={!duration} aria-label={label} aria-valuetext={`${formatMusicTime(elapsed)} / ${formatMusicTime(duration)}`} style={{ "--music-fill": `${progress}%` } as CSSProperties} onChange={event => musicActions.seek(Number(event.target.value))} /><div><span>{formatMusicTime(elapsed)}</span><span>{formatMusicTime(duration)}</span></div></div>;
}

export function MusicVolume({ label = "音乐音量" }: { label?: string }) {
  const { volume } = useMusicPlayer();
  return <div className="music-volume"><button className="music-icon-button" onClick={musicActions.toggleMute} aria-label={volume > 0 ? "静音" : "取消静音"}><PlayerIcon name={volume > 0 ? "volume" : "muted"} /></button><input type="range" min="0" max="1" step=".01" value={volume} aria-label={label} aria-valuetext={`${Math.round(volume * 100)}%`} style={{ "--music-fill": `${volume * 100}%` } as CSSProperties} onChange={event => musicActions.volume(Number(event.target.value))} /><span>{Math.round(volume * 100)}%</span></div>;
}

export function MusicCredit() {
  const { tracks, index } = useMusicPlayer();
  const track = tracks[index];
  return <div className="music-credit"><a href={track.source} target="_blank" rel="noopener noreferrer">{track.provider === "netease" ? "在网易云打开 ↗" : `${track.title} · Kevin MacLeod`}</a>{track.provider === "local" && <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>}</div>;
}

export default function MusicPlayer() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const player = useMusicPlayer();
  const { tracks, index, playing, loading, elapsed, duration, error, cloudMessage } = player;
  const [expanded, setExpanded] = useState(true);
  const travelPanel = useRef({ active: false, expanded: true });
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [qqMode, setQqMode] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleSongs, setVisibleSongs] = useState(20);
  const track = tracks[index];
  useEffect(() => {
    const travelling = pathname === "/teyvat" || pathname.startsWith("/teyvat/");
    if (travelPanel.current.active === travelling) return;
    if (travelling) travelPanel.current.expanded = expanded;
    travelPanel.current.active = travelling;
    // Keep the scenery clear; the same player can still be expanded at any time.
    const frame = requestAnimationFrame(() => setExpanded(travelling ? false : travelPanel.current.expanded));
    return () => cancelAnimationFrame(frame);
  }, [pathname, expanded]);
  const progress = duration > 0 ? Math.min(100, elapsed / duration * 100) : 0;
  const qqSongs = qqPlaylist.tracks.filter(song => `${song.title} ${song.artist}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const element = audioRef.current;
    if (element) return attachMusicAudio(element);
  }, []);

  return <section className={`music-player${expanded ? " music-expanded" : " music-minimized"}`} aria-label="小窝音乐播放器" onKeyDown={event => { if (event.key === "Escape" && expanded) { setExpanded(false); expandRef.current?.focus(); } }}>
    <audio ref={audioRef} preload="none" />
    <div className="music-top">
      <span className={`music-record${playing ? " music-record-playing" : ""}`} aria-hidden="true"><span>♪</span></span>
      <div className="music-track-copy"><span className="music-kicker">小窝电台 <span aria-hidden="true">✿</span></span><strong>{track.title}</strong><span className="music-artist">{loading ? "正在加载…" : track.artist}</span></div>
      <button className="music-play" onClick={musicActions.togglePlay} aria-label={playing ? "暂停音乐" : "播放音乐"}><PlayerIcon name={playing ? "pause" : "play"} /></button>
      <button ref={expandRef} className="music-icon-button music-expand" onClick={() => setExpanded(value => !value)} aria-label={expanded ? "收起播放器" : "展开播放器"} aria-expanded={expanded} aria-controls="music-floating-details"><span className="music-minimized-note"><PlayerIcon name="note" /></span><span className="music-expand-chevron"><PlayerIcon name={expanded ? "collapse" : "expand"} /></span></button>
    </div>
    <div className="music-mini-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    <div id="music-floating-details" className="music-details" hidden={!expanded}>
      <div className="music-source-tabs" role="group" aria-label="选择音乐来源"><button onClick={() => setQqMode(false)} aria-pressed={!qqMode}>小窝电台</button><button onClick={() => setQqMode(true)} aria-pressed={qqMode}>QQ 原歌单</button></div>
      {qqMode ? <div className="music-qq-panel">
        <p className="music-qq-note">QQ 原歌单 · {qqPlaylist.tracks.length} 首外部链接<br />点一首歌，去 QQ 音乐听听 <span aria-hidden="true">↗</span></p>
        <label className="music-qq-search"><span>找歌</span><input type="search" placeholder="歌名 / 歌手" value={query} onChange={event => { setQuery(event.target.value); setVisibleSongs(20); }} /></label>
        <span className="music-qq-count">{query.trim() ? `找到 ${qqSongs.length} 首` : `收藏了 ${qqSongs.length} 首歌`}</span>
        <ol className="music-qq-songs">{qqSongs.slice(0, visibleSongs).map((song, songIndex) => <li key={`${song.mid}-${songIndex}`}><a href={`https://y.qq.com/n/ryqq_v2/songDetail/${song.mid}`} target="_blank" rel="noopener noreferrer" onClick={musicActions.pause}><span>{String(songIndex + 1).padStart(2, "0")}</span><span>{song.title}<small>{song.artist}</small></span><span aria-hidden="true">↗</span></a></li>)}{qqSongs.length === 0 && <li className="music-qq-empty">暂时没找到这首歌。</li>}{visibleSongs < qqSongs.length && <li><button className="music-qq-more" onClick={() => setVisibleSongs(count => count + 20)}>再看一些 · 还有 {qqSongs.length - visibleSongs} 首</button></li>}</ol>
        <div className="music-credit"><a href={qqPlaylist.url} target="_blank" rel="noopener noreferrer" onClick={musicActions.pause}>打开完整歌单 ↗</a><span>更新于 {qqPlaylist.updatedAt}</span></div>
      </div> : <>
        <MusicLyrics compact />
        <MusicSeek />
        <div className="music-controls">
          <MusicPlayMode />
          <div className="music-transport"><button className="music-icon-button" onClick={musicActions.previous} aria-label="上一首"><PlayerIcon name="previous" /></button><span>{String(index + 1).padStart(2, "0")} / {String(tracks.length).padStart(2, "0")}</span><button className="music-icon-button" onClick={musicActions.next} aria-label="下一首"><PlayerIcon name="next" /></button></div>
          <button type="button" className="music-icon-button music-queue-toggle" onClick={() => setShowPlaylist(value => !value)} aria-label={showPlaylist ? "收起电台播放列表" : "打开电台播放列表，调整顺序"} title="播放列表与排序" aria-expanded={showPlaylist} aria-controls="music-floating-playlist"><PlayerIcon name="list" /></button>
        </div>
        <MusicVolume />
        <MusicPlaylist id="music-floating-playlist" hidden={!showPlaylist} />
        <MusicCredit />
        {cloudMessage && <p className="music-cloud-message">{cloudMessage}</p>}
      </>}
    </div>
    {error && <p className="music-error" role="alert">{error}</p>}
  </section>;
}
