"use client";

import { useEffect, useState } from "react";
import type { ArticleHeading } from "@/lib/article-headings";

export default function ArticleTOC({ headings }: { headings: ArticleHeading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length < 3) return;
    const elements = headings.map(heading => document.getElementById(heading.id)).filter((element): element is HTMLElement => !!element);
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = elements[0]?.id ?? "";
      for (const element of elements) {
        if (element.getBoundingClientRect().top > 160) break;
        current = element.id;
      }
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
    };
  }, [headings]);

  if (headings.length < 3) return null;
  const links = <ol>{headings.map(heading => <li key={heading.id} data-level={heading.level}>
    <a href={`#${encodeURIComponent(heading.id)}`} aria-current={active === heading.id ? "location" : undefined}>{heading.text}</a>
  </li>)}</ol>;

  return <aside className="aj-toc">
    <nav className="aj-toc-desktop" aria-label="文章目录"><span className="aj-toc-label">这一页的书签</span>{links}<span className="aj-toc-flower" aria-hidden="true">✿</span></nav>
    <details className="aj-toc-mobile"><summary>这一页的书签 <span aria-hidden="true">⌄</span></summary><nav aria-label="文章目录">{links}</nav></details>
  </aside>;
}
