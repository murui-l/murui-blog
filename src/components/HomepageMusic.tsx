"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
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
  const track = tracks[index];
  return <section className="homepage-music" aria-label="首页音乐播放器">
    <RadioStarlight />
    <div className="hm-track">
      <span className={`hm-cover${playing ? " hm-cover-playing" : ""}`} aria-hidden="true">{track.cover && track.cover !== failedCover ? <img src={track.cover} alt="" width="64" height="64" onError={() => setFailedCover(track.cover || "")} /> : <span>♪</span>}</span>
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

