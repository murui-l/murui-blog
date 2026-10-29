"use client";

import { useState } from "react";
import Icon from "./Icon";
import XiaohongshuCollection from "./XiaohongshuCollection";
import ArtworkImage from "./ArtworkImage";
import { originalWorks as works, artworkStatsDate } from "@/lib/artwork-collection";
import { personalArtworks } from "@/lib/personal-artworks";
import { roxyArtworks } from "@/lib/roxy-artworks";
import { mahiruArtworks } from "@/lib/mahiru-artworks";
import "./AnimeGallery.css";

export default function AnimeGallery() {
  const [character, setCharacter] = useState("全部");
  const filtered = works.filter(work => character === "全部" || work.character === character);
  return (
    <section className="ah-original-section" id="gallery" aria-labelledby="ah-original-title">
      <div className="ah-original-heading">
        <div><p className="ah-original-kicker"><span aria-hidden="true">✦</span> ARTISTS & LITTLE FAVORITES</p><h2 id="ah-original-title">可爱作品收藏 <span aria-hidden="true">♡</span></h2></div>
        <span className="ah-original-label">洛琪希 & 心海 & 惠惠 & 椎名真昼</span>
      </div>
      <nav className="ah-platform-nav" aria-label="浏览图片收藏"><a href="#personal-collection">小窝收藏 <Icon name="chevron" size={14}/></a><a href="#roxy-collection">洛琪希收藏 <Icon name="chevron" size={14}/></a><a href="#mahiru-collection">椎名真昼收藏 <Icon name="chevron" size={14}/></a><a href="#xiaohongshu-collection">小红书图文 <Icon name="chevron" size={14}/></a><a href="#pixiv-collection">Pixiv 插画 <Icon name="chevron" size={14}/></a></nav>
      <section className="ah-personal-collection" id="personal-collection" aria-labelledby="ah-personal-title">
        <div className="ah-platform-heading"><h3 id="ah-personal-title">小窝收藏</h3><span>把心动的瞬间留下来</span></div>
        <div className="ah-personal-list">{personalArtworks.map(work => (
          <article className="ah-original-card ah-original-card-pink" key={work.src}>
            <div className="ah-original-card-heading"><div className="ah-original-details"><div className="ah-original-meta"><span className="ah-original-character">心海</span><span>MY LITTLE FAVORITES</span></div><h3>{work.title}</h3></div></div>
            <div className="ah-original-picture"><ArtworkImage {...work} platform="站主提供" /></div>
          </article>
        ))}</div>
      </section>
      <section className="ah-personal-collection ah-roxy-collection" id="roxy-collection" aria-labelledby="ah-roxy-title">
        <div className="ah-platform-heading"><h3 id="ah-roxy-title">洛琪希收藏</h3></div>
        <div className="ah-personal-list">{roxyArtworks.map(work => (
          <article className="ah-original-card" key={work.src}>
            <div className="ah-original-picture"><ArtworkImage {...work} platform="站主提供" /></div>
          </article>
        ))}</div>
      </section>
      <section className="ah-personal-collection ah-mahiru-collection" id="mahiru-collection" aria-labelledby="ah-mahiru-title">
        <div className="ah-platform-heading"><h3 id="ah-mahiru-title">椎名真昼收藏</h3></div>
        <div className="ah-personal-list">{mahiruArtworks.map(work => (
          <article className="ah-original-card" key={work.src}>
            <div className="ah-original-picture"><ArtworkImage {...work} platform="站主提供" /></div>
          </article>
        ))}</div>
      </section>
      <XiaohongshuCollection />
      <div className="ah-platform-heading" id="pixiv-collection"><h3>Pixiv · 画师原作</h3><span>把喜欢的画，慢慢收藏</span></div>
      <div className="ah-original-toolbar">
        <div className="ah-original-filters" role="group" aria-label="按角色筛选原作">{["全部", "洛琪希", "心海", "惠惠"].map(item => <button type="button" key={item} aria-pressed={character === item} onClick={() => setCharacter(item)}>{item}</button>)}</div>
        <span className="ah-original-count" role="status" aria-live="polite" aria-atomic="true">{filtered.length} 幅 · {filtered.every(work => work.bookmarks !== undefined) ? "按收藏量排列" : "画师原作收藏"}</span>
      </div>
      <div className="ah-original-list">{filtered.map(work => (
        <article className={`ah-original-card${work.character === "心海" ? " ah-original-card-pink" : work.character === "惠惠" ? " ah-original-card-megumin" : ""}`} key={work.url}>
          <div className="ah-original-card-heading">
            <span className="ah-original-number" aria-hidden="true">{String(works.indexOf(work) + 1).padStart(2, "0")}<span>✧</span></span>
            <div className="ah-original-details">
              <div className="ah-original-meta"><span className="ah-original-character">{work.character}</span><span>ILLUSTRATION · PIXIV</span></div>
              <h3>{work.title}</h3><p className="ah-original-artist">画师 <strong>{work.artist}</strong></p>
              {(work.bookmarks !== undefined || work.likes !== undefined) && <p className="ah-original-popularity" title={`数据记录于 ${work.statsDate ?? artworkStatsDate}`}><span>{work.bookmarks !== undefined && <><span aria-hidden="true">♡ </span>{work.bookmarks.toLocaleString("en-US")} 收藏</>}</span>{work.likes !== undefined && <span>{work.likes.toLocaleString("en-US")} 赞</span>}</p>}
            </div>
          </div>
          <div className="ah-original-picture"><ArtworkImage src={work.src} width={work.width} height={work.height} title={work.title} author={work.artist} platform="Pixiv" sourceUrl={work.url} /></div>
          <div className="ah-original-card-footer"><a href={work.url} target="_blank" rel="noopener noreferrer" className="ah-original-action" aria-label={`在新标签页查看 ${work.artist} 的《${work.title}》Pixiv 原作`}>去 Pixiv 看原作 <span><Icon name="upRight" size={18} /></span></a></div>
        </article>
      ))}</div>
      <p className="ah-original-footnote">点开图片，慢慢看；也欢迎回到画师的原作页。<br/><small>收藏与点赞为收录时的公开记录，仅供参考。</small></p>
    </section>
  );
}
