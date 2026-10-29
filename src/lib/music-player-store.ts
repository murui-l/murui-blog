"use client";

import { useSyncExternalStore } from "react";
import { musicTracks, parseLrc } from "@/lib/music";
import type { MusicTrack } from "@/lib/music";
import { isMusicPlayMode, MUSIC_PREFERENCES_KEY, moveTrackInOrder, orderTracks, parseMusicPreferences, reconcileTrackIds, ShuffleQueue } from "./music-queue";
import type { MusicPlayMode } from "./music-queue";
import { parseMusicOrder, type MusicOrderSnapshot } from "./music-order";

type MusicState = {
  teyvatNation: string | null;
  tracks: MusicTrack[];
  index: number;
  playing: boolean;
  loading: boolean;
  elapsed: number;
  duration: number;
  volume: number;
  playMode: MusicPlayMode;
  repeatOne: boolean;
  error: string;
  cloudMessage: string;
  lyricLoading: boolean;
  catalogLoaded: boolean;
  orderLoaded: boolean;
  orderEditable: boolean;
  orderDirty: boolean;
  orderSaving: boolean;
  orderConflict: boolean;
  orderMessage: string;
  localOrderAvailable: boolean;
};

const initialState: MusicState = {
  teyvatNation: null,
  tracks: musicTracks, index: 0, playing: false, loading: false,
  elapsed: 0, duration: 0, volume: .4, playMode: "list", repeatOne: false, error: "", cloudMessage: "", lyricLoading: false,
  catalogLoaded: false, orderLoaded: false, orderEditable: false, orderDirty: false, orderSaving: false, orderConflict: false, orderMessage: "正在读取云端顺序…", localOrderAvailable: false,
};
let state = initialState;
let audio: HTMLAudioElement | null = null;
let lastVolume = .4;
let playRequest = 0;
let cloudRequested = false;
let cloudRequest: Promise<void> | null = null;
let playbackWanted = false;
let playlistTouched = false;
let catalogReady = false;
let catalogTracks = musicTracks;
let preferencesRestored = false;
let preferredOrderIds: string[] = [];
let legacyOrderIds: string[] = [];
let remoteOrder: MusicOrderSnapshot | null = null;
let orderRequest: Promise<void> | null = null;
let orderFetchEpoch = 0;
const MODE_PREFERENCES_KEY = "murui-music-player:v2";
let lyricController: AbortController | null = null;
let lyricTrackId: string | null = null;
const failedTracks = new Set<string>();
let shuffleQueue = new ShuffleQueue();
type TravelSession = { saved: MusicState; wanted: boolean; shuffle: ShuffleQueue; failed: Set<string> };
let travelSession: TravelSession | null = null;
let sourceEpoch = 0;
let resumePoint: { epoch: number; elapsed: number; start: boolean } | null = null;
const lyricCache = new Map<string, { lyrics: MusicTrack["lyrics"]; instrumental: boolean; fetchedAt: number }>();
const subscribers = new Set<() => void>();

function update(patch: Partial<MusicState>) {
  state = { ...state, ...patch };
  for (const subscriber of subscribers) subscriber();
}
function updateGlobal(patch: Partial<MusicState>) {
  if (travelSession) travelSession.saved = { ...travelSession.saved, ...patch };
  else update(patch);
}
function subscribe(subscriber: () => void) {
  subscribers.add(subscriber);
  return () => { subscribers.delete(subscriber); };
}

function trackIds() {
  return state.tracks.map(track => track.id);
}

function savePreferences() {
  if (travelSession || !preferencesRestored || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODE_PREFERENCES_KEY, JSON.stringify({ version: 2, playMode: state.playMode }));
  } catch { /* Playback also works when browser storage is unavailable. */ }
}

