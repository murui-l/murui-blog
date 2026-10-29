"use client";

/* The lightbox uses local, original-proportion public artwork. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import localFont from "next/font/local";
import { useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { homeTeyvatHref, teyvatDestinations, type TeyvatDestination } from "@/lib/teyvat";
import { musicActions, useMusicPlayer } from "@/lib/music-player-store";
import SoftImage from "./SoftImage";
import TeyvatLink from "./TeyvatLink";
import "./Teyvat.css";

const nationCalligraphy = localFont({
  src: "./fonts/MaShanZheng-teyvat.woff2",
  variable: "--font-teyvat-calligraphy",
  display: "swap",
  weight: "400",
  adjustFontFallback: false,
});

export default function TeyvatNationPage({ nation }: { nation: TeyvatDestination }) {
  const player = useMusicPlayer();
  const [active, setActive] = useState<number | null>(null);
  const [failures, setFailures] = useState<Record<string, boolean>>({});
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const back = useRef<HTMLAnchorElement>(null);
  const pictures = [nation.cover, ...nation.scenes];
  const current = active === null ? null : pictures[active];
  const matching = player.teyvatNation === nation.slug;
  const track = matching ? player.tracks[player.index] : nation.tracks[0];
  const open = (index: number) => { previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; flushSync(() => setActive(index)); dialog.current?.showModal(); };
  const move = (step: number) => setActive(index => index === null ? null : (index + step + pictures.length) % pictures.length);
  const toggle = () => { if (!matching || player.error) musicActions.enterTeyvat(nation.slug, nation.tracks, true); else musicActions.togglePlay(); };
  return <main id="main" className={`${nationCalligraphy.variable} teyvat-route teyvat-country teyvat-country--${nation.slug}`} style={{ "--nation-accent": nation.color, "--nation-deep": nation.deep } as CSSProperties}>
    <section className="teyvat-country__hero" aria-labelledby="teyvat-country-title">
      <SoftImage src={nation.cover.src} width={nation.cover.width} height={nation.cover.height} alt={`${nation.name}风景`} priority className="teyvat-country__cover" />
      <div className="teyvat-country__veil" aria-hidden="true" />
      <div className="teyvat-country__top"><Link ref={back} href={homeTeyvatHref}>← 地图</Link><button type="button" onClick={() => open(0)} aria-label={`放大${nation.name}封面`}>⤢</button></div>
      <header className="teyvat-country__title"><img src={nation.crest.src} width={100} height={100} alt="" /><span>{nation.english}</span><h1 id="teyvat-country-title">{nation.name}</h1><span className="teyvat-country__flourish" aria-hidden="true">— ✧ —</span></header>
      <div className="teyvat-country__music"><button type="button" onClick={toggle} aria-label={matching && player.playing ? "暂停地区音乐" : "播放地区音乐"}>{matching && player.playing ? "Ⅱ" : "▶"}</button><div><span>地区旋律</span><strong>{matching && player.loading ? "正在加载…" : track.title}</strong></div><a href={track.source} target="_blank" rel="noopener noreferrer" aria-label="打开地区音乐来源">↗</a></div>
    </section>
    <nav className="teyvat-nation-tabs" aria-label="切换目的地">{teyvatDestinations.map(destination => <TeyvatLink key={destination.slug} nation={destination.slug} aria-current={nation.slug === destination.slug ? "page" : undefined}>{destination.name}</TeyvatLink>)}</nav>
    <section className="teyvat-country__gallery" aria-label={`${nation.name}风景画廊`}>{nation.scenes.map((image, index) => <div className="teyvat-country__photo" key={image.src}>{failures[image.src]
      ? <div className="teyvat-country__failed" style={{ aspectRatio: `${image.width} / ${image.height}` }}><button type="button" onClick={() => setFailures(previous => ({ ...previous, [image.src]: false }))}>重新加载</button></div>
      : <button type="button" onClick={() => open(index + 1)} aria-label={`放大${nation.name}风景 ${index + 1}`}><SoftImage src={image.src} width={image.width} height={image.height} alt={`${nation.name}风景 ${index + 1}`} retry={false} onError={() => setFailures(previous => ({ ...previous, [image.src]: true }))} sizes="(max-width:700px) calc(100vw - 40px), 50vw" /></button>}</div>)}</section>
    <footer className="teyvat-country__colophon"><span>Murui <span aria-hidden="true">✧</span></span><details><summary>素材来源</summary><a href={nation.cover.source} target="_blank" rel="noopener noreferrer">风景 · 原神官方 ↗</a>{nation.kind !== "nation" ? <span>图案 · Murui</span> : <a href={nation.crest.source} target="_blank" rel="noopener noreferrer">徽记 · 原神官方 ↗</a>}<a href="https://act.hoyolab.com/ys/app/interactive-map/index.html" target="_blank" rel="noopener noreferrer">地图 · HoYoLAB ↗</a>{nation.tracks.map(song => <a key={song.id} href={song.source} target="_blank" rel="noopener noreferrer">{song.title} · {song.artist} ↗</a>)}</details></footer>
    <dialog ref={dialog} className="teyvat-lightbox" aria-label={`${nation.name}风景大图`} onClose={() => { setActive(null); (previousFocus.current?.isConnected ? previousFocus.current : back.current)?.focus({ preventScroll: true }); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}>
      <button type="button" className="teyvat-lightbox__close" aria-label="关闭大图" autoFocus onClick={() => dialog.current?.close()}>×</button>
      {current && <div className="teyvat-lightbox__content"><img src={current.src} alt={`${nation.name}风景 ${(active ?? 0) + 1}`} width={current.width} height={current.height} /><a href={current.source} target="_blank" rel="noopener noreferrer">原神官方 · HoYoverse ↗</a></div>}
      <button className="teyvat-lightbox__prev" type="button" aria-label="上一张" onClick={() => move(-1)}>‹</button><button className="teyvat-lightbox__next" type="button" aria-label="下一张" onClick={() => move(1)}>›</button><span className="teyvat-lightbox__count">{(active ?? 0) + 1} / {pictures.length}</span>
    </dialog>
  </main>;
}
