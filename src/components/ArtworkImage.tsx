"use client";

/* Local artwork is already compressed; preserve its full composition and size. */
/* eslint-disable @next/next/no-img-element */
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Icon from "./Icon";

type ArtworkImageProps = {
  src: string;
  width: number;
  height: number;
  title: string;
  author?: string;
  platform: "Pixiv" | "小红书" | "站主提供";
  sourceUrl?: string;
};

export default function ArtworkImage({ src, width, height, title, author, platform, sourceUrl }: ArtworkImageProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const creditId = useId();
  const credit = [author, platform].filter(Boolean).join(" · ");

  function open() {
    if (dialog.current?.open) return;
    flushSync(() => setIsOpen(true));
    dialog.current?.showModal();
  }

  function closed() {
    setIsOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  return (
    <div className="ah-artwork">
      <button ref={trigger} type="button" className="ah-artwork-trigger" onClick={open} aria-label={`放大查看${author ? ` ${author} 的` : ""}《${title}》`} aria-haspopup="dialog">
        <img className="ah-artwork-image" src={src} width={width} height={height} alt={`${title}，${credit}`} loading="lazy" decoding="async" />
        <span className="ah-artwork-zoom" aria-hidden="true"><Icon name="plus" size={17} /></span>
      </button>
      <p className="ah-artwork-credit"><span>{credit}</span>{sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`在新标签页查看《${title}》的 ${platform} 出处`}>查看出处 <Icon name="upRight" size={12} /></a>}</p>

      <dialog ref={dialog} className="ah-artwork-dialog" aria-labelledby={titleId} aria-describedby={creditId} onClose={closed} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className="ah-artwork-dialog-inner">
          <button type="button" className="ah-artwork-close" aria-label="关闭大图" onClick={() => dialog.current?.close()} autoFocus><Icon name="close" size={22} /></button>
          {isOpen && <img className="ah-artwork-full" src={src} width={width} height={height} alt={`${title}，${credit}`} />}
          <div className="ah-artwork-caption"><h2 id={titleId}>{title}</h2><p id={creditId}>{credit}</p>{sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer">查看出处 <Icon name="upRight" size={15} /><span className="ah-artwork-sr">（在新标签页打开）</span></a>}</div>
        </div>
      </dialog>
    </div>
  );
}