function restorePreferences() {
  if (preferencesRestored || typeof window === "undefined") return;
  preferencesRestored = true;
  try {
    const old = parseMusicPreferences(window.localStorage.getItem(MUSIC_PREFERENCES_KEY));
    legacyOrderIds = old?.trackIds ?? [];
    const raw = window.localStorage.getItem(MODE_PREFERENCES_KEY);
    const saved = raw ? JSON.parse(raw) as { version?: unknown; playMode?: unknown } : null;
    const mode = saved?.version === 2 && isMusicPlayMode(saved.playMode) ? saved.playMode : old?.playMode;
    if (mode) update({ playMode: mode, repeatOne: mode === "repeat-one" });
  } catch { /* A blocked localStorage getter must not prevent attachment. */ }
  if (state.playMode === "shuffle") shuffleQueue.reset(trackIds(), state.tracks[state.index].id);
}

function setPlayMode(playMode: MusicPlayMode) {
  if (!isMusicPlayMode(playMode) || playMode === state.playMode) return;
  if (playMode === "shuffle") shuffleQueue.reset(trackIds(), state.tracks[state.index].id);
  if (audio) audio.loop = playMode === "repeat-one";
  update({ playMode, repeatOne: playMode === "repeat-one" });
  savePreferences();
}

function moveTrack(id: string, targetIndex: number) {
  if (!canAdjustOrder()) return false;
  const tracks = moveTrackInOrder(state.tracks, id, targetIndex);
  if (tracks === state.tracks) return false;
  const currentId = state.tracks[state.index].id;
  playlistTouched = true;
  preferredOrderIds = tracks.map(track => track.id);
  update({ tracks, index: tracks.findIndex(track => track.id === currentId) });
  markOrderDraft();
  return true;
}

function resetOrder() {
  if (!canAdjustOrder()) return false;
  playlistTouched = true;
  preferredOrderIds = catalogTracks.map(track => track.id);
  applyCurrentOrder();
  markOrderDraft();
  return true;
}

