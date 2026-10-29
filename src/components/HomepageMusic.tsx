"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { musicActions, useMusicPlayer } from "@/lib/music-player-store";
import qqPlaylist from "@/lib/qq-playlist.json";
import { MusicCredit, MusicPlayMode, MusicSeek, MusicVolume, PlayerIcon } from "./MusicPlayer";
import MusicPlaylist from "./MusicPlaylist";
import RadioStarlight from "./StarWindow";
import "./HomepageMusic.css";

export default function HomepageMusic() {
  const { tracks, index, playing, loading, error, cloudMessage } = useMusicPlayer();
  const [failedCover, setFailedCover] = useState("");
  const [showPlaylist, setShowPlaylist] = useState(false);
  const surface = useRef<HTMLElement>(null);
  const [jadeAwake, setJadeAwake] = useState(false);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    const synchronize = () => setJadeAwake(inView && !document.hidden && !motion.matches);
    const observer = new IntersectionObserver(entries => { inView = entries.some(entry => entry.isIntersecting); synchronize(); });
    observer.observe(element);
    motion.addEventListener("change", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    return () => { observer.disconnect(); motion.removeEventListener("change", synchronize); document.removeEventListener("visibilitychange", synchronize); };
  }, []);
  const track = tracks[index];
  return <section ref={surface} className="homepage-music" aria-label="首页音乐播放器" data-jade-awake={jadeAwake} data-playing={playing}>
    <RadioStarlight />
    <div className="hm-track">
      <span className="hm-cover hm-jade-disc" aria-hidden="true">
        <svg className="hm-jade-rim" viewBox="0 0 80 80" fill="none" focusable="false">
          <circle className="hm-jade-rim__outer" cx="40" cy="40" r="36.5" strokeWidth="1.2" />
          <circle className="hm-jade-rim__inner" cx="40" cy="40" r="31.5" strokeWidth=".8" />
          <circle className="hm-jade-rim__orbit" cx="40" cy="40" r="34" strokeWidth=".65" strokeDasharray="1 5" />
          {[0, 60, 120, 180, 240, 300].map(angle => <g key={angle} transform={`rotate(${angle} 40 40)`}>
            <path className="hm-jade-rim__inlay" d="m40 1.5 3.3 5.8-3.3 5.8-3.3-5.8Z" strokeWidth=".75" />
            <path className="hm-jade-rim__outer" d="M34.7 8.2 40 5l5.3 3.2M40 13v4" strokeWidth=".75" strokeLinecap="round" />
          </g>)}
        </svg>
        {track.cover && track.cover !== failedCover ? <img src={track.cover} alt="" width="64" height="64" onError={() => setFailedCover(track.cover || "")} /> : <span>♪</span>}
      </span>
      <div className="hm-track-text"><span className="hm-source">{track.provider === "netease" ? "NETEASE MUSIC" : "小窝电台"}</span><strong>{track.title}</strong><span>{loading ? "正在加载…" : track.artist}</span></div>
      <a className="hm-qq-link" href={qqPlaylist.url} target="_blank" rel="noopener noreferrer" onClick={musicActions.pause} title={`在 QQ 音乐打开 ${qqPlaylist.tracks.length} 首原歌单`}>QQ 原歌单 <span aria-hidden="true">↗</span></a>
    </div>
    <MusicSeek label="首页音乐播放进度" />
    <div className="hm-controls">
      <MusicPlayMode label="首页" />
      <div className="hm-transport"><button className="music-icon-button" onClick={musicActions.previous} aria-label="首页上一首"><PlayerIcon name="previous" /></button><button className="hm-play" onClick={musicActions.togglePlay} aria-label={playing ? "首页暂停音乐" : "首页播放音乐"} aria-busy={loading}><PlayerIcon name={playing ? "pause" : "play"} /></button><button className="music-icon-button" onClick={musicActions.next} aria-label="首页下一首"><PlayerIcon name="next" /></button></div>
      <span className="hm-track-count">{String(index + 1).padStart(2, "0")} / {String(tracks.length).padStart(2, "0")}</span>
    </div>
    <MusicVolume label="首页音乐音量" />
    <button type="button" className="hm-playlist-toggle" onClick={() => setShowPlaylist(value => !value)} aria-expanded={showPlaylist} aria-controls="music-home-playlist"><PlayerIcon name="list" /><span>{showPlaylist ? "收起播放列表" : "播放列表 · 调整顺序"}</span><PlayerIcon name={showPlaylist ? "collapse" : "expand"} /></button>
    <MusicPlaylist id="music-home-playlist" hidden={!showPlaylist} />
    <MusicCredit />
    {cloudMessage && <p className="hm-cloud-message" role="status">{cloudMessage}</p>}
    {error && <p className="hm-error" role="alert">{error}</p>}
  </section>;
}

