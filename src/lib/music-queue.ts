export type MusicPlayMode = "list" | "shuffle" | "repeat-one";

export const MUSIC_PREFERENCES_KEY = "murui-music-player:v1";
export type MusicPreferences = { version: 1; playMode: MusicPlayMode; trackIds: string[] };

export function isMusicPlayMode(value: unknown): value is MusicPlayMode {
  return value === "list" || value === "shuffle" || value === "repeat-one";
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

export function parseMusicPreferences(raw: string | null): MusicPreferences | null {
  if (!raw || raw.length > 200_000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    if (record.version !== 1 || !isMusicPlayMode(record.playMode) || !Array.isArray(record.trackIds)) return null;
    const trackIds = record.trackIds.slice(0, 1000).filter((id): id is string =>
      typeof id === "string" && id.length > 0 && id.length <= 200);
    return { version: 1, playMode: record.playMode, trackIds: uniqueIds(trackIds) };
  } catch {
    return null;
  }
}

// A catalog is authoritative only after its fetch succeeds. Before then, saved
// cloud IDs must survive the temporary two-song local catalog.
export function reconcileTrackIds(saved: string[], available: string[], complete: boolean) {
  const ids = uniqueIds(available);
  const allowed = new Set(ids);
  const ordered = uniqueIds(saved).filter(id => !complete || allowed.has(id));
  const seen = new Set(ordered);
  return [...ordered, ...ids.filter(id => !seen.has(id))];
}

export function orderTracks<T extends { id: string }>(tracks: T[], savedIds: string[]): T[] {
  const byId = new Map(tracks.map(track => [track.id, track]));
  return reconcileTrackIds(savedIds, [...byId.keys()], true).map(id => byId.get(id)!);
}

// Keep unresolved cloud positions while the user rearranges available songs.
export function replaceKnownOrder(saved: string[], visible: string[]) {
  const known = new Set(visible);
  const remaining = [...visible];
  const result = uniqueIds(saved).map(id => known.has(id) ? remaining.shift()! : id);
  return [...result, ...remaining];
}

export function moveTrackInOrder<T extends { id: string }>(tracks: T[], id: string, targetIndex: number): T[] {
  const from = tracks.findIndex(track => track.id === id);
  if (from < 0 || !Number.isFinite(targetIndex)) return tracks;
  const to = Math.max(0, Math.min(tracks.length - 1, Math.trunc(targetIndex)));
  if (from === to) return tracks;
  const result = [...tracks];
  const [track] = result.splice(from, 1);
  result.splice(to, 0, track);
  return result;
}

export class ShuffleQueue {
  private bag: string[] = [];
  private seen = new Set<string>();
  private history: string[] = [];
  private cursor = -1;

  constructor(private random: () => number = Math.random) {}

  private shuffled(ids: string[]) {
    const result = [...ids];
    for (let index = result.length - 1; index > 0; index--) {
      const next = Math.min(index, Math.max(0, Math.floor(this.random() * (index + 1))));
      [result[index], result[next]] = [result[next], result[index]];
    }
    return result;
  }

  reset(ids: string[], currentId: string) {
    const available = uniqueIds(ids);
    this.seen = new Set(available.includes(currentId) ? [currentId] : []);
    this.bag = this.shuffled(available.filter(id => id !== currentId));
    this.history = available.includes(currentId) ? [currentId] : [];
    this.cursor = this.history.length - 1;
  }

  reconcile(ids: string[], currentId: string) {
    const available = uniqueIds(ids);
    const allowed = new Set(available);
    this.bag = this.bag.filter(id => allowed.has(id));
    this.seen = new Set([...this.seen].filter(id => allowed.has(id)));
    const additions = available.filter(id => !this.seen.has(id) && !this.bag.includes(id));
    this.bag.push(...this.shuffled(additions));
    const past = this.history.slice(0, this.cursor + 1).filter(id => allowed.has(id));
    const future = this.history.slice(this.cursor + 1).filter(id => allowed.has(id));
    this.history = [...past, ...future];
    this.cursor = past.length - 1;
    if (this.history[this.cursor] !== currentId && allowed.has(currentId)) this.select(currentId);
  }

  select(id: string) {
    this.bag = this.bag.filter(candidate => candidate !== id);
    this.seen.add(id);
    this.history = this.history.slice(0, this.cursor + 1);
    if (this.history[this.history.length - 1] !== id) this.history.push(id);
    // Bound memory during long listening sessions.
    if (this.history.length > 1000) this.history = this.history.slice(-1000);
    this.cursor = this.history.length - 1;
  }

  previous(ids: string[], currentId: string) {
    this.reconcile(ids, currentId);
    if (this.cursor > 0) this.cursor--;
    return this.history[this.cursor] ?? currentId;
  }

  next(ids: string[], currentId: string, excluded = new Set<string>()): string | null {
    this.reconcile(ids, currentId);
    while (this.cursor + 1 < this.history.length) {
      const id = this.history[++this.cursor];
      if (!excluded.has(id)) return id;
    }
    const available = uniqueIds(ids).filter(id => !excluded.has(id));
    if (!available.length) return null;
    this.bag = this.bag.filter(id => !excluded.has(id));
    if (!this.bag.length) {
      this.seen.clear();
      this.bag = this.shuffled(available);
      if (this.bag.length > 1 && this.bag[0] === currentId) {
        [this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]];
      }
    }
    const id = this.bag.shift()!;
    this.select(id);
    return id;
  }
}
