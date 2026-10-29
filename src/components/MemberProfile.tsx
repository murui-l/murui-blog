"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { mediaURL } from "@/lib/media-url";
import { writingRequest, type WritingMedia } from "@/lib/writing";
import MediaPicker from "./writing/MediaPicker";
import "./writing/Writing.css";
import "./MemberProfile.css";
type Profile = { id: number; username: string; name: string; bio: string; avatar: WritingMedia | null };
export default function MemberProfile({ initial }: { initial: Profile }) {
  const [name, setName] = useState(initial.name), [bio, setBio] = useState(initial.bio);
  const [avatar, setAvatar] = useState(initial.avatar), [picker, setPicker] = useState(false);
  const [saved, setSaved] = useState(initial), [saving, setSaving] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const dirty = name !== saved.name || bio !== saved.bio || avatar?.id !== saved.avatar?.id;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return <>
    <div className="profile-page-heading"><div><span className="profile-eyebrow">A LITTLE MORE ABOUT ME</span><h1>把小窝，变成你的模样</h1><p>换一张喜欢的头像，留下一点关于自己的故事。</p></div><Link href="/my-notes">时间切片 →</Link></div>
    <div className="profile-layout">
      <aside className="profile-preview"><div className="profile-cover"><span aria-hidden="true">✧</span><span>MY LITTLE SPACE</span></div>
        <div className="profile-preview-body"><div className="profile-avatar">{avatar ? <img src={mediaURL(avatar)} alt="我的头像预览" /> : <span>{(name.trim() || "我").slice(0,1)}</span>}</div>
          <span className="profile-badge">小窝住客</span><h2>{name.trim() || "你的昵称"}</h2><p className="profile-handle">@{initial.username}</p><p className="profile-bio">{bio.trim() || "还没有写下简介，先把喜欢的日子收藏起来。"}</p>
          <div className="profile-preview-footer">一页随笔，一点喜欢，一份属于自己的日常。</div></div>
      </aside>
      <form className="profile-form" onSubmit={async event => {
        event.preventDefault(); setSaving(true); setError(""); setMessage("");
        try {
          if (!name.trim()) throw new Error("请填写昵称。");
          await writingRequest(`/api/members/${initial.id}`, { method: "PATCH", body: JSON.stringify({ name: name.trim(), bio: bio.trim(), avatar: avatar?.id ?? null }) });
          setName(name.trim()); setBio(bio.trim()); setSaved({ ...initial, name: name.trim(), bio: bio.trim(), avatar }); setMessage("资料已保存，新的小窝名片准备好啦。");
          window.dispatchEvent(new Event("murui-profile-updated"));
        } catch (e) { setError(e instanceof Error ? e.message : "保存失败，请稍后重试。"); }
        finally { setSaving(false); }
      }}>
        <div className="profile-form-heading"><h2>个人资料</h2><span>{dirty ? "有未保存的修改" : "已经好好收起来了"}</span></div>
        <fieldset disabled={saving}>
          <div className="profile-avatar-setting"><div><h3>你的头像</h3><p>选一张最能代表此刻心情的图片。</p></div><div><button type="button" className="profile-outline" onClick={() => setPicker(true)}>更换头像</button>{avatar && <button type="button" className="profile-remove" onClick={() => setAvatar(null)}>移除</button>}</div></div>
          <label>昵称<input value={name} onChange={e => setName(e.target.value)} required maxLength={40} autoComplete="nickname" placeholder="希望大家怎么称呼你" /><small>{name.length} / 40</small></label>
          <label>个人简介<textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={300} rows={5} placeholder="喜欢的事、最近的心情，或者一句想留下的话…" /><small>{bio.length} / 300</small></label>
          <label>登录账号<input value={initial.username} readOnly className="profile-readonly" /><small>这是你的登录账号，昵称可以在上面修改。</small></label>
        </fieldset>
        <div className="profile-save-row"><p>资料与头像仅你和网站管理员可见。</p><button type="submit" disabled={saving || !dirty} className="profile-save">{saving ? "正在保存…" : "保存资料"}</button></div>
        {message && !dirty && <p className="profile-success" role="status">{message}</p>}{error && <p className="writer-error" role="alert">{error}</p>}
      </form>
    </div>
    {picker && <MediaPicker privateMode title="挑一张喜欢的头像" onClose={() => setPicker(false)} onSelect={media => { setAvatar(media); setPicker(false); }} />}
  </>;
}
