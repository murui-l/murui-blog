"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "./HomeMapLink";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { KeepsakeButton } from "./KeepsakeProvider";
import "./Header.css";
import KokomiWhisper from "./KokomiWhisper";
export default function Header({ children }: { children: ReactNode }) {
  const path = usePathname();
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const focusTimer = useRef<number | undefined>(undefined);
  const entryVisible = useRef(true);
  const [visible, setVisible] = useState(true);
  const pointerInside = useRef(false);
  const pointerType = useRef("");
  const focusFirstLink = useRef(false);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const expanded = openPath === path && visible;
  const entryInView = () => {
    const rect = trigger.current?.getBoundingClientRect();
    return !!rect && rect.bottom > 0 && rect.top < window.innerHeight;
  };
  useEffect(() => {
    if (!expanded || !focusFirstLink.current) return;
    focusFirstLink.current = false;
    // Wait for inert removal and the menu's visibility transition before focusing.
    focusTimer.current = window.setTimeout(() => {
      focusTimer.current = undefined;
      if (entryVisible.current && entryInView()) panel.current?.querySelector<HTMLAnchorElement>("nav a")?.focus({ preventScroll: true });
    }, 250);
    return () => { window.clearTimeout(focusTimer.current); focusTimer.current = undefined; };
  }, [expanded]);
  const canHover = () => window.matchMedia("(min-width: 761px) and (any-hover: hover)").matches;
  const enterNavigation = (type: string) => {
    if (type === "touch" || !canHover() || !entryVisible.current || !entryInView()) return;
    pointerInside.current = true;
    showNavigation();
  };
  const leaveNavigation = (type: string) => {
    if (type === "touch" || !canHover()) return;
    pointerInside.current = false;
    deferClose();
  };
  const showNavigation = () => {
    if (!entryVisible.current || !entryInView()) return;
    window.clearTimeout(closeTimer.current);
    setOpenPath(path);
  };
  const deferClose = () => {
    window.clearTimeout(closeTimer.current);
    if (!entryVisible.current) return;
    closeTimer.current = window.setTimeout(() => {
      if (!pointerInside.current && !panel.current?.contains(document.activeElement) && !accountMenu.current?.open) setOpenPath(null);
    }, 220);
  };
  const [kind, setKind] = useState<"admin" | "member" | null>(null);
  const [profile, setProfile] = useState<{ username: string; name: string; avatar: string } | null>(null);
  const [failedAvatar, setFailedAvatar] = useState("");
  const accountName = profile?.username || profile?.name || "我的小窝";
  const accountMenu = useRef<HTMLDetailsElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    const node = trigger.current;
    if (!node) return;
    const checkPosition = () => {
      const rect = node.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (entryVisible.current !== inView) {
        entryVisible.current = inView;
        setVisible(inView);
      }
      if (inView) return;
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(focusTimer.current);
      focusTimer.current = undefined;
      focusFirstLink.current = false;
      pointerInside.current = false;
      setOpenPath(null);
      accountMenu.current?.removeAttribute("open");
      // Blur only: restoring focus to the off-screen entry would scroll back up.
      if ((document.activeElement === node || panel.current?.contains(document.activeElement)) && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    };
    // Read the current rectangle rather than stale observer entries after a fast scroll.
    const observer = new IntersectionObserver(checkPosition);
    observer.observe(node);
    const frame = window.requestAnimationFrame(checkPosition);
    window.addEventListener("scroll", checkPosition, { passive: true });
    window.addEventListener("resize", checkPosition);
    window.addEventListener("pageshow", checkPosition);
    document.addEventListener("visibilitychange", checkPosition);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(focusTimer.current);
      window.removeEventListener("scroll", checkPosition);
      window.removeEventListener("resize", checkPosition);
      window.removeEventListener("pageshow", checkPosition);
      document.removeEventListener("visibilitychange", checkPosition);
    };
  }, [path]);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (accountMenu.current && !accountMenu.current.contains(event.target)) accountMenu.current.removeAttribute("open");
      if (!trigger.current?.contains(event.target) && !panel.current?.contains(event.target)) {
        pointerInside.current = false;
        window.clearTimeout(closeTimer.current);
        setOpenPath(null);
      }
    };
    const hide = () => {
      if (document.hidden) {
        pointerInside.current = false;
        setOpenPath(null);
        if (accountMenu.current) accountMenu.current.removeAttribute("open");
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.clearTimeout(closeTimer.current);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEffect(() => {
    if (accountMenu.current) accountMenu.current.removeAttribute("open");
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/writing-session?profile=1", { cache: "no-store", signal: controller.signal });
        const session = await response.json();
        setKind(response.ok && session.authenticated && (session.kind === "admin" || session.kind === "member") ? session.kind : null);
        setProfile(response.ok && session.authenticated ? session.profile ?? null : null);
      } catch { if (!controller.signal.aborted) { setKind(null); setProfile(null); } }
    };
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("murui-profile-updated", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); window.removeEventListener("murui-profile-updated", refresh); document.removeEventListener("visibilitychange", visible); };
  }, [path]);
  const logout = async () => {
    if ((path === "/write" || path === "/my-notes") && !window.confirm("退出前请确认已保存随笔。现在退出登录吗？")) return;
    setLoggingOut(true); setLogoutError("");
    try {
      const response = await fetch(`/api/${kind === "admin" ? "users" : "members"}/logout`, { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("退出未成功，请重试。");
      // Reload after logout to discard private state in the shared layout.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch { setLogoutError("退出未成功，请检查网络后重试。"); setLoggingOut(false); }
  };
  return <header ref={root} className="site-header header-autohide" aria-label="网站导航" data-expanded={expanded}
    onFocusCapture={event => { if (panel.current?.contains(event.target as Node)) showNavigation(); }}
    onBlurCapture={deferClose}
    onKeyDown={event => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        focusFirstLink.current = false;
        window.clearTimeout(focusTimer.current);
        setOpenPath(null);
        if (accountMenu.current) accountMenu.current.removeAttribute("open");
        if (entryVisible.current && entryInView()) trigger.current?.focus({ preventScroll: true });
      }
    }}>
    <button ref={trigger} type="button" className="header-reveal" aria-label={expanded ? "收起导航" : "展开导航"}
      aria-expanded={expanded} aria-controls="site-navigation-panel"
      tabIndex={visible ? 0 : -1}
      onPointerEnter={event => enterNavigation(event.pointerType)}
      onPointerLeave={event => leaveNavigation(event.pointerType)}
      onPointerDown={event => { pointerType.current = event.pointerType; }}
      onClick={event => {
        if (!entryVisible.current || !entryInView()) return;
        window.clearTimeout(closeTimer.current);
        // Keyboard and touch toggle; a mouse click keeps the hover-open menu open.
        if (event.detail === 0 || pointerType.current === "touch" || !canHover()) setOpenPath(expanded ? null : path);
        else showNavigation();
      }}
      onKeyDown={event => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (!entryVisible.current || !entryInView()) return;
          focusFirstLink.current = !expanded;
          showNavigation();
          if (expanded) panel.current?.querySelector<HTMLAnchorElement>("nav a")?.focus({ preventScroll: true });
        }
      }}>
      <span className="header-tab" aria-hidden="true"><span className="header-tab-handle" /></span>
    </button>
    <KokomiWhisper key={path} autoOpen={path === "/"} onOpen={() => { window.clearTimeout(closeTimer.current); setOpenPath(null); if (accountMenu.current) accountMenu.current.removeAttribute("open"); }} />
    <div ref={panel} className="header-panel" id="site-navigation-panel" inert={!expanded}
      onPointerEnter={event => enterNavigation(event.pointerType)}
      onPointerLeave={event => leaveNavigation(event.pointerType)}>
    <div className="header-inner wrap">

    <nav aria-label="主导航">{[{href:"/", label:"首页"}, {href:"/notes", label:"沐瑞の生活随笔"}, {href:"/gallery", label:"照片墙"}, {href:"/megumin", label:"惠惠"}, {href:"/#home-teyvat-map", label:"提瓦特"}, {href:"/archive", label:"归档"}, {href:"/about", label:"关于"}, {href:kind === "admin" ? "/write?view=posts" : "/my-notes", label:kind === "member" ? "时间切片" : "我的随笔"}].map(n => <Link key={n.href} href={n.href} className={path === n.href.split("?")[0] ? "active" : ""} aria-current={path === n.href.split("?")[0] ? "page" : undefined}>{n.label}</Link>)}</nav>
    <div className="header-account">
      <KeepsakeButton panel="search" className="mk-entry mk-search-entry">⌕ 小窝寻物盒</KeepsakeButton>
      {kind ? <details className="header-account-menu" ref={accountMenu} onKeyDown={event => {
        if (event.key === "Escape" && event.currentTarget.open) { event.preventDefault(); event.currentTarget.removeAttribute("open"); event.currentTarget.querySelector("summary")?.focus(); }
      }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.removeAttribute("open"); }}>
        <summary className="header-login header-user" aria-label={`${accountName}，账号菜单`} title={accountName}>
          <span className="header-user-avatar" aria-hidden="true">{profile?.avatar && failedAvatar !== profile.avatar ? <img src={profile.avatar} alt="" width={30} height={30} onError={() => setFailedAvatar(profile.avatar)} /> : <span>{Array.from(accountName)[0]}</span>}</span>
          <span className="header-user-name">{accountName}</span>
          <svg className="header-sakura" viewBox="0 0 32 32" aria-hidden="true">{[0,72,144,216,288].map(angle => <path key={angle} transform={`rotate(${angle} 16 16)`} d="M16 17C10 14 8 8 12 4L16 6L20 4C24 8 22 14 16 17Z" fill="#f4b6cd" stroke="#e699b6" strokeWidth=".7" />)}<circle cx="16" cy="16" r="3" fill="#fff0b8" /></svg>
          <span className="header-menu-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="header-account-dropdown" role="group" aria-label="账号操作">
          <span className="header-account-caption">{kind === "admin" ? "管理员" : "我的小窝"}</span>
          {kind === "admin" ? <>
            <Link href="/write" onClick={() => { if (accountMenu.current) accountMenu.current.removeAttribute("open"); }}>写随笔</Link>
            <Link href="/write?view=posts" onClick={() => { if (accountMenu.current) accountMenu.current.removeAttribute("open"); }}>我的文章</Link>
            <Link href="/admin" onClick={() => { if (accountMenu.current) accountMenu.current.removeAttribute("open"); }}>后台管理</Link>
            <Link href="/gallery" onClick={() => { if (accountMenu.current) accountMenu.current.removeAttribute("open"); }}>照片管理</Link>
          </> : <>
            <Link href="/account" onClick={() => { if (accountMenu.current) accountMenu.current.removeAttribute("open"); }}>个人资料</Link>
            <Link href="/my-notes?new=1" onClick={() => { if (accountMenu.current) accountMenu.current.removeAttribute("open"); }}>写随笔</Link>
            <Link href="/my-notes" onClick={() => { if (accountMenu.current) accountMenu.current.removeAttribute("open"); }}>时间切片</Link>
          </>}
          <button className="header-logout" type="button" disabled={loggingOut} onClick={logout}>{loggingOut ? "正在退出…" : "退出登录"}</button>
          {logoutError && <p role="alert" className="header-logout-error">{logoutError}</p>}
        </div>
      </details> : <Link href="/login" className="header-login" aria-label="登录或注册">登录</Link>}

    </div>
  </div>
    {children}
    </div>
  </header>;
}