function canAdjustOrder() {
  return !travelSession && state.orderLoaded && state.orderEditable && catalogReady && !state.orderSaving && !state.orderConflict;
}
function updateLocalImport() {
  update({ localOrderAvailable: catalogReady && legacyOrderIds.length > 0
    && reconcileTrackIds(legacyOrderIds, catalogTracks.map(track => track.id), true).join("\n") !== remoteOrder?.trackIds.join("\n") });
}
function markOrderDraft() {
  const dirty = preferredOrderIds.join("\n") !== remoteOrder?.trackIds.join("\n");
  update({ orderDirty: dirty, orderMessage: dirty ? "顺序已调整，点击“保存到全站”后生效。" : "正在使用全站云端顺序。" });
}
function applyCurrentOrder(initialSelection = false) {
  if (travelSession) {
    const saved = travelSession.saved;
    const tracks = orderTracks(saved.tracks, preferredOrderIds);
    travelSession.saved = { ...saved, tracks, index: Math.max(0, tracks.findIndex(track => track.id === saved.tracks[saved.index].id)) };
    return;
  }
  const previous = state.tracks[state.index];
  const tracks = orderTracks(state.tracks, preferredOrderIds);
  const index = initialSelection ? 0 : Math.max(0, tracks.findIndex(track => track.id === previous.id));
  const next = tracks[index];
  update({ tracks, index });
  if (state.playMode === "shuffle") shuffleQueue.reconcile(trackIds(), next.id);
  if (next.id !== previous.id && audio) {
    playRequest++;
    audio.src = next.src; audio.load();
    update({ elapsed: 0, duration: 0 });
    void loadCurrentLyrics();
  }
}
async function fetchMusicOrder() {
  if (travelSession) return;
  const epoch = orderFetchEpoch;
  try {
    const response = await fetch("/api/music-order", { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(8000) });
    const raw = await response.json();
    const order = parseMusicOrder(raw);
    if (!response.ok || !order) throw new Error("unavailable");
    if (travelSession || epoch !== orderFetchEpoch || state.orderSaving) return;
    const changed = remoteOrder && remoteOrder.revision !== order.revision;
    remoteOrder = order;
    const editable = raw.canEdit === true;
    if (state.orderDirty && editable) {
      update({ orderLoaded: true, orderEditable: true,
        orderMessage: changed || state.orderConflict ? "另一窗口已更新顺序，请重新读取云端顺序后再调整。" : "顺序已调整，点击“保存到全站”后生效。",
        ...(changed ? { orderConflict: true } : {}) });
    } else {
      preferredOrderIds = order.trackIds;
      update({ orderLoaded: true, orderEditable: editable, orderDirty: false, orderConflict: false, orderMessage: "正在使用全站云端顺序。" });
      applyCurrentOrder(!playlistTouched && !state.playing && !state.loading && !playbackWanted);
    }
    updateLocalImport();
  } catch {
    if (epoch === orderFetchEpoch) update({ orderEditable: false, orderMessage: "云端顺序暂时无法连接，请重试；歌曲仍可播放。" });
  }
}
export function refreshMusicOrder() {
  if (orderRequest) return orderRequest;
  orderRequest = fetchMusicOrder().finally(() => { orderRequest = null; });
  return orderRequest;
}
function discardOrder() {
  if (state.orderSaving || !remoteOrder) return;
  preferredOrderIds = remoteOrder.trackIds;
  update({ orderDirty: false, orderConflict: false, orderMessage: "已恢复云端保存的顺序。" });
  applyCurrentOrder();
}
function importLocalOrder() {
  if (!canAdjustOrder() || !state.localOrderAvailable) return;
  playlistTouched = true;
  preferredOrderIds = reconcileTrackIds(legacyOrderIds, catalogTracks.map(track => track.id), true);
  applyCurrentOrder(); markOrderDraft();
}
async function saveOrder() {
  if (!canAdjustOrder() || !state.orderDirty || !remoteOrder) return false;
  orderFetchEpoch++;
  updateGlobal({ orderSaving: true, orderMessage: "正在保存到云端…" });
  try {
    const response = await fetch("/api/music-order", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: remoteOrder.revision, trackIds: preferredOrderIds }), signal: AbortSignal.timeout(10000) });
    const raw = await response.json();
    const order = parseMusicOrder(raw);
    if (!response.ok || !order) {
      updateGlobal({ orderConflict: response.status === 409, ...(response.status === 403 ? { orderEditable: false } : {}) });
      throw new Error(typeof raw.message === "string" ? raw.message : "保存未成功，请重试。");
    }
    remoteOrder = order; preferredOrderIds = order.trackIds;
    updateGlobal({ orderDirty: false, orderConflict: false, orderMessage: "已保存到云端，所有访客使用此顺序。" });
    applyCurrentOrder(); if (!travelSession) updateLocalImport();
    return true;
  } catch (error) {
    updateGlobal({ orderMessage: error instanceof Error && error.name !== "TimeoutError" ? error.message : "保存未成功，请检查网络后重试。" });
    return false;
  } finally { updateGlobal({ orderSaving: false }); }
}
async function reloadOrder() {
  if (state.orderSaving) return;
  // A conflicting draft is discarded only through this explicit user action.
  if (orderRequest) await orderRequest;
  update({ orderDirty: false, orderConflict: false });
  await refreshMusicOrder();
}

function syncAudio() {
  if (!audio) return;
  update({
    elapsed: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    duration: Number.isFinite(audio.duration) ? audio.duration : 0,
    volume: audio.volume,
  });
}

async function play() {
  const player = audio;
  if (!player) return;
  const request = ++playRequest;
  playbackWanted = true;
  if (resumePoint) resumePoint.start = false;
  playlistTouched = true;
  update({ error: "", loading: true });
  try {
    await player.play();
  } catch (failure) {
    if (request !== playRequest) return;
    update({ loading: false });
    if (failure instanceof DOMException && failure.name === "AbortError") return;
    if (failure instanceof DOMException && failure.name === "NotAllowedError") {
      playbackWanted = false;
      update({ playing: false, error: "浏览器暂停了播放，再点一次播放按钮试试。" });
    } else playbackFailed();
  }
}

function pause() {
  playRequest++;
  playbackWanted = false;
  if (resumePoint) resumePoint.start = false;
  audio?.pause();
  update({ playing: false, loading: false });
}

