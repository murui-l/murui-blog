import TeyvatMap from "./TeyvatMap";
import Image from "next/image";
import "./HomeWorld.css";

export default function TeyvatInvitation() {
  return <div className="home-world">
    <div className="home-world__figure home-world__figure--kokomi" aria-hidden="true">
      <Image src="/images/artworks/kokomi-map-cutout.webp" alt="" width={959} height={1256} sizes="(min-width: 1120px) 32vw, 48vw" />
    </div>
    <TeyvatMap embedded />
    <div className="home-world__figure home-world__figure--hutao" aria-hidden="true">
      <Image src="/images/artworks/hutao-map-cutout.webp" alt="" width={1012} height={1541} sizes="(min-width: 1120px) 27vw, 48vw" />
    </div>
  </div>;
}
