"use client";

import { useEffect, useRef, useState } from "react";
import { initialFooterQuote } from "@/lib/footer-quote-data";
import { createFooterQuotePlayer } from "@/lib/footer-quote-player";
import type { QuoteStorage } from "@/lib/footer-quotes";

export default function FooterQuote() {
  const region = useRef<HTMLElement>(null);
  const [quote, setQuote] = useState(initialFooterQuote);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    let storage: QuoteStorage | undefined;
    try { storage = window.localStorage; } catch { /* Private browsing can deny access. */ }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const player = createFooterQuotePlayer({ onQuote: setQuote, onFade: setFading, reducedMotion: () => motion.matches, storage });
    let visible = false;
    const synchronize = () => { if (visible && !document.hidden) player.start(); else player.stop(); };
    const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); synchronize(); });
    if (region.current) observer.observe(region.current);
    document.addEventListener("visibilitychange", synchronize);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", synchronize); player.dispose(); };
  }, []);
  const attribution = [quote.author, quote.source ? `《${quote.source}》` : undefined].filter(Boolean).join(" · ");
  const showAttribution = !quote.id.startsWith("murui-warm-");
  return <section ref={region} className="home-footer__whispers" aria-labelledby="home-footer-whispers">
    <span className="home-footer__eyebrow" aria-hidden="true">A LITTLE THOUGHT TO KEEP</span>
    <h2 className="home-footer__title" id="home-footer-whispers">每日一言<span aria-hidden="true"> ✧</span></h2>
    <blockquote className={`home-footer__quote${fading ? " is-fading" : ""}`} aria-live="off">
      <div className="home-footer__quote-reserve" aria-hidden="true">
        <span className="home-footer__quote-copy">{"字".repeat(100)}</span>
        <span className="home-footer__quote-source">{"字".repeat(75)}</span>
      </div>
      <div className="home-footer__quote-content">
        <p className="home-footer__quote-copy home-footer__quote-text">{quote.text}</p>
        {showAttribution && <cite className="home-footer__quote-source"><a href={quote.href} target="_blank" rel="noopener noreferrer">{attribution || "一言"}</a></cite>}
      </div>
    </blockquote>
    <span className="home-footer__signature" aria-hidden="true">Murui <span>❀</span></span>
  </section>;
}