function selectTrackInternal(index: number, start: boolean, navigation = false) {
  if (!state.tracks.length || !Number.isFinite(index)) return;
  const next = (index % state.tracks.length + state.tracks.length) % state.tracks.length;
  sourceEpoch++;
  resumePoint = null;
  playRequest++;
  playlistTouched = true;
  playbackWanted = start;
  if (state.playMode === "shuffle" && !navigation) shuffleQueue.select(state.tracks[next].id);
  update({ index: next, elapsed: 0, duration: 0, error: "", loading: false, playing: false });
  void loadCurrentLyrics();
  if (!audio) return;
  audio.src = state.tracks[next].src;
  audio.load();
  if (start) void play();
}

function selectTrack(index: number, start = state.playing || state.loading) {
  failedTracks.clear();
  selectTrackInternal(Math.trunc(index), start);
}

function advance(direction: 1 | -1, start = state.playing || state.loading, automatic = false) {
  if (!automatic) failedTracks.clear();
  if (state.playMode === "shuffle") {
    const currentId = state.tracks[state.index].id;
    const id = direction === -1 ? shuffleQueue.previous(trackIds(), currentId)
      : shuffleQueue.next(trackIds(), currentId, automatic ? failedTracks : undefined);
    if (id === null) return false;
    selectTrackInternal(state.tracks.findIndex(track => track.id === id), start, true);
    return true;
  }
  for (let offset = 1; offset <= state.tracks.length; offset++) {
    const index = (state.index + direction * offset + state.tracks.length) % state.tracks.length;
    if (automatic && failedTracks.has(state.tracks[index].id)) continue;
    selectTrackInternal(index, start, true);
    return true;
  }
  return false;
}

function playbackFailed() {
  const failedTrack = state.tracks[state.index];
  failedTracks.add(failedTrack.id);
  if (travelSession) {
    const next = state.tracks.findIndex(track => !failedTracks.has(track.id));
    if (playbackWanted && next >= 0) {
      selectTrackInternal(next, true);
      update({ cloudMessage: "已切换同地区备用曲。" });
    } else {
      playbackWanted = false;
      update({ playing: false, loading: false, error: "地区音乐暂时无法播放，可稍后重试或打开音乐来源。" });
    }
    return;
  }
  const shouldContinue = playbackWanted && failedTrack.provider === "netease";
  update({ playing: false, loading: false, error: failedTrack.provider === "netease"
    ? "这首歌的网易云外链暂时不能播放，可以换一首或在网易云打开。"
    : "这首轻音乐暂时无法播放，试试下一首。" });
  if (shouldContinue) {
    if (advance(1, true, true)) {
      update({ cloudMessage: `《${failedTrack.title}》的外链不能播放，已切换下一首。` });
    } else playbackWanted = false;
  } else playbackWanted = false;
}

function volume(value: number) {
  const safe = Math.min(1, Math.max(0, value));
  if (safe > 0) lastVolume = safe;
  if (audio) audio.volume = safe;
  update({ volume: safe });
}

function toCloudTrack(value: unknown): MusicTrack | null {
  if (!value || typeof value !== "object") return null;
  const song = value as Record<string, unknown>;
  if (song.error) return null;
  const id = String(song.id || "");
  if (!/^\d{1,15}$/.test(id)) return null;
  const title = typeof song.title === "string" ? song.title : typeof song.name === "string" ? song.name : "";
  if (!title) return null;
  const lyrics = typeof song.lrc === "string" ? parseLrc(song.lrc) : typeof song.lyrics === "string" ? parseLrc(song.lyrics)
    : Array.isArray(song.lyrics) ? song.lyrics.slice(0, 2000).flatMap(line => {
      if (!line || typeof line !== "object") return [];
      const row = line as Record<string, unknown>;
      return typeof row.time === "number" && Number.isFinite(row.time) && row.time >= 0 && typeof row.text === "string"
        ? [{ time: row.time, text: row.text.slice(0, 1000) }] : [];
    }).sort((a, b) => a.time - b.time) : [];
  const cover = typeof song.cover === "string" && /^https:\/\//.test(song.cover) ? song.cover : undefined;
  return {
    id: `netease-${id}`, title: title.slice(0, 200),
    artist: typeof song.artist === "string" ? song.artist.slice(0, 200) : "网易云音乐",
    // Use the provider's public outer link; never accept an arbitrary audio URL.
    src: `https://music.163.com/song/media/outer/url?id=${id}.mp3`,
    source: `https://music.163.com/#/song?id=${id}`,
    provider: "netease", cover, lyrics, instrumental: song.instrumental === true,
    hasTimedLyrics: song.hasTimedLyrics === true,
  };
}

