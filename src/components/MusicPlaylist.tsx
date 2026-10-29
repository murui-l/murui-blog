"use client";

import { useEffect, useRef, useState } from "react";
import { musicActions, useMusicPlayer } from "@/lib/music-player-store";
import "./MusicPlaylist.css";

function OrderIcon({ direction }: { direction: "up" | "down" }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={direction === "up" ? "M12 19V5m-6 6 6-6 6 6" : "M12 5v14m-6-6 6 6 6-6"} /></svg>;
}

export default function MusicPlaylist({ id, hidden = false }: { id: string; hidden?: boolean }) {
  const { tracks, index, catalogLoaded, orderLoaded, orderEditable, orderDirty, orderSaving, orderConflict, orderMessage, localOrderAvailable } = useMusicPlayer();
  const adjustable = orderLoaded && orderEditable && catalogLoaded && !orderSaving && !orderConflict;
  const [announcement, setAnnouncement] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const draggedRef = useRef<string | null>(null);
  const orderButtons = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<{ id: string; direction: "up" | "down" } | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const preferred = orderButtons.current.get(`${target.id}-${target.direction}`);
    const fallback = orderButtons.current.get(`${target.id}-${target.direction === "up" ? "down" : "up"}`);
    (preferred && !preferred.disabled ? preferred : fallback)?.focus();
  }, [tracks]);

  function moveTrack(trackId: string, targetIndex: number, direction?: "up" | "down") {
    const song = tracks.find(track => track.id === trackId);
    if (!song || targetIndex < 0 || targetIndex >= tracks.length) return;
    if (direction) pendingFocus.current = { id: trackId, direction };
    if (!musicActions.moveTrack(trackId, targetIndex)) return;
    setAnnouncement(`《${song.title}》已移到第 ${targetIndex + 1} 首。`);
  }

  function finishDrag() {
    draggedRef.current = null;
    setDraggedId(null);
    setDropTargetId(null);
  }

  return <section id={id} className="music-queue" hidden={hidden} aria-labelledby={`${id}-title`}>
    <div className="music-queue-heading">
      <h3 id={`${id}-title`}>电台播放列表 <span>{tracks.length} 首</span></h3>
      {orderEditable && <button type="button" className="music-queue-reset" onClick={() => { if (musicActions.resetOrder()) setAnnouncement("已恢复默认顺序，保存后全站生效。"); }} disabled={!adjustable || tracks.length < 2}>恢复默认</button>}
    </div>
    <ol className="music-queue-list">
      {tracks.map((song, songIndex) => <li key={song.id} data-current={index === songIndex || undefined} data-dragging={draggedId === song.id || undefined} data-drop-target={dropTargetId === song.id && draggedId !== song.id || undefined}
        onDragOver={event => { if (draggedRef.current) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTargetId(song.id); } }}
        onDrop={event => { const trackId = draggedRef.current; if (!trackId) return; event.preventDefault(); if (trackId !== song.id) moveTrack(trackId, songIndex); finishDrag(); }}>
        {adjustable && <span className="music-queue-grip" draggable aria-hidden="true" title="拖动调整顺序"
          onDragStart={event => { draggedRef.current = song.id; setDraggedId(song.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", song.id); }} onDragEnd={finishDrag}>
          <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor"><circle cx="4" cy="5" r="1.2" /><circle cx="10" cy="5" r="1.2" /><circle cx="4" cy="10" r="1.2" /><circle cx="10" cy="10" r="1.2" /><circle cx="4" cy="15" r="1.2" /><circle cx="10" cy="15" r="1.2" /></svg>
        </span>}
        <button type="button" className="music-queue-select" onClick={() => musicActions.selectTrack(songIndex, true)} aria-current={index === songIndex ? "true" : undefined} aria-label={`播放《${song.title}》 · ${song.artist}${index === songIndex ? "，当前曲目" : ""}`}>
          <span className="music-queue-number" aria-hidden="true">{index === songIndex ? "♫" : String(songIndex + 1).padStart(2, "0")}</span>
          <span className="music-queue-copy"><strong>{song.title}</strong><small>{song.artist}</small></span>
        </button>
        {orderEditable && <div className="music-queue-order" role="group" aria-label={`调整《${song.title}》的顺序`}>
          <button type="button" ref={button => { if (button) orderButtons.current.set(`${song.id}-up`, button); else orderButtons.current.delete(`${song.id}-up`); }} onClick={() => moveTrack(song.id, songIndex - 1, "up")} disabled={!adjustable || songIndex === 0} aria-label={`上移《${song.title}》`} title="上移一首"><OrderIcon direction="up" /></button>
          <button type="button" ref={button => { if (button) orderButtons.current.set(`${song.id}-down`, button); else orderButtons.current.delete(`${song.id}-down`); }} onClick={() => moveTrack(song.id, songIndex + 1, "down")} disabled={!adjustable || songIndex === tracks.length - 1} aria-label={`下移《${song.title}》`} title="下移一首"><OrderIcon direction="down" /></button>
        </div>}
      </li>)}
    </ol>
    {orderEditable && <div className="music-queue-publish">
      <button type="button" className="music-queue-save" disabled={!adjustable || !orderDirty} onClick={() => { void musicActions.saveOrder(); }}>{orderSaving ? "正在保存…" : "保存到全站"}</button>
      {orderDirty && !orderConflict && <button type="button" className="music-queue-reset" disabled={orderSaving} onClick={musicActions.discardOrder}>取消调整</button>}
      {orderConflict && <button type="button" className="music-queue-reset" onClick={() => { void musicActions.reloadOrder(); }}>重新读取云端顺序</button>}
      {localOrderAvailable && <button type="button" className="music-queue-reset" disabled={!adjustable} onClick={musicActions.importLocalOrder}>导入此浏览器旧顺序</button>}
    </div>}
    <p className="music-queue-saved" role="status">{orderMessage}</p>
    {!orderEditable && orderMessage.includes("无法连接") && <button type="button" className="music-queue-reset" onClick={() => { void musicActions.refreshOrder(); }}>重试读取</button>}
    <p className="music-queue-saved">随机或循环模式仅影响自己的播放</p>
    <span className="music-queue-announcement" role="status" aria-live="polite">{announcement}</span>
  </section>;
}
