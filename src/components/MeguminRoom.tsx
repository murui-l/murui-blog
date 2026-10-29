"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import SoftImage from "./SoftImage";
import { meguminIntroduction, meguminPet, meguminQuotes, meguminSpells } from "@/lib/megumin";
import type { GalleryImage } from "@/lib/gallery-types";
import "./MeguminRoom.css";

function MeguminPhoto({ artwork }: { artwork: GalleryImage }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <div className="mg-gallery-item">
    <Link className="mg-gallery-link" href={`/gallery?album=megumin&image=${encodeURIComponent(artwork.id)}`} aria-label="在惠惠相册中查看大图">
      <SoftImage key={attempt} src={artwork.src} alt={artwork.alt || "惠惠收藏图片"} width={artwork.width} height={artwork.height} sizes="(max-width: 680px) 90vw, 45vw" retry={false} onError={() => setFailed(true)} />
    </Link>
    {failed && <button type="button" className="mg-image-retry" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>重新加载</button>}
  </div>;
}

export default function MeguminRoom({ galleryImages }: { galleryImages: GalleryImage[] }) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteHovered, setQuoteHovered] = useState(false);
  const [quoteFocused, setQuoteFocused] = useState(false);
  const quotePaused = quoteHovered || quoteFocused;
  const currentQuote = meguminQuotes[quoteIndex];

  useEffect(() => {
    if (quotePaused || meguminQuotes.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setQuoteIndex(index => (index + 1) % meguminQuotes.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [quotePaused]);

  return <main id="main" className="mg-room">
    <div className="mg-shell">
      <div className="mg-breadcrumb"><Link href="/">小窝</Link><span aria-hidden="true">/</span><span>惠惠の爆裂魔法小屋</span></div>
      <section className="mg-hero" aria-labelledby="mg-title">
        <div className="mg-hero-copy">
          <span className="mg-kicker"><span aria-hidden="true">✦</span> A LITTLE EXPLOSION, A LOT OF JOY</span>
          <div className="mg-hero-label">红魔族 · 爆裂魔法专修</div>
          <h1 id="mg-title">惠惠<span>の</span><br/>爆裂魔法小屋<span className="mg-title-star" aria-hidden="true">✧</span></h1>
          <p className="mg-introduction">{meguminIntroduction}</p>
          <div className="mg-hero-actions"><a className="mg-button" href="#megumin-spells">翻开咏唱魔法书 <span aria-hidden="true">↗</span></a><a className="mg-text-link" href="#megumin-quotes">看看每日一句 <span aria-hidden="true">→</span></a></div>
          <p className="mg-hero-footnote"><span aria-hidden="true">♡</span> 今天的魔力，也要留给喜欢的事。</p>
        </div>
        <div className="mg-hero-art">
          <div className="mg-magic-circle" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span></div>
          <span className="mg-art-sticker" aria-hidden="true">EXPLOSION!</span>
          <img src="/images/megumin/character.webp" alt="戴着红魔族魔法帽、身披斗篷的惠惠" width={976} height={1378} fetchPriority="high" />
          <a className="mg-art-caption" href="https://konosuba.com/bakuen/character/" target="_blank" rel="noopener noreferrer">Megumin · 官方角色立绘 ↗</a>
        </div>
      </section>

      <nav className="mg-room-nav" aria-label="惠惠栏目分区"><a href="#megumin-quotes"><span aria-hidden="true">✧</span> 每日一句</a><a href="#megumin-spells"><span aria-hidden="true">✦</span> 咏唱魔法书</a><a href="#megumin-gallery"><span aria-hidden="true">♡</span> 惠惠的瞬间</a></nav>

      <section id="megumin-quotes" className="mg-section" aria-labelledby="mg-quotes-title">
        <h2 id="mg-quotes-title" className="mg-visually-hidden">每日一句</h2>
        {currentQuote && <div className="mg-featured-quote mg-auto-quote" aria-label="惠惠每日一句，中日双语自动轮播，悬停或聚焦时暂停" tabIndex={0} onMouseEnter={() => setQuoteHovered(true)} onMouseLeave={() => setQuoteHovered(false)} onFocus={() => setQuoteFocused(true)} onBlur={() => setQuoteFocused(false)}><span className="mg-quote-mark" aria-hidden="true">“</span><div className="mg-quote-display" aria-live="off"><blockquote className="mg-quote-reveal" key={currentQuote.id} cite={currentQuote.sourceUrl} data-quote-id={currentQuote.id}><p className="mg-quote-chinese" lang="zh-CN">{currentQuote.text}</p><p className="mg-quote-japanese" lang="ja">{currentQuote.japanese}</p></blockquote></div></div>}
      </section>

      <section className="mg-pet-section" aria-label="惠惠 Codex 桌宠">
        <a className="mg-pet-repository" href={meguminPet.repository} target="_blank" rel="noopener noreferrer"><span>惠惠 Codex 桌宠</span><span className="mg-pet-github">GitHub <span aria-hidden="true">↗</span></span></a>
        <picture className="mg-pet-animation"><source media="(prefers-reduced-motion: reduce)" srcSet={meguminPet.poster} /><img src={meguminPet.animation} alt="惠惠脱力向前倒下，随后趴着休息" width={meguminPet.width} height={meguminPet.height} loading="lazy" decoding="async" /></picture>
      </section>

      <section id="megumin-spells" className="mg-section mg-spell-section" aria-labelledby="mg-spells-title">
        <h2 id="mg-spells-title" className="mg-visually-hidden">咏唱</h2>
        <div className="mg-spell-collection">
          {meguminSpells.map(spell => (
            <blockquote className="mg-incantation mg-spell-lines" key={spell.id} cite={spell.sourceUrl} data-spell-id={spell.id} data-japanese-kind={spell.japaneseKind}>
              {spell.lines.map((line, lineIndex) => (
                <div className="mg-spell-verse" key={spell.id + "-" + lineIndex}>
                  <p lang="zh-CN" className={/explosion/i.test(line) ? "mg-verse-chinese mg-explosion" : "mg-verse-chinese"}>{line}</p>
                  {spell.japanese?.[lineIndex] && spell.japanese[lineIndex] !== line && <p lang="ja" className="mg-verse-japanese" title={spell.japaneseKind === "translation" ? "根据本站中文咏唱翻译的日文" : undefined}>{spell.japanese[lineIndex]}</p>}
                </div>
              ))}
            </blockquote>
          ))}
        </div>
      </section>

      <section id="megumin-gallery" className="mg-section" aria-labelledby="mg-gallery-title">
        <h2 id="mg-gallery-title" className="mg-visually-hidden">惠惠相册</h2>
        <div className="mg-gallery mg-gallery-collection">{galleryImages.map(artwork => <MeguminPhoto artwork={artwork} key={artwork.id} />)}</div>
      </section>

      <div className="mg-goodbye"><span aria-hidden="true">✦</span><p>今天也喜欢爆裂魔法！</p><Link href="/">带着一点魔法，回到小窝 <span aria-hidden="true">→</span></Link></div>
    </div>
  </main>;
}
