import Link from "next/link";
import { getSettings } from "@/lib/db";
import { getGallerySnapshot } from "@/lib/gallery-store";
import HomepageMusic from "@/components/HomepageMusic";
import MusicLyrics from "@/components/MusicLyrics";
import HomeSlideshow from "@/components/HomeSlideshow";
import HomeDestinations from "@/components/HomeDestinations";
import HomeHero from "@/components/HomeHero";
import HomeLife from "@/components/HomeLife";
import TeyvatInvitation from "@/components/TeyvatInvitation";

import { KeepsakeButton } from "@/components/KeepsakeProvider";
import { siteChanges } from "@/lib/changelog";
import "./home-bento.css";
import "./home-scrapbook.css";
import "./home-layout.css";

export default async function Home() {
  const [settings, gallery] = await Promise.all([getSettings(), getGallerySnapshot()]);
  return <main id="main" className="home-scrapbook home-composed">
    <HomeHero avatar={settings.avatar} description={settings.description} notice={siteChanges[0]} />
    <HomeLife>
    <section className="ms-collection ms-wrap" aria-labelledby="home-collection-title">
      <div className="ms-section-heading"><div><span className="ms-kicker">A LITTLE COLLECTION</span><h2 id="home-collection-title">把喜欢的，留在这里<span aria-hidden="true"> ✧</span></h2></div></div>
      <div className="ms-media-grid">
        <div className="ms-photo">
          <HomeSlideshow initialImages={gallery.images} />
          <div className="ms-photo-meta">
            <Link href="/gallery">{gallery.categories.length} 个相册 · {gallery.images.length} 张照片 <span aria-hidden="true">↗</span></Link>
            <KeepsakeButton panel="book">翻页回忆册 <span aria-hidden="true">↗</span></KeepsakeButton>
          </div>
        </div>
        <div className="ms-radio"><span className="ms-paper-label">MURUI RADIO / 小窝电台</span><HomepageMusic /></div>
        <div className="ms-lyrics"><MusicLyrics variant="transparent" /></div>
      </div>
    </section>
    <TeyvatInvitation />
    <section className="ms-links ms-wrap" aria-labelledby="home-links-title"><div className="ms-section-heading"><div><span className="ms-kicker">TURN THE PAGE</span><h2 id="home-links-title">随意逛逛<span aria-hidden="true"> ✿</span></h2></div><span className="ms-margin-note">下一页，也许有喜欢的风景。</span></div><HomeDestinations initialGallery={gallery} /></section>
    <p className="ms-endnote">谢谢你，翻到这一页。<span aria-hidden="true"> ♡</span></p>
    </HomeLife>
  </main>;
}
