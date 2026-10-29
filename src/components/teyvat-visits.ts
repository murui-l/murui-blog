import { destinationFromPath, teyvatDestinations } from "../lib/teyvat";

export const TEYVAT_VISITS_KEY = "murui-teyvat-visits-v1";
export const EMPTY_VISITS: readonly string[] = Object.freeze([]);
const validSlugs = teyvatDestinations.map(destination => destination.slug);
export type VisitStorage = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };

/** Only destination identifiers enter storage; no account or visit timestamps. */
export function parseTeyvatVisits(raw: string | null): readonly string[] {
  try {
    const value: unknown = JSON.parse(raw || "null");
    if (!Array.isArray(value)) return EMPTY_VISITS;
    return validSlugs.filter(slug => value.includes(slug));
  } catch { return EMPTY_VISITS; }
}

export function createTeyvatVisitStore(options: {
  getStorage: () => VisitStorage | undefined;
  subscribeStorage?: (listener: (key: string | null, value: string | null) => void) => () => void;
}) {
  let snapshot = EMPTY_VISITS;
  let loaded = false;
  let unsubscribeStorage: (() => void) | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  const load = () => {
    if (loaded) return;
    loaded = true;
    try { snapshot = parseTeyvatVisits(options.getStorage()?.getItem(TEYVAT_VISITS_KEY) ?? null); }
    catch { /* Keep session memory when browser storage is blocked. */ }
  };
  const replace = (next: readonly string[]) => {
    if (next.length === snapshot.length && next.every((slug, index) => slug === snapshot[index])) return false;
    snapshot = next;
    notify();
    return true;
  };
  const persist = (next: readonly string[]) => {
    try { options.getStorage()?.setItem(TEYVAT_VISITS_KEY, JSON.stringify(next)); }
    catch { /* The current session still remembers these destinations. */ }
  };
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY_VISITS,
    subscribe(listener: () => void) {
      load();
      listeners.add(listener);
      if (!unsubscribeStorage && options.subscribeStorage) unsubscribeStorage = options.subscribeStorage((key, value) => {
        if (key !== TEYVAT_VISITS_KEY && key !== null) return;
        if (key === null || value === null) { replace(EMPTY_VISITS); return; }
        const incoming = parseTeyvatVisits(value);
        const merged = validSlugs.filter(slug => snapshot.includes(slug) || incoming.includes(slug));
        if (replace(merged) && merged.length > incoming.length) persist(merged);
      });
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { unsubscribeStorage?.(); unsubscribeStorage = undefined; }
      };
    },
    recordPath(path: string) {
      const destination = destinationFromPath(path);
      if (!destination) return false;
      load();
      // Merge the latest disk value before recording so simultaneous tabs do
      // not overwrite a destination that has not delivered its storage event.
      let latest = EMPTY_VISITS;
      try { latest = parseTeyvatVisits(options.getStorage()?.getItem(TEYVAT_VISITS_KEY) ?? null); } catch { /* Session fallback. */ }
      const next = validSlugs.filter(slug => slug === destination.slug || snapshot.includes(slug) || latest.includes(slug));
      if (next.length === snapshot.length && next.every((slug, index) => slug === snapshot[index])) return false;
      persist(next);
      return replace(next);
    },
  };
}

export const teyvatVisits = createTeyvatVisitStore({
  getStorage: () => typeof window === "undefined" ? undefined : window.localStorage,
  subscribeStorage: listener => {
    if (typeof window === "undefined") return () => {};
    const update = (event: StorageEvent) => {
      // Ignore sessionStorage events and unrelated keys without reading values.
      try { if (event.storageArea && event.storageArea !== window.localStorage) return; }
      catch { return; }
      listener(event.key, event.newValue);
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  },
});