async function loadCurrentLyrics() {
  const track = state.tracks[state.index];
  if (lyricTrackId === track.id && lyricController && !lyricController.signal.aborted) return;
  lyricController?.abort();
  lyricController = null;
  lyricTrackId = null;
  if (track.provider !== "netease" || track.instrumental) {
    update({ lyricLoading: false });
    return;
  }
  const cached = lyricCache.get(track.id);
  if (cached && Date.now() - cached.fetchedAt < 3_600_000) {
    update({ tracks: state.tracks.map(song => song.id === track.id ? { ...song, lyrics: cached.lyrics, instrumental: cached.instrumental } : song), lyricLoading: false });
    return;
  }
  if (!cached && track.lyrics?.length) {
    lyricCache.set(track.id, { lyrics: track.lyrics, instrumental: Boolean(track.instrumental), fetchedAt: Date.now() });
    update({ lyricLoading: false });
    return;
  }
  const controller = new AbortController();
  lyricController = controller;
  lyricTrackId = track.id;
  update({ lyricLoading: true });
  try {
    const id = track.id.replace(/^netease-/, "");
    const response = await fetch(`/api/music?ids=${id}`, { signal: controller.signal });
    if (!response.ok) throw new Error("lyrics unavailable");
    const raw: unknown = await response.json();
    const rows = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).tracks)
      ? (raw as { tracks: unknown[] }).tracks : [];
    const current = rows.map(toCloudTrack).find(song => song?.id === track.id);
    if (!current || controller.signal.aborted) return;
    lyricCache.set(track.id, { lyrics: current.lyrics, instrumental: Boolean(current.instrumental), fetchedAt: Date.now() });
    update({ tracks: state.tracks.map(song => song.id === track.id ? { ...song, ...current } : song), lyricLoading: false });
  } catch {
    if (!controller.signal.aborted && state.tracks[state.index].id === track.id) update({ lyricLoading: false });
  } finally {
    if (lyricController === controller) {
      lyricController = null;
      lyricTrackId = null;
      if (state.tracks[state.index].id === track.id) update({ lyricLoading: false });
    }
  }
}

async function fetchCloudPlaylist() {
  if (travelSession) return;
  cloudRequested = true;
  try {
    const response = await fetch("/api/music", { cache: "no-store" });
    if (!response.ok) throw new Error("unavailable");
    const raw: unknown = await response.json();
    if (travelSession) return;
    const rows = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).tracks)
      ? (raw as { tracks: unknown[] }).tracks : [];
    const tracks = rows.slice(0, 600).map(toCloudTrack).filter((song): song is MusicTrack => Boolean(song));
    const unique = [...new Map(tracks.map(song => [song.id, song])).values()].map(song => {
      const previous = state.tracks.find(track => track.id === song.id);
      const cached = lyricCache.get(song.id);
      if (cached) return { ...song, lyrics: cached.lyrics, instrumental: cached.instrumental };
      if (!song.lyrics?.length && previous?.lyrics?.length) {
        return { ...song, lyrics: previous.lyrics, instrumental: previous.instrumental };
      }
      return song;
    });
    const previous = state.tracks[state.index];
    catalogTracks = [...unique, ...musicTracks];
    const combined = orderTracks(catalogTracks, preferredOrderIds);
    const initialSelection = !catalogReady && !playlistTouched && !state.playing && !state.loading && !playbackWanted;
    const index = initialSelection ? 0 : combined.findIndex(song => song.id === previous.id);
    const next = combined[Math.max(0, index)];
    catalogReady = true;
    preferredOrderIds = reconcileTrackIds(preferredOrderIds, catalogTracks.map(track => track.id), true);
    update({ tracks: combined, index: Math.max(0, index), cloudMessage: "", catalogLoaded: true });
    if (state.playMode === "shuffle") {
      if (initialSelection) shuffleQueue.reset(trackIds(), next.id);
      else shuffleQueue.reconcile(trackIds(), next.id);
    }
    savePreferences();
    updateLocalImport();
    void loadCurrentLyrics();
    if (next.id !== previous.id && audio) {
      const continuePlaying = playbackWanted;
      playRequest++;
      audio.src = next.src;
      audio.load();
      update({ elapsed: 0, duration: 0 });
      if (continuePlaying) void play();
    }
  } catch {
    if (!travelSession) update({ cloudMessage: "网易云暂时未连接，轻音乐仍可播放。" });
  }
}

