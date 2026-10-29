"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { homeProfile } from "@/lib/home-profile";
import type { SiteChange } from "@/lib/changelog";
import useLoopTyping from "./useLoopTyping";
import HomeHistory from "./HomeHistory";

function SocialIcon({ name }: { name: "github" | "bilibili" }) {
  return name === "github" ? <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.26-.45-1.28.1-2.66 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8c.85 0 1.7.12 2.5.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.66.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg> : <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><rect x="3" y="7" width="18" height="14" rx="4" /><path d="m7 2 4 5m6-5-4 5M7 12v3m10-3 2 1 2-1" /></svg>;
}

export default function HomeHero({ avatar, description, notice }: { avatar: string; description: string; notice: SiteChange }) {
  const hero = useRef<HTMLElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const profile = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [docked, setDocked] = useState(true);
  const dockedRef = useRef(true);
  const typed = useLoopTyping(homeProfile.typingLines, enhanced && !reduced && !docked, cover);
  const typedName = useLoopTyping(homeProfile.nameLines, enhanced && !reduced && docked, profile, "name");
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = hero.current;
      if (!node) return;
      const progress = media.matches || window.innerHeight < 600 ? 1 : Math.min(1, Math.max(0, -node.getBoundingClientRect().top / (window.innerHeight * (window.innerWidth < 700 ? .38 : .52))));
      node.style.setProperty("--hero-progress", String(progress));
      node.style.setProperty("--avatar-progress", String(Math.min(1, progress / .85)));
      node.style.setProperty("--profile-opacity", String(Math.min(1, Math.max(0, (progress - .18) / .6))));
      const nextDocked = media.matches || progress >= .55;
      if (dockedRef.current !== nextDocked) { dockedRef.current = nextDocked; setDocked(nextDocked); }
    };
    const schedule = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(update); };
    const modeChanged = () => { setReduced(media.matches); schedule(); };
    frame = requestAnimationFrame(() => { setEnhanced(true); setReduced(media.matches); update(); });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    media.addEventListener("change", modeChanged);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); document.removeEventListener("visibilitychange", schedule); media.removeEventListener("change", modeChanged); };
  }, []);
  return <section ref={hero} className="mh-hero" data-enhanced={enhanced} data-reduced={reduced} aria-labelledby="home-title">
    <h1 id="home-title" className="sr-only">Murui · 沐瑞的小窝</h1>
    <div className="mh-sticky">
      <div className="mh-hero-toolbar"><span className="mh-edition">MY LITTLE SCRAPBOOK</span><div className="mh-toolbar-actions"><HomeHistory /><button ref={trigger} type="button" className="mh-notice-trigger" aria-haspopup="dialog" aria-controls="home-notice" onClick={() => { document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach(other => other.close("switch")); if (dialog.current) { dialog.current.returnValue = ""; dialog.current.showModal(); } }}><span aria-hidden="true">♥</span> 今日公告 <span aria-hidden="true">↗</span></button></div></div>
      <div ref={cover} className="mh-cover" aria-hidden={enhanced && docked}><p className="mh-eyebrow">PHOTOS, MUSIC & LITTLE MOMENTS</p><span className="mh-title" aria-hidden="true">{homeProfile.id}</span><div className="mh-typing"><span className="mh-terminal-dots" aria-hidden="true"><i /><i /><i /></span><span className="mh-prompt">{homeProfile.terminal}</span><span className="mh-typed" aria-label={homeProfile.subtitle}>{typed}</span><span className="mh-cursor" aria-hidden="true" /></div></div>
      <div ref={profile} className="mh-profile" inert={enhanced && !docked} aria-hidden={enhanced && !docked}>
        <div className="mh-avatar-wrap"><span className="mh-avatar-note">你好呀，欢迎来坐坐</span><span className="mh-avatar">{avatar && !avatarFailed ? <img src={avatar} alt="Murui 的头像" width={180} height={180} onError={() => setAvatarFailed(true)} /> : <span aria-label="Murui 的头像">M</span>}</span><span className="mh-avatar-star" aria-hidden="true">✧</span></div>
        <section className="mh-terminal" aria-label="Murui 个人名片"><div className="mh-terminal-bar"><span className="mh-terminal-dots" aria-hidden="true"><i /><i /><i /></span><span>murui-profile</span></div><div className="mh-terminal-body"><p className="mh-path">~/my-little-home</p><h2 aria-label="Murui · 沐瑞"><span>{homeProfile.terminal}</span> <b className="mh-name" aria-hidden="true">{typedName}<i className="mh-cursor" /></b></h2><p className="mh-description">{description}</p><div className="mh-social">{homeProfile.social.map(link => <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer"><SocialIcon name={link.icon} />{link.name}<span aria-hidden="true">↗</span></a>)}</div></div></section>
      </div>
      <span className="mh-corner mh-corner-left" aria-hidden="true" /><span className="mh-corner mh-corner-right" aria-hidden="true" />
    </div>
    <dialog ref={dialog} id="home-notice" className="mh-notice" aria-labelledby="home-notice-title" onClose={() => { if (dialog.current?.returnValue !== "switch") trigger.current?.focus({ preventScroll: true }); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="mh-notice-body"><button className="mh-notice-close" type="button" aria-label="关闭今日公告" autoFocus onClick={() => dialog.current?.close()}>×</button><p className="mh-notice-label">♥ 今日公告 <time dateTime={notice.date}>{notice.date}</time></p><h2 id="home-notice-title">{notice.title}</h2><ul>{notice.items.map(item => <li key={item}>{item}</li>)}</ul>{notice.link && <Link className="mh-notice-link" href={notice.link.href} onClick={() => dialog.current?.close()}>{notice.link.label} <span aria-hidden="true">↗</span></Link>}<Link className="mh-notice-history" href="/changelog" onClick={() => dialog.current?.close()}>翻开小窝成长记 →</Link></div>
    </dialog>
  </section>;
}
