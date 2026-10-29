/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { meguminIntroduction } from "@/lib/megumin";
import "./MeguminRoom.css";

export default function MeguminTeaser() {
  return <section id="megumin" className="mg-teaser" aria-labelledby="mg-teaser-title">
    <div className="mg-teaser-copy"><p className="mg-kicker"><span aria-hidden="true">✦</span> A LITTLE CRIMSON MAGIC</p><span className="mg-teaser-tag">小窝的新邻居 · 惠惠</span><h2 id="mg-teaser-title">惠惠<span>の</span>爆裂魔法小屋<span aria-hidden="true">.</span></h2><p>{meguminIntroduction}</p><div className="mg-teaser-chips"><span>每日一句</span><span>施法咏唱</span><span>可爱收藏</span></div><Link className="mg-button" href="/megumin">去惠惠的小屋坐坐 <span aria-hidden="true">↗</span></Link></div>
    <div className="mg-teaser-art" aria-hidden="true"><div className="mg-teaser-orbit">✧</div><span className="mg-teaser-shout">Explosion!</span><img src="/images/megumin/character.webp" alt="" width={300} height={440} loading="lazy" decoding="async"/><span className="mg-teaser-spark">✦</span></div>
  </section>;
}
