"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import "./Writing.css";

export default function AdminTools() {
  const path = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [kind, setKind] = useState<"admin" | "member" | null>(null);
  const [postID, setPostID] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/writing-session", { cache: "no-store", signal: controller.signal });
        const session = await response.json();
        setLoggedIn(response.ok && session.authenticated === true);
        setKind(session.kind ?? null);
        setPostID(null);
        if (session.kind === "admin" && path.startsWith("/posts/")) {
          const slug = decodeURIComponent(path.slice(7));
          const posts = await fetch(`/api/posts?limit=1&depth=0&where[slug][equals]=${encodeURIComponent(slug)}`, { cache: "no-store", signal: controller.signal }).then(r => r.json());
          setPostID(posts.docs?.[0]?.id ?? null);
        }
      } catch { if (!controller.signal.aborted) { setLoggedIn(false); setPostID(null); } }
    }
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); };
  }, [path]);
  if (!loggedIn) return null;
  const logout = async () => {
    if ((path === "/write" || path === "/my-notes") && !window.confirm("退出前请确认已保存随笔。现在退出登录吗？")) return;
    const response = await fetch(`/api/${kind === "admin" ? "users" : "members"}/logout`, { method: "POST", credentials: "same-origin" });
    if (response.ok) window.location.assign("/");
  };
  return <aside className="writing-admin-bar" aria-label="前台写作工具"><div className="wrap">
    <span>{kind === "admin" ? "✎ 管理员写作" : "✧ 时间切片"}</span><nav aria-label="写作操作">
      {kind === "admin" ? <>
      <Link href="/write">写随笔</Link><Link href="/write?category=文章">写文章</Link>
      {postID && <Link href={`/write?id=${postID}`}>编辑这篇文章</Link>}
      <Link href="/write?view=posts">我的文章</Link>
      <Link href="/member-notes">用户随笔</Link></> : <><Link href="/my-notes?new=1">写随笔</Link><Link href="/my-notes">时间切片</Link></>}
      <button type="button" onClick={logout}>退出登录</button>
    </nav>
  </div></aside>;
}
