import Icon from "./Icon";
import ArtworkImage from "./ArtworkImage";

const activityUrl = "https://fe.xiaohongshu.com/ditto/vincent/f980d8f37f9c4c1f8ac647a56779ce28?fullscreen=true&naviHidden=yes&source=game";
const notes = [
  { title: "雨过天晴", author: "Rafa", likes: "55,242", profile: "https://www.xiaohongshu.com/user/profile/623e91b8000000000201a0f9", src: "/images/artworks/xhs-66f4dc55000000002a030c3e.webp", width: 540, height: 813 },
  { title: "有些舍不得呢…", author: "珊瑚宫心海", likes: "10,331", profile: "https://www.xiaohongshu.com/user/profile/6201e5da000000001000b56f", src: "/images/artworks/xhs-657fc3f60000000034037559.webp", width: 540, height: 300 },
];

export default function XiaohongshuCollection() {
  return <section className="ah-xhs-collection" id="xiaohongshu-collection" aria-labelledby="ah-xhs-title">
    <div className="ah-platform-heading"><h3 id="ah-xhs-title">小红书 · 高赞图文</h3><span>心海主题的小小收藏</span></div>
    <div className="ah-xhs-list">{notes.map(note => <article className="ah-xhs-card" key={note.title}>
      <div className="ah-xhs-card-top"><span>小红书 · 图文</span><span><span aria-hidden="true">♡ </span>收录时 {note.likes} 赞</span></div>
      <h4>{note.title}</h4><p className="ah-xhs-author">{note.author}</p>
      <ArtworkImage src={note.src} width={note.width} height={note.height} title={note.title} author={note.author} platform="小红书" sourceUrl={activityUrl} />
      <div className="ah-xhs-links"><a href={note.profile} target="_blank" rel="noopener noreferrer" aria-label={`在新标签页打开 ${note.author} 的小红书主页`}>作者主页 <Icon name="upRight" size={15}/></a><a href={activityUrl} target="_blank" rel="noopener noreferrer" aria-label={`在新标签页查看《${note.title}》的小红书活动来源`}>活动出处 <Icon name="upRight" size={15}/></a></div>
    </article>)}</div>
    <p className="ah-xhs-source">赞数为小红书心海活动收录时的历史快照，不是当前实时点赞数。<a href={activityUrl} target="_blank" rel="noopener noreferrer">查看收录来源 <Icon name="upRight" size={12}/></a></p>
  </section>;
}
