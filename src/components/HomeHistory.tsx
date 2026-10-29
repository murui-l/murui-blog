"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { historySeenKey, validHistoryEntry, type HistoryEntry, type HistoryMonth } from "@/lib/home-daily";
import useHomeDay from "./useHomeDay";

const monthCache = new Map<string, HistoryMonth>();
const sessionSeen = new Set<string>();
function alreadySeen(day: string) {
  if (sessionSeen.has(day)) return true;
  try { return window.localStorage.getItem(historySeenKey) === day; } catch { return false; }
}

export default function HomeHistory() {
  const day = useHomeDay();
  const key = day?.key;
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const initialDay = useRef<string | null>(null);
  const [record, setRecord] = useState<{ key: string; entry: HistoryEntry | null } | null>(null);
  const entry = record && record.key === key ? record.entry : null;

  useEffect(() => {
    if (!key) return;
    const month = key.slice(5, 7), date = key.slice(5);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let cancelled = false;
    async function load() {
      try {
        let data = monthCache.get(month);
        if (!data) {
          const response = await fetch(`/home-history/${month}.json`, { signal: controller.signal, credentials: "omit" });
          if (!response.ok) throw Error("History month unavailable");
          const json: unknown = await response.json();
          if (!json || typeof json !== "object" || Array.isArray(json)) throw Error("Invalid history month");
          data = json as HistoryMonth;
          monthCache.set(month, data);
        }
        const selected = data[date];
        if (!validHistoryEntry(selected)) throw Error("Invalid history day");
        if (!cancelled) setRecord({ key: key!, entry: selected });
      } catch { if (!cancelled) setRecord({ key: key!, entry: null }); }
      finally { clearTimeout(timeout); }
    }
    void load();
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [key]);

  const open = useCallback((automatic: boolean) => {
    const node = dialog.current;
    if (!node || !key || node.open || (automatic && (!entry || alreadySeen(key)))) return;
    previousFocus.current = automatic && document.activeElement instanceof HTMLElement ? document.activeElement : trigger.current;
    document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach(other => { if (other !== node) other.close("switch"); });
    node.returnValue = "";
    node.showModal();
    sessionSeen.add(key);
    try { window.localStorage.setItem(historySeenKey, key); } catch { /* Session memory still suppresses repeat visits. */ }
  }, [key, entry]);

  useEffect(() => {
    if (!key) return;
    if (!initialDay.current) initialDay.current = key;
    if (initialDay.current !== key || !entry || alreadySeen(key)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const attempt = () => {
      if (alreadySeen(key)) return;
      if (document.hidden || document.querySelector("dialog[open]")) { timer = setTimeout(attempt, 500); return; }
      if (Date.now() - started < 3000) { timer = setTimeout(attempt, 3000 - (Date.now() - started)); return; }
      open(true);
    };
    timer = setTimeout(attempt, 3000);
    return () => clearTimeout(timer);
  }, [key, entry, open]);

  return <>
    <button ref={trigger} type="button" className="mh-notice-trigger mh-history-trigger" aria-haspopup="dialog" aria-controls="home-history" onClick={() => open(false)}><span aria-hidden="true">✎</span> 历史小趣事 <span aria-hidden="true">↗</span></button>
    <dialog ref={dialog} id="home-history" className="mh-notice mh-history" aria-labelledby="home-history-title" onClose={() => {
      if (dialog.current?.returnValue === "switch") return;
      const previous = previousFocus.current;
      if (previous?.isConnected && previous !== document.body) previous.focus({ preventScroll: true });
      else trigger.current?.focus({ preventScroll: true });
    }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="mh-notice-body">
        <button className="mh-notice-close" type="button" aria-label="关闭历史小趣事" autoFocus onClick={() => dialog.current?.close()}>×</button>
        <p className="mh-notice-label"><span aria-hidden="true">✎</span><time dateTime={key}>{day?.date ?? "今天"}</time></p>
        <h2 id="home-history-title">历史上今天的小趣事</h2>
        {entry ? <article className="mh-history-paper"><p className="mh-history-year">{entry.year} 年的今天</p><h3>{entry.title}</h3><p>{entry.summary}</p><a className="mh-history-source" href={entry.source} target="_blank" rel="noopener noreferrer">看看事件出处 <span aria-hidden="true">↗</span></a></article> : <p className="mh-history-empty">今天的小趣事暂时没有准备好，稍后再来看看。</p>}
        <p className="mh-history-footnote">每天翻开一件旧时光里的小事。</p>
      </div>
    </dialog>
  </>;
}
