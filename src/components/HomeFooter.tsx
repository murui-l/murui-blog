"use client";

import Link from "./HomeMapLink";
import { useEffect, useRef, useState } from "react";
import { characterCollections, characterPhotos } from "@/lib/characters";
import type { GallerySnapshot } from "@/lib/gallery-types";
import { formatFooterUptime, formatLightTime, getFooterUptime, homeFooter } from "@/lib/home-footer";
import { getVoyagerEstimate, voyagerReferenceUrl, voyagerSourceUrl } from "@/lib/voyager";
import { KeepsakeButton } from "./KeepsakeProvider";
import FooterQuote from "./FooterQuote";
import RssSubscribe from "./RssSubscribe";
import SoftImage from "./SoftImage";
import "./HomeFooter.css";

export default function HomeFooter({ gallery, year }: { gallery: GallerySnapshot; year: number }) {
  const footer = useRef<HTMLElement>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let visible = false;
    let interval: number | undefined;
    let frame = 0;
    const stop = () => { window.clearInterval(interval); interval = undefined; cancelAnimationFrame(frame); frame = 0; };
    const update = () => setNow(Date.now());
    const synchronize = () => {
      stop();
      if (!visible || document.hidden) return;
      frame = requestAnimationFrame(() => { frame = 0; update(); });
      interval = window.setInterval(update, 1000);
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      synchronize();
    });
    if (footer.current) observer.observe(footer.current);
    document.addEventListener("visibilitychange", synchronize);
    return () => { stop(); observer.disconnect(); document.removeEventListener("visibilitychange", synchronize); };
  }, []);

  const uptime = getFooterUptime(now);
  const voyager = now === null ? null : getVoyagerEstimate(now);

  return <footer ref={footer} className="home-footer" aria-label="小窝页脚">
    <div className="home-footer__inner">
      <div className="home-footer__columns">
        <FooterQuote />

        <section className="home-footer__bookmarks" aria-labelledby="home-footer-bookmarks">
          <h2 className="home-footer__title" id="home-footer-bookmarks">随意逛逛</h2>
          <nav className="home-footer__links" aria-label="页脚书签">
            {homeFooter.links.map(entry => {
              if (entry.kind === "rss") return <div className="home-footer__link-slot" key={entry.kind}><RssSubscribe /></div>;
              if (entry.kind === "book" || entry.kind === "search") return <KeepsakeButton className="home-footer__link" key={entry.kind} panel={entry.kind}>{entry.label}</KeepsakeButton>;
              if (entry.kind === "external") return <a className="home-footer__link" key={entry.href} href={entry.href} target="_blank" rel="noopener noreferrer">{entry.label}<span aria-hidden="true">↗</span></a>;
              return <Link className="home-footer__link" key={entry.href} href={entry.href}>{entry.label}</Link>;
            })}
          </nav>
        </section>

        <section className="home-footer__collections" aria-labelledby="home-footer-collections">
          <h2 className="home-footer__title" id="home-footer-collections">kami</h2>
          <div className="home-footer__characters">{characterCollections.map(character => {
            const cover = characterPhotos(gallery, character.albumId).cover;
            return <Link className={`home-footer__character home-footer__character--${character.tone}`} key={character.slug} href={character.href} aria-label={`走进${character.name}收藏`}>
              {cover ? <><SoftImage className="home-footer__character-image" src={cover.src} alt="" width={cover.width} height={cover.height} sizes="(max-width: 700px) 113px, (max-width: 900px) 13vw, 112px" retry={false} style={{ aspectRatio: "auto" }} /><span className="home-footer__character-name">{character.name}</span></> : <span className="home-footer__character-placeholder">{character.name}</span>}
            </Link>;
          })}</div>
        </section>
      </div>

      <div className="home-footer__bottom">
        <div className="home-footer__time">
          <p className="home-footer__uptime-label">小窝已经亮着灯</p>
          <p className="home-footer__uptime"><span aria-hidden="true">◌</span> {formatFooterUptime(uptime)}</p>
          <p className="home-footer__copyright">© {year === 2026 ? "2026" : `2026–${year}`} Murui · 把喜欢的事，放进每一天。</p>
        </div>
        {(now === null || voyager) && <div className="home-footer__voyager" aria-busy={now === null}>
          <p className="home-footer__voyager-title">旅行者 1 号，还在走向远方<span aria-hidden="true"> ↗</span></p>
          <p className="home-footer__voyager-distance"><span className="home-footer__voyager-from">距地球约</span><strong>{voyager ? Math.round(voyager.distanceKm).toLocaleString("zh-CN") : "—"}</strong><span>公里</span></p>
          <p className="home-footer__voyager-detail">约 {voyager ? voyager.astronomicalUnits.toFixed(2) : "—"} AU<span aria-hidden="true"> · </span>光行时 {voyager ? formatLightTime(voyager.lightTimeSeconds) : "—"}</p>
          <p className="home-footer__estimate-note">离线估算<span aria-hidden="true"> · </span><a className="home-footer__estimate-source" href={voyagerSourceUrl} target="_blank" rel="noopener noreferrer">模型来源<span aria-hidden="true"> ↗</span></a><span aria-hidden="true"> · </span><a className="home-footer__estimate-source" href={voyagerReferenceUrl} target="_blank" rel="noopener noreferrer">NASA Horizons<span aria-hidden="true"> ↗</span></a></p>
        </div>}
      </div>
    </div>
  </footer>;
}
