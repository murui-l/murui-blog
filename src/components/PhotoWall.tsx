"use client";

/* Uploaded and local images keep their original composition. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import type { GalleryImage, GallerySnapshot } from "@/lib/gallery-types";
import Icon from "./Icon";
import CharacterBookmarks from "./CharacterBookmarks";
import SoftImage from "./SoftImage";
import CameraViewfinder from "./CameraViewfinder";
import "./PhotoWall.css";

type DeletedImage = GalleryImage & { deletedAt?: string };
type GalleryState = GallerySnapshot & { trash?: DeletedImage[] };
type UploadSelection = { key: number; file: File; mediaId?: number };
type ModalKind = "category" | "upload" | "delete" | null;

class GalleryRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function galleryRequest(path: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(path, {
    ...options, cache: "no-store", credentials: "same-origin",
    headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.errors?.map((item: { message: string }) => item.message).join("；")
      || (response.status === 401 || response.status === 403 ? "登录已失效，请重新登录后再操作。" : "操作未完成，请检查网络后重试。");
    throw new GalleryRequestError(message, response.status);
  }
  if (!data) throw new Error("没有收到照片墙数据，请稍后重试。");
  return data;
}

export default function PhotoWall({ initialData, initialCategoryId = null, initialImageId = null }: { initialData: GallerySnapshot; initialCategoryId?: string | null; initialImageId?: string | null }) {
  const [data, setData] = useState<GalleryState>(initialData);
  const [selectedId, setSelectedId] = useState<string | null>(initialCategoryId);
  const [isAdmin, setIsAdmin] = useState(false);
  const [managing, setManaging] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalError, setModalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryImage | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [uploadCategory, setUploadCategory] = useState(initialCategoryId || initialData.categories[0]?.id || "");
  const [uploads, setUploads] = useState<UploadSelection[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const managerDialog = useRef<HTMLDialogElement>(null);
  const lightboxDialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const managerFocus = useRef<HTMLElement | null>(null);
  const galleryBack = useRef<HTMLButtonElement>(null);
  const imageTriggers = useRef(new Map<string, HTMLButtonElement>());
  const appliedQuery = useRef<string | null>(null);
  const uploadKey = useRef(0);
  const titleId = useId();
  const uploadSelectId = useId();
  const categoryInputId = useId();
  const selectedCategory = data.categories.find(category => category.id === selectedId);
  const visibleImages = data.images.filter(image => !selectedCategory || image.categoryId === selectedCategory.id);
  const lightboxIndex = visibleImages.findIndex(image => image.id === lightboxId);
  const lightboxImage = visibleImages[lightboxIndex];

  useEffect(() => {
    const queryKey = JSON.stringify([initialCategoryId, initialImageId]);
    if (appliedQuery.current === queryKey) return;
    // Commit the selected album before opening its native dialog and choosing
    // the matching image button as the reliable return-focus target.
    const frame = requestAnimationFrame(() => {
      appliedQuery.current = queryKey;
      const category = initialData.categories.find(item => item.id === initialCategoryId);
      const requested = category && initialData.images.find(image => image.id === initialImageId && image.categoryId === category.id);
      flushSync(() => {
        setData(initialData); setSelectedId(category?.id || null); setShowTrash(false);
        setLightboxId(requested?.id || null);
      });
      if (requested) {
        previousFocus.current = imageTriggers.current.get(requested.id) || galleryBack.current;
        if (!lightboxDialog.current?.open) lightboxDialog.current?.showModal();
      } else if (lightboxDialog.current?.open) lightboxDialog.current.close();
    });
    return () => cancelAnimationFrame(frame);
  }, [initialData, initialCategoryId, initialImageId]);

  useEffect(() => {
    const controller = new AbortController();
    async function refreshSession() {
      try {
        const response = await fetch("/api/writing-session?profile=1", { cache: "no-store", signal: controller.signal });
        const session = await response.json();
        const admin = response.ok && session.authenticated && session.kind === "admin";
        if (controller.signal.aborted) return;
        setIsAdmin(Boolean(admin));
        if (!admin) { setManaging(false); setShowTrash(false); }
        const snapshot = await galleryRequest(`/api/gallery${admin ? "?trash=1" : ""}`, { signal: controller.signal }) as GalleryState;
        if (!controller.signal.aborted) setData(snapshot);
      } catch {
        // The server-rendered collection remains available when a refresh is offline.
      }
    }
    void refreshSession();
    const visible = () => { if (document.visibilityState === "visible") void refreshSession(); };
    window.addEventListener("focus", refreshSession);
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); window.removeEventListener("focus", refreshSession); document.removeEventListener("visibilitychange", visible); };
  }, []);

  async function refresh() {
    setRefreshing(true); setError("");
    try { setData(await galleryRequest(`/api/gallery${isAdmin ? "?trash=1" : ""}`) as GalleryState); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "照片墙更新失败，请稍后重试。"); }
    finally { setRefreshing(false); }
  }

  async function mutation(action: Record<string, unknown>) {
    try {
      const next = await galleryRequest("/api/gallery", { method: "POST", body: JSON.stringify({ ...action, revision: data.revision }) }) as GalleryState;
      setData(next);
      return next;
    } catch (reason) {
      if (reason instanceof GalleryRequestError && reason.status === 409) {
        try { setData(await galleryRequest("/api/gallery?trash=1") as GalleryState); } catch { /* Keep the prior collection if offline. */ }
        throw new Error("照片墙刚刚有更新，已重新读取。请确认后再操作一次。");
      }
      if (reason instanceof GalleryRequestError && (reason.status === 401 || reason.status === 403)) {
        setIsAdmin(false); setManaging(false); setShowTrash(false);
      }
      throw reason;
    }
  }

  function openManager(kind: Exclude<ModalKind, null>, target?: GalleryImage) {
    managerFocus.current = document.activeElement as HTMLElement | null;
    setModalError(""); setNotice(""); setError("");
    if (kind === "delete") setDeleteTarget(target || null);
    if (kind === "upload" && !uploads.length) setUploadCategory(selectedCategory?.id || data.categories[0]?.id || "");
    flushSync(() => setModal(kind));
    managerDialog.current?.showModal();
  }

  function closeManager() {
    setModal(null); setModalError(""); setDeleteTarget(null);
    const target = managerFocus.current?.isConnected ? managerFocus.current : document.querySelector<HTMLElement>(".pw-management button, .pw-heading button");
    target?.focus({ preventScroll: true });
  }

  function openImage(image: GalleryImage) {
    previousFocus.current = document.activeElement as HTMLElement | null;
    flushSync(() => setLightboxId(image.id));
    lightboxDialog.current?.showModal();
  }

  function moveImage(offset: number) {
    if (visibleImages.length < 2 || lightboxIndex < 0) return;
    setLightboxId(visibleImages[(lightboxIndex + offset + visibleImages.length) % visibleImages.length].id);
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setModalError("");
    const existingIds = new Set(data.categories.map(category => category.id));
    try {
      const next = await mutation({ action: "createCategory", name: categoryName.trim() });
      const created = next.categories.find(category => !existingIds.has(category.id));
      if (created) { setUploadCategory(created.id); setSelectedId(created.id); setShowTrash(false); }
      setCategoryName(""); setNotice("相册已创建。"); managerDialog.current?.close();
    } catch (reason) { setModalError(reason instanceof Error ? reason.message : "相册创建失败，请重试。"); }
    finally { setBusy(false); }
  }

  async function uploadImages(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setModalError("");
    if (!uploadCategory || !uploads.length) { setModalError("请选择相册和图片。"); return; }
    setBusy(true);
    const ready = [...uploads];
    try {
      for (let index = 0; index < ready.length; index++) {
        setUploadProgress(`正在上传 ${index + 1} / ${ready.length}`);
        if (ready[index].mediaId) continue;
        const body = new FormData();
        body.set("file", ready[index].file);
        body.set("_payload", JSON.stringify({ alt: `${data.categories.find(category => category.id === uploadCategory)?.name || "相册"}图片` }));
        const result = await galleryRequest("/api/media", { method: "POST", body }) as { doc?: { id?: number } };
        if (!result.doc?.id) throw new Error("上传未完成，请重试。");
        ready[index] = { ...ready[index], mediaId: result.doc.id };
        setUploads([...ready]);
      }
      setUploadProgress("正在加入相册…");
      await mutation({ action: "addImages", categoryId: uploadCategory, mediaIds: ready.map(item => item.mediaId) });
      setSelectedId(uploadCategory); setShowTrash(false); setUploads([]);
      setNotice(`已添加 ${ready.length} 张图片。`); managerDialog.current?.close();
    } catch (reason) { setModalError(reason instanceof Error ? reason.message : "图片上传失败，请重试。"); }
    finally { setBusy(false); setUploadProgress(""); }
  }

  async function deleteImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!deleteTarget) return;
    setBusy(true); setModalError("");
    try {
      await mutation({ action: "deleteImage", id: deleteTarget.id });
      setNotice("图片已移到回收站。"); managerDialog.current?.close();
    } catch (reason) { setModalError(reason instanceof Error ? reason.message : "图片删除失败，请重试。"); }
    finally { setBusy(false); }
  }

  async function restoreImage(image: DeletedImage) {
    setRestoringId(image.id); setError(""); setNotice("");
    try { await mutation({ action: "restoreImage", id: image.id }); setNotice("图片已恢复到原相册。"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "图片恢复失败，请重试。"); }
    finally { setRestoringId(null); }
  }

  function chooseFiles(files: FileList | null) {
    setModalError("");
    const selected = Array.from(files || []);
    if (selected.length > 20) { setModalError("每次最多添加 20 张图片，请分批上传。"); return; }
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3_000_000 || file.size === 0)) {
      setModalError("请选择 3 MB 以内的 JPG、PNG 或 WebP 图片。"); return;
    }
    setUploads(selected.map(file => ({ key: ++uploadKey.current, file })));
  }

  const displayed = showTrash ? data.trash || [] : visibleImages;
  const albumView = !selectedCategory && !showTrash;

  return <>
    <div className="pw-heading">
      <div className="pw-heading-title">
        {(selectedCategory || showTrash) && <button ref={galleryBack} className="pw-back" type="button" onClick={() => { setSelectedId(null); setShowTrash(false); }} aria-label="返回全部相册"><Icon name="arrow" size={19} /></button>}
        <div><h1>{showTrash ? "回收站" : selectedCategory?.name || "照片墙"}</h1><p>{showTrash ? `${displayed.length} 张图片` : selectedCategory ? `${visibleImages.length} 张图片` : `${data.categories.length} 个相册 · ${data.images.length} 张图片`}</p></div>
      </div>
      <div className="pw-heading-actions">
        {isAdmin && <button type="button" className={`pw-button${managing ? " pw-button-active" : ""}`} aria-pressed={managing} onClick={() => { setManaging(value => !value); setShowTrash(false); }}><Icon name="settings" size={17} />{managing ? "完成管理" : "管理照片"}</button>}
        <button type="button" className="pw-refresh" disabled={refreshing} onClick={() => void refresh()} aria-label={refreshing ? "正在更新照片墙" : "刷新照片墙"}><Icon name="image" size={18} /><span>{refreshing ? "更新中…" : "刷新"}</span></button>
      </div>
    </div>

    {albumView && <CharacterBookmarks />}

    {managing && isAdmin && <div className="pw-management" aria-label="照片管理">
      <button type="button" className="pw-button pw-primary" onClick={() => openManager("upload")} disabled={!data.categories.length}><Icon name="plus" size={17} />添加照片</button>
      <button type="button" className="pw-button" onClick={() => openManager("category")}><Icon name="folder" size={17} />新建相册</button>
      <button type="button" className={`pw-button${showTrash ? " pw-button-active" : ""}`} aria-pressed={showTrash} onClick={() => { setShowTrash(value => !value); }}><Icon name="trash" size={17} />回收站{Boolean(data.trash?.length) && <span className="pw-count">{data.trash?.length}</span>}</button>
    </div>}

    {error && <div className="pw-message pw-error" role="alert">{error}<button type="button" disabled={refreshing} onClick={() => void refresh()}>重新读取</button></div>}
    {notice && <p className="pw-message" role="status"><Icon name="check" size={17} />{notice}</p>}

    {albumView ? <div className="pw-albums">
      {data.categories.map((category, categoryIndex) => {
        const photos = data.images.filter(image => image.categoryId === category.id);
        const covers = photos.slice(0, 3);
        return <button type="button" className="pw-album" key={category.id} onClick={() => { setSelectedId(category.id); setError(""); setNotice(""); }} aria-label={`${category.name}，${photos.length} 张图片`}>
          <span className={`pw-album-stack${covers.length ? "" : " pw-album-stack-empty"}`} aria-hidden="true">
            {[2, 1, 0].map(index => <span className={`pw-album-photo pw-album-photo-${index}`} key={index}>{covers[index] ? <SoftImage src={covers[index].src} width={covers[index].width} height={covers[index].height} alt="" className="pw-album-soft" style={{ height: "100%", aspectRatio: "auto" }} sizes="(max-width: 500px) 42vw, (max-width: 800px) 40vw, 290px" priority={categoryIndex === 0 && index === 0} retry={false} /> : <Icon name="image" size={36} />}</span>)}
          </span>
          <span className="pw-album-name">{category.name}</span><span className="pw-album-count">{photos.length} 张</span>
        </button>;
      })}
      {managing && isAdmin && <button type="button" className="pw-album pw-album-new" onClick={() => openManager("category")}><span className="pw-album-new-frame"><Icon name="plus" size={38} /></span><span className="pw-album-name">新建相册</span></button>}
    </div> : displayed.length ? <div className="pw-photo-grid">
      {displayed.map((image, index) => <div className="pw-photo" key={image.id}>
        {failedImages[image.id] ? <div className="pw-image-failed" style={{ aspectRatio: `${image.width} / ${image.height}` }}><Icon name="image" size={28} /><span>图片暂时无法加载</span><button type="button" onClick={() => setFailedImages(previous => ({ ...previous, [image.id]: false }))}>重试</button></div> : <button ref={element => { if (element) imageTriggers.current.set(image.id, element); else imageTriggers.current.delete(image.id); }} type="button" className="pw-photo-open" onClick={() => openImage(image)} aria-label={`放大查看${data.categories.find(category => category.id === image.categoryId)?.name || "相册"}的第 ${index + 1} 张图片`} aria-haspopup="dialog" disabled={showTrash}>
          <SoftImage src={image.src} width={image.width} height={image.height} alt={image.alt || `${data.categories.find(category => category.id === image.categoryId)?.name || "相册"}图片 ${index + 1}`} sizes="(max-width: 500px) 44vw, (max-width: 800px) 45vw, 310px" priority={index === 0} retry={false} onError={() => setFailedImages(previous => ({ ...previous, [image.id]: true }))} />
          {!showTrash && <span className="pw-photo-zoom" aria-hidden="true"><Icon name="plus" size={18} /></span>}
        </button>}
        {managing && isAdmin && (showTrash ? <button type="button" className="pw-restore" disabled={Boolean(restoringId)} onClick={() => void restoreImage(image)}>{restoringId === image.id ? "正在恢复…" : "恢复图片"}</button> : <button type="button" className="pw-photo-delete" aria-label={`删除第 ${index + 1} 张图片`} onClick={() => openManager("delete", image)}><Icon name="trash" size={17} /></button>)}
      </div>)}
    </div> : <div className="pw-empty"><Icon name={showTrash ? "trash" : "image"} size={38} /><p>{showTrash ? "回收站是空的。" : "这个相册还没有照片。"}</p>{isAdmin && !showTrash && <button type="button" className="pw-button pw-primary" onClick={() => openManager("upload")} disabled={!data.categories.length}>添加照片</button>}</div>}

    {!data.categories.length && albumView && <div className="pw-empty"><Icon name="folder" size={38} /><p>还没有相册。</p>{isAdmin && <button type="button" className="pw-button pw-primary" onClick={() => openManager("category")}>新建第一个相册</button>}</div>}

    <dialog ref={lightboxDialog} className="pw-lightbox" aria-label="查看大图" onClose={() => { setLightboxId(null); const target = previousFocus.current?.isConnected ? previousFocus.current : galleryBack.current || document.querySelector<HTMLElement>(".pw-heading button"); target?.focus({ preventScroll: true }); }} onClick={event => { if (event.target === event.currentTarget) lightboxDialog.current?.close(); }} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); moveImage(event.key === "ArrowRight" ? 1 : -1); } }}>
      <button className="pw-lightbox-close" type="button" onClick={() => lightboxDialog.current?.close()} aria-label="关闭大图" autoFocus><Icon name="close" size={23} /></button>
      {lightboxImage && <><CameraViewfinder key={lightboxImage.src} imageSelector=".pw-full-image" /><img className="pw-full-image" src={lightboxImage.src} width={lightboxImage.width} height={lightboxImage.height} alt={lightboxImage.alt || `${selectedCategory?.name || "相册"}图片 ${lightboxIndex + 1}`} /></>}
      {visibleImages.length > 1 && <><button className="pw-lightbox-prev" type="button" onClick={() => moveImage(-1)} aria-label="上一张图片"><Icon name="chevron" size={25} /></button><button className="pw-lightbox-next" type="button" onClick={() => moveImage(1)} aria-label="下一张图片"><Icon name="chevron" size={25} /></button><span className="pw-lightbox-counter" role="status">{lightboxIndex + 1} / {visibleImages.length}</span></>}
    </dialog>

    <dialog ref={managerDialog} className="pw-dialog" aria-labelledby={titleId} onClose={closeManager} onCancel={event => { if (busy) event.preventDefault(); }} onClick={event => { if (!busy && event.target === event.currentTarget) managerDialog.current?.close(); }}>
      <div className="pw-dialog-inner"><div className="pw-dialog-heading"><h2 id={titleId}>{modal === "category" ? "新建相册" : modal === "upload" ? "添加照片" : "删除这张图片？"}</h2><button type="button" className="pw-dialog-close" aria-label="关闭照片管理" disabled={busy} onClick={() => managerDialog.current?.close()}><Icon name="close" size={21} /></button></div>
        {modal === "category" && <form onSubmit={createCategory}><label htmlFor={categoryInputId}>相册名称</label><input id={categoryInputId} value={categoryName} onChange={event => setCategoryName(event.target.value)} maxLength={40} required autoFocus disabled={busy} placeholder="例如：旅途、风景" /><div className="pw-dialog-actions"><button type="button" className="pw-button" disabled={busy} onClick={() => managerDialog.current?.close()}>取消</button><button type="submit" className="pw-button pw-primary" disabled={busy || !categoryName.trim()}>{busy ? "正在创建…" : "创建相册"}</button></div></form>}
        {modal === "upload" && <form onSubmit={uploadImages}><label htmlFor={uploadSelectId}>添加到相册</label><select id={uploadSelectId} value={uploadCategory} onChange={event => setUploadCategory(event.target.value)} disabled={busy} required>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select><label className="pw-upload-zone"><Icon name="image" size={30} /><span>选择图片</span><small>JPG、PNG、WebP · 每张不超过 3 MB · 每次最多 20 张</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={event => { chooseFiles(event.currentTarget.files); event.currentTarget.value = ""; }} aria-label="选择要添加的图片" /></label>{Boolean(uploads.length) && <ul className="pw-upload-list" aria-label="已选择的图片">{uploads.map(item => <li key={item.key}><span>{item.file.name}</span><span>{item.mediaId ? <Icon name="check" size={16} /> : `${(item.file.size / 1_000_000).toFixed(1)} MB`}</span><button type="button" disabled={busy} aria-label={`移除 ${item.file.name}`} onClick={() => setUploads(previous => previous.filter(selected => selected.key !== item.key))}><Icon name="close" size={15} /></button></li>)}</ul>}{uploadProgress && <p className="pw-upload-progress" role="status">{uploadProgress}</p>}<div className="pw-dialog-actions"><button type="button" className="pw-button" disabled={busy} onClick={() => managerDialog.current?.close()}>取消</button><button type="submit" className="pw-button pw-primary" disabled={busy || !uploads.length || !uploadCategory}>{busy ? "正在添加…" : `添加${uploads.length ? ` ${uploads.length} 张` : "照片"}`}</button></div></form>}
        {modal === "delete" && deleteTarget && <form onSubmit={deleteImage}><img className="pw-delete-preview" src={deleteTarget.src} width={deleteTarget.width} height={deleteTarget.height} alt={deleteTarget.alt || "待删除的图片"} /><p className="pw-delete-hint">图片会从照片墙和首页轮播移除。之后可以在回收站恢复。</p><div className="pw-dialog-actions"><button type="button" className="pw-button" disabled={busy} onClick={() => managerDialog.current?.close()} autoFocus>取消</button><button type="submit" className="pw-button pw-danger" disabled={busy}>{busy ? "正在删除…" : "删除图片"}</button></div></form>}
        {modalError && <p className="pw-dialog-error" role="alert">{modalError}</p>}
      </div>
    </dialog>
  </>;
}