export function refreshMusicPlaylist() {
  if (travelSession) return Promise.resolve();
  if (cloudRequest) return cloudRequest;
  cloudRequest = fetchCloudPlaylist().finally(() => { cloudRequest = null; });
  return cloudRequest;
}

function enterTeyvat(nation: string, tracks: MusicTrack[], start: boolean) {
  if (!tracks.length) return;
  if (travelSession && state.teyvatNation === nation) {
    if (start && !state.playing && !state.loading) {
      failedTracks.clear();
      if (state.error) selectTrackInternal(0, true); else void play();
    }
    return;
  }
  if (!travelSession) {
    const elapsed = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : state.elapsed;
    travelSession = { saved: { ...state, elapsed }, wanted: playbackWanted || state.playing, shuffle: shuffleQueue, failed: new Set(failedTracks) };
    shuffleQueue = new ShuffleQueue();
    orderFetchEpoch++;
  }
  lyricController?.abort(); lyricController = null; lyricTrackId = null;
  failedTracks.clear();
  update({ teyvatNation: nation, tracks, index: 0, playing: false, loading: false, elapsed: 0, duration: 0,
    playMode: "repeat-one", repeatOne: true, error: "", cloudMessage: "", lyricLoading: false,
    orderEditable: false, orderDirty: false, orderSaving: false, orderConflict: false, localOrderAvailable: false, orderMessage: "", catalogLoaded: true, orderLoaded: true });
  if (audio) audio.loop = true;
  selectTrackInternal(0, start);
}

function syncTeyvat(nation: string, tracks: MusicTrack[]) {
  if (state.teyvatNation === nation) return;
  enterTeyvat(nation, tracks, Boolean(travelSession && (state.playing || playbackWanted)));
}

function restoreTravelPosition() {
  const pending = resumePoint;
  if (!pending || !audio || pending.epoch !== sourceEpoch || audio.readyState < 1) return;
  resumePoint = null;
  const maximum = Number.isFinite(audio.duration) && audio.duration > 0 ? Math.max(0, audio.duration - .05) : pending.elapsed;
  try { audio.currentTime = Math.max(0, Math.min(maximum, pending.elapsed)); } catch { /* Some streams do not support seeking. */ }
  syncAudio();
  if (pending.start) void play();
}

function leaveTeyvat() {
  if (!travelSession) return;
  const session = travelSession, volume = state.volume;
  travelSession = null;
  playRequest++; sourceEpoch++; orderFetchEpoch++;
  lyricController?.abort(); lyricController = null; lyricTrackId = null;
  audio?.pause();
  playbackWanted = session.wanted;
  shuffleQueue = session.shuffle;
  failedTracks.clear(); for (const id of session.failed) failedTracks.add(id);
  playlistTouched = true;
  update({ ...session.saved, volume, teyvatNation: null, playing: false, loading: session.wanted, lyricLoading: false });
  resumePoint = { epoch: sourceEpoch, elapsed: session.saved.elapsed, start: session.wanted };
  if (audio) {
    audio.src = state.tracks[state.index].src; audio.loop = state.repeatOne; audio.load();
    restoreTravelPosition();
  }
  void loadCurrentLyrics();
  // In-flight initial requests may have been discarded while travelling.
  const pendingCloud = cloudRequest;
  if (!catalogReady) { if (pendingCloud) void pendingCloud.finally(() => { void refreshMusicPlaylist(); }); else void refreshMusicPlaylist(); }
  const pendingOrder = orderRequest;
  if (pendingOrder) void pendingOrder.finally(() => { void refreshMusicOrder(); }); else void refreshMusicOrder();
}

