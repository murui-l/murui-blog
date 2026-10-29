"use client";

import { useId, useRef, useState } from "react";
import Icon from "./Icon";
import "./RssSubscribe.css";

export default function RssSubscribe({ variant = "footer" }: { variant?: "card" | "footer" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const address = useRef<HTMLInputElement>(null);
  const id = useId();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");

  function open() {
    setUrl(new URL("/feed.xml", window.location.origin).href);
    setStatus("");
    dialog.current?.showModal();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("地址已复制，去阅读器里添加订阅吧。");
    } catch {
      address.current?.focus();
      address.current?.select();
      setStatus("自动复制未成功，请复制上方已选中的地址；手机可长按复制。");
    }
  }

  return <>
    <button ref={trigger} type="button" className={variant === "card" ? "ah-rss rss-card-trigger" : "rss-footer-trigger"} onClick={open} aria-haspopup="dialog" aria-controls={id}>
      {variant === "card" ? <><Icon name="mail" size={18}/><span>把新故事装进口袋<small>通过 RSS 订阅小窝</small></span><Icon name="chevron" size={16}/></> : "RSS 订阅"}
    </button>
    <dialog ref={dialog} id={id} className="rss-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-intro`} onClose={() => trigger.current?.focus({ preventScroll: true })} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="rss-dialog-body">
        <button className="rss-close" type="button" aria-label="关闭订阅说明" onClick={() => dialog.current?.close()}><Icon name="close" size={20}/></button>
        <span className="rss-dialog-icon" aria-hidden="true"><Icon name="mail" size={25}/></span>
        <h2 id={`${id}-title`}>把新故事装进口袋</h2>
        <p className="rss-intro" id={`${id}-intro`}>用 RSS 阅读器订阅小窝，新文章会自动收集到你的阅读列表里。</p>
        <ol className="rss-steps"><li>复制下方订阅地址。</li><li>打开你的 RSS 阅读器，选择“添加订阅”。</li><li>粘贴地址并确认，就可以等新故事到来啦。</li></ol>
        <label className="rss-address-label" htmlFor={`${id}-address`}>小窝的订阅地址</label>
        <input ref={address} className="rss-address" id={`${id}-address`} value={url} readOnly onFocus={event => event.currentTarget.select()} spellCheck={false}/>
        <button className="rss-copy" type="button" onClick={copy} autoFocus>复制订阅地址 <Icon name="arrow" size={17}/></button>
        <p className="rss-status" role="status" aria-live="polite">{status}</p>
        <p className="rss-help">还没有阅读器？先准备一个支持 RSS 的阅读应用，再回来添加这个地址。订阅无需注册小窝账号，也不会发送邮件。</p>
      </div>
    </dialog>
  </>;
}
