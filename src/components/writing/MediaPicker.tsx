"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { mediaURL } from "@/lib/media-url";
import { writingRequest, type WritingMedia } from "@/lib/writing";

export default function MediaPicker({ onSelect, onClose, privateMode = false, title = "给文字配一张图" }: { onSelect: (media: WritingMedia) => void; onClose: () => void; privateMode?: boolean; title?: string }) {
  const collection = privateMode ? "private-media" : "media";
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<WritingMedia[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    let cancelled = false;
    writingRequest(`/api/${collection}?limit=12&page=${page}&sort=-createdAt&depth=0`).then(data => {
      if (!cancelled) { setItems(old => page === 1 ? data.docs : [...old, ...data.docs]); setMore(data.hasNextPage); }
    }).catch(error => { if (!cancelled) setError(error.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, collection]);
  return <dialog ref={dialog} className="writer-media-dialog" aria-labelledby="writer-media-title" onCancel={event => { if (uploading) event.preventDefault(); }} onClose={onClose} onClick={event => { if (!uploading && event.target === event.currentTarget) dialog.current?.close(); }}>
    <div className="writer-media-inner"><div className="writer-heading-row"><h2 id="writer-media-title">{title}</h2><button type="button" disabled={uploading} onClick={() => dialog.current?.close()} aria-label="关闭图片选择">✕</button></div>
      <form className="writer-upload" onSubmit={async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const file = form.get("file");
        if (!(file instanceof File) || !file.size) { setError("请先选择图片。"); return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3000000) { setError("请选择 3 MB 以内的 JPG、PNG 或 WebP 图片。"); return; }
        setUploading(true); setError("");
        try {
          const body = new FormData();
          body.set("_payload", JSON.stringify({ alt: String(form.get("alt") || "").trim() || file.name.replace(/\.[^.]+$/, "") }));
          body.set("file", file);
          const result = await writingRequest(`/api/${collection}`, { method: "POST", body });
          onSelect(result.doc);
        } catch (error) { setError(error instanceof Error ? error.message : "上传失败，请重试。"); }
        finally { setUploading(false); }
      }}>
        <label>上传新图片<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required disabled={uploading} /></label>
        <label>图片描述<input name="alt" maxLength={160} placeholder="写一点画面内容，也方便以后查找" disabled={uploading} /></label>
        <p className="writer-hint">支持 JPG、PNG、WebP，每张不超过 3 MB。上传的图片也会保存到图片库。</p>
        <button type="submit" className="writer-primary" disabled={uploading}>{uploading ? "正在上传…" : "上传并使用"}</button>
      </form>
      {error && <p className="writer-error" role="alert">{error}</p>}
      <h3>{privateMode ? "我的私密图片（仅本人和管理员可见）" : "或者，从图片库选择"}</h3>
      <div className="writer-media-grid">{items.map(item => <button key={item.id} type="button" disabled={uploading} onClick={() => onSelect(item)}><img src={mediaURL(item)} alt={item.alt} loading="lazy" /><span>{item.alt || item.filename}</span></button>)}</div>
      {loading && <p role="status">正在加载图片…</p>}
      {!loading && !items.length && <p className="writer-hint">图片库还没有图片，从上方上传第一张吧。</p>}
      {more && <button type="button" disabled={loading || uploading} onClick={() => { setLoading(true); setPage(p => p + 1); }}>加载更多图片</button>}
    </div>
  </dialog>;
}
