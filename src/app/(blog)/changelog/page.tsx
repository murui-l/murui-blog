import Link from "next/link";
import type { Metadata } from "next";
import { siteChanges } from "@/lib/changelog";
import Icon from "@/components/Icon";
import "./changelog.css";

export const metadata: Metadata = {
  title: "小窝成长记 · 网站更改日志",
  description: "记录沐瑞的小窝在什么时候增加了什么内容，每一次小小的成长都留在这里。",
  alternates: { canonical: "/changelog" },
};

export default function ChangelogPage() {
  return <main id="main" className="changelog-page wrap">
    <Link href="/" className="changelog-back"><span aria-hidden="true">←</span> 回到小窝</Link>
    <header className="changelog-hero">
      <div><p className="changelog-eyebrow"><span aria-hidden="true">✿</span> LITTLE CHANGES, LOVELY DAYS</p><h1>小窝成长记<span aria-hidden="true">.</span></h1><p className="changelog-intro">给小窝添一点新意，也给每一次变化留下日期。</p></div>
      <div className="changelog-stamp"><Icon name="leaf" size={30} /><span>网站更改日志</span><strong>{siteChanges[0].date.replaceAll("-", ".")}</strong><span>最近一次更新</span></div>
    </header>
    <div className="changelog-timeline" aria-label="按日期排列的网站更新">
      {siteChanges.map((change, index) => <article className="changelog-entry" key={change.date} aria-labelledby={`change-${change.date}`}>
        <div className="changelog-date"><time dateTime={change.date}>{change.date.replaceAll("-", ".")}</time>{index === 0 && <span>最新的一页</span>}</div>
        <span className="changelog-dot" aria-hidden="true">{index === 0 ? "✿" : ""}</span>
        <div className="changelog-card"><span className={`changelog-badge${change.kind === "更新" ? " changelog-badge-update" : ""}`}>{change.kind}</span><h2 id={`change-${change.date}`}>{change.title}</h2><ul>{change.items.map(item => <li key={item}>{item}</li>)}</ul>{change.link && <Link href={change.link.href} className="changelog-link">{change.link.label}<Icon name="arrow" size={16} /></Link>}</div>
      </article>)}
    </div>
    <p className="changelog-ending"><span aria-hidden="true">✧</span> 小窝还在慢慢长大，谢谢你来看看。</p>
  </main>;
}
