"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { lexicalText, slugFromTitle } from "@/lib/domain";
import { mediaURL } from "@/lib/media-url";
import { unpopulateMedia, writingRequest, type WritingPost, type WritingMedia } from "@/lib/writing";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import MediaPicker from "./MediaPicker";
import WriterLogin from "./WriterLogin";
import MemberLogin from "./MemberLogin";

const WritingEditor = dynamic(() => import("./WritingEditor"), { ssr: false, loading: () => <p className="writer-hint">正在准备稿纸…</p> });

function MyPosts({ privateMode }: { privateMode: boolean }) {
  const collection = privateMode ? "private-notes" : "posts";
  const root = privateMode ? "/my-notes" : "/write";
  const [posts, setPosts] = useState<WritingPost[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    writingRequest(`/api/${collection}?${privateMode ? "" : "draft=true&"}depth=0&limit=12&page=${page}&sort=-updatedAt&select[title]=true&select[category]=true&select[updatedAt]=true${privateMode ? "" : "&select[_status]=true"}`).then(data => {
      if (!cancelled) { setPosts(data.docs); setPages(data.totalPages); }
    }).catch(error => { if (!cancelled) setError(error.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, collection, privateMode]);
  return <section className="writer-posts"><div className="writer-heading-row"><div><span className="eyebrow">MY LITTLE STORIES</span><h1>{privateMode ? "时间切片" : "我的文章"}</h1></div><a className="writer-primary" href={privateMode ? "/my-notes?new=1" : "/write"}>＋ 写一篇随笔</a></div>
    <p className="writer-hint">{privateMode ? "写过的日子都留在这里，换一台设备登录也能继续写。" : "从这里继续写草稿，或者修改已经发布的文章。"}</p>
    {error && <p role="alert" className="writer-error">{error}</p>}
    {loading ? <p role="status">正在取回你的文章…</p> : posts.length ? <div className="writer-post-list">{posts.map(post => <a href={`${root}?id=${post.id}`} key={post.id}><span><small>{post.category} · {privateMode ? "私密随笔" : post._status === "published" ? "已发布" : "草稿 / 待发布修改"}</small><strong>{post.title || "未命名草稿"}</strong></span><span>继续编辑 →</span></a>)}</div> : <p>还没有文章，写下今天的第一句吧。</p>}
    {pages > 1 && <div className="writer-pagination"><button disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage(p => p - 1); }}>上一页</button><span>{page} / {pages}</span><button disabled={loading || page >= pages} onClick={() => { setLoading(true); setPage(p => p + 1); }}>下一页</button></div>}
  </section>;
}

