"use client";

/* The lightbox deliberately uses the original, watermarked file. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { characterPhotos, type CharacterCollection } from "@/lib/characters";
import type { GalleryImage, GallerySnapshot } from "@/lib/gallery-types";
import SoftImage from "./SoftImage";
import Icon from "./Icon";
import CameraViewfinder from "./CameraViewfinder";
import "./CharacterGallery.css";

function sourceLink(value?: string) {
  try { const url = new URL(value || ""); return ["https:", "http:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export default function CharacterGallery({ character, initialData }: { character: CharacterCollection; initialData: GallerySnapshot }) {
  const [data, setData] = useState(initialData);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const backLink = useRef<HTMLAnchorElement>(null);
  const requestSequence = useRef(0);
  const { images, cover, remaining } = characterPhotos(data, character.albumId);
  const activeIndex = images.findIndex(image => image.id === lightboxId);
  const active = images[activeIndex];
  const source = sourceLink(active?.sourceUrl);

  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      const sequence = ++requestSequence.current;
      try {
        const response = await fetch("/api/gallery", { cache: "no-store", credentials: "omit", signal: controller.signal });
        if (!response.ok) return;
        const snapshot = await response.json() as GallerySnapshot;
        if (!controller.signal.aborted && sequence === requestSequence.current && Array.isArray(snapshot.images) && Array.isArray(snapshot.categories)) setData(snapshot);
      } catch { /* Retain the server snapshot while offline. */ }
    }
    const visible = () => { if (!document.hidden) void refresh(); };
    void refresh();
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, []);

  useEffect(() => {
    // A deleted photo, or one moved out of this album, must leave an open viewer too.
    if (lightboxId && !active && dialog.current?.open) dialog.current.close();
  }, [lightboxId, active]);

  function open(image: GalleryImage) {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    flushSync(() => setLightboxId(image.id));
    dialog.current?.showModal();
  }

  function move(offset: number) {
    if (images.length > 1 && activeIndex >= 0) setLightboxId(images[(activeIndex + offset + images.length) % images.length].id);
  }

  function picture(image: GalleryImage, isCover = false) {
    const failed = failures[image.id] === image.src;
    return <div className={`character-photo${isCover ? " character-photo--cover" : ""}`} key={image.id}>
      {failed ? <div className="character-photo__failed" style={{ aspectRatio: `${image.width} / ${image.height}` }}>
        <Icon name="image" size={28} /><span>图片暂时无法加载</span>
        <button type="button" onClick={() => setFailures(previous => { const next = { ...previous }; delete next[image.id]; return next; })}>重试</button>
      </div> : <button type="button" className="character-photo__open" onClick={() => open(image)} aria-haspopup="dialog" aria-label={`放大查看${character.name}${isCover ? "封面" : `图片 ${images.indexOf(image) + 1}`}`}>
        <SoftImage src={image.src} alt={image.alt || `${character.name}收藏图片`} width={image.width} height={image.height} priority={isCover} retry={false} sizes={isCover ? "(max-width: 740px) calc(100vw - 56px), (max-width: 1200px) 84vw, 1000px" : "(max-width: 640px) calc(100vw - 56px), (max-width: 1200px) 42vw, 480px"} onError={() => setFailures(previous => ({ ...previous, [image.id]: image.src }))} />
      </button>}
    </div>;
  }

  return <main id="main" className={`character-journal character-journal--${character.tone}`}>
    <div className="character-journal__paper">
      <header className="character-journal__heading">
        <Link ref={backLink} href="/gallery" className="character-journal__back"><Icon name="arrow" size={16} />照片墙</Link>
        <span className="character-journal__stamp" aria-hidden="true">COLLECTION<br />✧ MURUI ✧</span>
        <p className="character-journal__eyebrow">PICTURE SCRAPBOOK</p>
        <h1>{character.name}<span aria-hidden="true"> ✧</span></h1>
        <span className="character-journal__count">{images.length} 张收藏</span>
      </header>
      {cover ? <>
        <div className="character-journal__cover">{picture(cover, true)}</div>
        {remaining.length > 0 && <div className="character-journal__photos">{remaining.map(image => picture(image))}</div>}
      </> : <div className="character-journal__empty"><Icon name="image" size={38} /><p>这一页还没有照片。</p></div>}
      <footer className="character-journal__signature"><span aria-hidden="true">✧</span><span>Murui</span></footer>
    </div>

    <dialog ref={dialog} className="character-lightbox" aria-label={`${character.name}图片大图`} onClose={() => { setLightboxId(null); (returnFocus.current?.isConnected ? returnFocus.current : backLink.current)?.focus({ preventScroll: true }); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if (["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}>
      <button type="button" className="character-lightbox__close" aria-label="关闭大图" autoFocus onClick={() => dialog.current?.close()}><Icon name="close" size={23} /></button>
      {active && <div className="character-lightbox__content">
        <CameraViewfinder key={active.src} imageSelector=".character-lightbox__content>img" />
        <img key={active.src} src={active.src} width={active.width} height={active.height} alt={active.alt || `${character.name}收藏图片`} />
        {(active.author || source) && <p className="character-lightbox__source">{active.author && <span>{active.author}</span>}{source && <a href={source} target="_blank" rel="noopener noreferrer">作品来源 ↗</a>}</p>}
      </div>}
      {images.length > 1 && <>
        <button type="button" className="character-lightbox__prev" aria-label="上一张图片" onClick={() => move(-1)}><Icon name="chevron" size={25} /></button>
        <button type="button" className="character-lightbox__next" aria-label="下一张图片" onClick={() => move(1)}><Icon name="chevron" size={25} /></button>
      </>}
      {active && <span className="character-lightbox__counter" role="status">{activeIndex + 1} / {images.length}</span>}
    </dialog>
  </main>;
}
