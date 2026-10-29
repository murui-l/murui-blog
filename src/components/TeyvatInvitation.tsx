import TeyvatMap from "./TeyvatMap";
import WorldFigure from "./WorldFigure";
import "./HomeWorld.css";

export default function TeyvatInvitation() {
  return <div className="home-world">
    <WorldFigure kind="kokomi" />
    <TeyvatMap embedded />
    <WorldFigure kind="hutao" />
  </div>;
}