export default function WritingWorkspace({ initialPost, category: defaultCategory, showPosts, privateMode = false }: { initialPost?: WritingPost; category: string; showPosts: boolean; privateMode?: boolean }) {
  const collection = privateMode ? "private-notes" : "posts";
  const root = privateMode ? "/my-notes" : "/write";
  const Login = privateMode ? MemberLogin : WriterLogin;
  const [id, setID] = useState(initialPost?.id);
  const [title, setTitle] = useState(initialPost?.title || "");
  const [category, setCategory] = useState(initialPost?.category || defaultCategory);
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || "");
  const [tags, setTags] = useState(initialPost?.tags?.join("，") || "");
  const [cover, setCover] = useState<WritingMedia | null>(typeof initialPost?.cover === "object" ? initialPost.cover : null);
  const [content, setContent] = useState<SerializedEditorState | undefined>(initialPost?.content);
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [updatedAt, setUpdatedAt] = useState(initialPost?.updatedAt || "");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const [login, setLogin] = useState(false);
  const [error, setError] = useState("");
  const [editorFailed, setEditorFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [lastAction, setLastAction] = useState<"draft" | "published" | null>(null);
  const contentJSON = useRef(JSON.stringify(initialPost?.content));
  const saveLock = useRef(false);
  const activeDirty = useRef(false);
  useEffect(() => { activeDirty.current = dirty; }, [dirty]);
  const contentChanged = useCallback((value: SerializedEditorState) => {
    const serialized = JSON.stringify(value);
    if (contentJSON.current !== serialized) { contentJSON.current = serialized; setContent(value); setDirty(true); }
  }, []);
  const editorError = useCallback(() => {
    queueMicrotask(() => { setEditorFailed(true); setError("正文有暂不支持的内容，已停止保存以保护原文，请联系网站管理员。"); });
  }, []);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (activeDirty.current) { event.preventDefault(); event.returnValue = ""; } };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a");
      if (activeDirty.current && link?.href && link.target !== "_blank" && !event.ctrlKey && !event.metaKey && new URL(link.href).href !== window.location.href && !window.confirm("还有未保存的内容，确定离开吗？")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, []);

  async function save(status: "draft" | "published") {
    if (saveLock.current || editorFailed) return;
    if (!title.trim() || !category.trim() || !content || (!lexicalText(content) && !JSON.stringify(content).includes('"type":"upload"'))) { setError("请填写标题、分类和正文，再保存。"); return; }
    saveLock.current = true; setBusy(true); setError(""); setMessage("");
    try {
      if (id) {
        const latest = await writingRequest(`/api/${collection}/${id}?${privateMode ? "" : "draft=true&"}depth=0`);
        if (latest.updatedAt !== updatedAt) throw new Error("这篇文章已在其他页面更新。请先复制本页未保存的文字，再重新打开文章，避免覆盖较新的内容。");
      }
      const nextSlug = slug || `${slugFromTitle(title.trim())}-${crypto.randomUUID().slice(0, 8)}`;
      const result = await writingRequest(`/api/${collection}${id ? `/${id}` : ""}${!privateMode && status === "draft" ? "?draft=true" : ""}`, {
        method: id ? "PATCH" : "POST", body: JSON.stringify({
          title: title.trim(), ...(!privateMode ? { slug: nextSlug, _status: status } : {}), category: category.trim(), excerpt: excerpt.trim(),
          tags: [...new Set(tags.split(/[,，\n]/).map(t => t.trim()).filter(Boolean))],
          cover: cover?.id ?? null, content: unpopulateMedia(content),
        }),
      });
      const doc = result.doc;
      setID(doc.id); setSlug(doc.slug || ""); setUpdatedAt(doc.updatedAt); setDirty(false); activeDirty.current = false;
      setLastAction(status); setMessage(privateMode ? "随笔已保存" : status === "published" ? "已发布，文章已经出现在小窝里。" : "草稿已保存，只有点击发布后，本次内容才会对读者显示。");
      if (!id) window.history.replaceState(null, "", `${root}?id=${doc.id}`);
    } catch (error) { setError(error instanceof Error ? error.message : "保存失败，请重试。"); }
    finally { saveLock.current = false; setBusy(false); }
  }

  if (showPosts) return <MyPosts privateMode={privateMode} />;
  return <>
    <div className="writer-heading-row"><div><span className="eyebrow">A PAGE FOR TODAY</span><h1>{id ? "继续写下这一页" : "把今天，写进小窝"}</h1><p>一段心情，一张照片，都是生活留下的小小回声。</p></div><a href={privateMode ? root : "/write?view=posts"}>{privateMode ? "时间切片" : "我的文章"} →</a></div>
    <div className="writer-actions"><span>{busy ? "正在保存…" : dirty ? "有未保存的修改" : id ? "内容已保存" : "新的一页"}</span><div><button type="button" className={privateMode ? "writer-primary" : ""} disabled={busy || editorFailed} onClick={() => save("draft")}>{privateMode ? "保存随笔" : "保存草稿"}</button>{!privateMode && <button type="button" className="writer-primary" disabled={busy || editorFailed} onClick={() => save("published")}>{busy ? "请稍候…" : "发布文章"}</button>}</div></div>
    <div className="writer-feedback" aria-live="polite">{message && <p className="writer-success">{message} {id && !privateMode && <a href={lastAction === "published" ? `/posts/${encodeURIComponent(slug)}` : `/preview/${id}`} target="_blank" rel="noopener noreferrer">{lastAction === "published" ? "查看文章 ↗" : "预览草稿 ↗"}</a>}</p>}{error && <div className="writer-error" role="alert">{error}{error.includes("登录") && <button type="button" onClick={() => setLogin(true)}>在这里重新登录</button>}{editorFailed && id && !privateMode && <a href={`/admin/collections/posts/${id}`}>打开后台编辑</a>}</div>}</div>
    {login && <Login onSuccess={() => { setLogin(false); setError(""); setMessage("已重新登录，可以继续保存。"); }} />}
    <fieldset className="writer-fields" disabled={busy}>
      <div className="writer-paper"><label className="sr-only" htmlFor="writer-title">文章标题</label><input id="writer-title" className="writer-title" value={title} maxLength={160} placeholder="给今天起个名字…" onChange={e => { setTitle(e.target.value); setDirty(true); }} />
        <WritingEditor privateMode={privateMode} initialContent={initialPost?.content} onChange={contentChanged} onError={editorError} disabled={busy || editorFailed} />
      </div>
      <aside className="writer-details"><section><h2>这一页的封面</h2>{cover ? <><img className="writer-cover" src={mediaURL(cover)} alt={cover.alt} /><div className="writer-cover-actions"><button type="button" onClick={() => setPicker(true)}>更换封面</button><button type="button" onClick={() => { setCover(null); setDirty(true); }}>移除</button></div></> : <button type="button" className="writer-cover-empty" onClick={() => setPicker(true)}><span>＋</span>上传 / 选择封面<small>也可以只写文字</small></button>}</section>
        <section><label>分类<input value={category} list="writer-categories" maxLength={32} onChange={e => { setCategory(e.target.value); setDirty(true); }} /></label><datalist id="writer-categories"><option value="生活随笔" /><option value="文章" /><option value="心海甜文" /></datalist><p className="writer-hint">{privateMode ? "分类仅用于整理自己的随笔，任何分类都不会公开。" : "分类为“生活随笔”的文章，发布后会进入生活随笔板块。"}</p>
          <label>标签<input value={tags} placeholder="日常，旅行，小确幸" onChange={e => { setTags(e.target.value); setDirty(true); }} /></label><p className="writer-hint">用逗号分隔，每个标签最多 30 字。</p>
          <label>摘要<textarea value={excerpt} rows={4} maxLength={300} placeholder="留空会从正文自动提取" onChange={e => { setExcerpt(e.target.value); setDirty(true); }} /></label>
        </section>
      </aside>
    </fieldset>
    {picker && <MediaPicker privateMode={privateMode} onClose={() => setPicker(false)} onSelect={media => { setCover(media); setDirty(true); setPicker(false); }} />}
  </>;
}