// The persistent layout mounts this one audio element. All views subscribe to it.
export function attachMusicAudio(player: HTMLAudioElement) {
  restorePreferences();
  audio = player;
  player.src = state.tracks[state.index].src;
  player.volume = state.volume;
  player.loop = state.repeatOne;
  const listeners: Record<string, EventListener> = {
    play: () => update({ playing: true }),
    pause: () => update({ playing: false, loading: false }),
    playing: () => { if (!travelSession) failedTracks.clear(); update({ loading: false }); },
    waiting: () => update({ loading: true }),
    loadedmetadata: () => { restoreTravelPosition(); syncAudio(); },
    durationchange: syncAudio,
    timeupdate: syncAudio,
    volumechange: syncAudio,
    ended: () => {
      if (state.playMode === "repeat-one") {
        player.currentTime = 0;
        void play();
      } else advance(1, true);
    },
    error: () => { if (player.error) playbackFailed(); },
  };
  for (const [name, listener] of Object.entries(listeners)) player.addEventListener(name, listener);
  restoreTravelPosition();
  if (playbackWanted && !resumePoint) void play();
  const refresh = () => { void refreshMusicPlaylist(); void refreshMusicOrder(); };
  if (!cloudRequested) refresh();
  else void refreshMusicOrder();
  const visible = () => { if (document.visibilityState === "visible") void refreshMusicOrder(); };
  const poll = window.setInterval(visible, 30_000);
  window.addEventListener("murui-music-updated", refresh);
  window.addEventListener("focus", refresh);
  window.addEventListener("murui-profile-updated", refresh);
  document.addEventListener("visibilitychange", visible);
  return () => {
    for (const [name, listener] of Object.entries(listeners)) player.removeEventListener(name, listener);
    window.removeEventListener("murui-music-updated", refresh);
    window.removeEventListener("focus", refresh);
    window.removeEventListener("murui-profile-updated", refresh);
    document.removeEventListener("visibilitychange", visible);
    window.clearInterval(poll);
    if (audio === player) {
      playRequest++;
      player.pause();
      playbackWanted = false;
      audio = null;
      lyricController?.abort();
      lyricController = null;
      lyricTrackId = null;
      update({ playing: false, loading: false, lyricLoading: false });
    }
  };
}

export const musicActions = {
  enterTeyvat,
  syncTeyvat,
  leaveTeyvat,
  togglePlay: () => { if (audio?.paused) void play(); else pause(); },
  pause,
  selectTrack,
  next: () => { advance(1); },
  previous: () => { advance(-1); },
  moveTrack,
  resetOrder,
  saveOrder,
  discardOrder,
  importLocalOrder,
  reloadOrder,
  refreshOrder: refreshMusicOrder,
  setPlayMode,
  cyclePlayMode: () => setPlayMode(state.playMode === "list" ? "shuffle" : state.playMode === "shuffle" ? "repeat-one" : "list"),
  seek: (value: number) => {
    if (!audio || !state.duration) return;
    const elapsed = Math.max(0, Math.min(state.duration, value));
    audio.currentTime = elapsed;
    update({ elapsed });
  },
  volume,
  toggleMute: () => volume(state.volume > 0 ? 0 : lastVolume),
  toggleRepeat: () => setPlayMode(state.repeatOne ? "list" : "repeat-one"),
};

export function useMusicPlayer() {
  return useSyncExternalStore(subscribe, () => state, () => initialState);
}
