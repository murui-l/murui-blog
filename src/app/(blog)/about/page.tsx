/* eslint-disable @next/next/no-img-element */
import { getSettings } from "@/lib/db";
import Markdown from "@/components/Markdown";
import Icon from "@/components/Icon";
import Cottage from "@/components/Cottage";
export const metadata = { title: "关于这个小窝" };
export default async function About() {
  const s = await getSettings();
  return <main id="main" className="wrap narrow interior"><div className="page-heading"><span className="eyebrow">NICE TO MEET YOU</span><h1>关于这个小窝</h1><p>很高兴，在互联网的某个角落遇见你。</p></div><div className="about-intro"><div className="about-avatar">{s.avatar?<img src={s.avatar} alt={s.author}/>:<Cottage small/>}</div><div><span className="eyebrow">HELLO, I&apos;M</span><h2>{s.author}</h2><p>{s.description}</p></div></div><div className="about-body"><Markdown>{s.about}</Markdown></div>{(s.email||s.github)&&<section className="contact-box"><h3>保持联系</h3>{s.email&&<a href={`mailto:${s.email}`}><Icon name="mail" size={18}/>{s.email}</a>}{s.github&&<a href={s.github} target="_blank" rel="noopener noreferrer">我的另一处小天地 <Icon name="upRight" size={17}/></a>}</section>}</main>;
}
