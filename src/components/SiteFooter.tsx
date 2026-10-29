"use client";

import Link from "./HomeMapLink";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { GallerySnapshot } from "@/lib/gallery-types";
import HomeFooter from "./HomeFooter";
import Icon from "./Icon";
import RssSubscribe from "./RssSubscribe";

export default function SiteFooter({ name, author, year, gallery }: { name: string; author: string; year: number; gallery: GallerySnapshot }) {
  const pathname = usePathname();
  const [clientPathname, setClientPathname] = useState<string | null>(null);
  useEffect(() => {
    // ISR may render without a browser pathname. Keep hydration's first frame
    // identical to that stable server fallback, then select the current footer.
    const frame = requestAnimationFrame(() => setClientPathname(pathname));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  if (clientPathname === "/") return <HomeFooter gallery={gallery} year={year} />;
  return <footer className="site-footer wrap"><div><span className="footer-name"><Icon name="leaf" size={18}/>{name}</span><p>认真生活，慢慢记录。</p></div><div className="footer-links"><Link href="/gallery">照片墙</Link><Link href="/#home-teyvat-map">提瓦特</Link><Link href="/archive">所有文章</Link><Link href="/changelog">更改日志</Link><RssSubscribe /><Link href="/write">写作入口</Link><Link href="/admin">小窝管理</Link></div><span className="copyright">© {year} {author}</span></footer>;
}
