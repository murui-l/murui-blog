import cloudCatalog from "./cloud-music-catalog.json";

export type LyricLine = { time: number; text: string };

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  src: string;
  source: string;
  provider: "local" | "netease";
  cover?: string;
  lyrics?: LyricLine[];
  instrumental?: boolean;
  hasTimedLyrics?: boolean;
};

// NetEase song IDs can be supplied here or by the site's music API.
// Public outer links may be unavailable for some songs; no VIP bypass is used.
export const cloudMusicIds: string[] = cloudCatalog.tracks.map(track => track.id);

// Keep this playlist and licenses/music.md in sync when adding licensed tracks.
export const musicTracks: MusicTrack[] = [
  {
    id: "carefree",
    title: "Carefree",
    artist: "Kevin MacLeod",
    src: "/music/carefree.mp3",
    source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037",
    provider: "local",
    instrumental: true,
  },
  {
    id: "easy-lemon",
    title: "Easy Lemon",
    artist: "Kevin MacLeod",
    src: "/music/easy-lemon.mp3",
    source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200076",
    provider: "local",
    instrumental: true,
  },
];

export function parseLrc(lrc: string): LyricLine[] {
  if (!lrc || lrc.length > 100_000) return [];
  const offset = Number(lrc.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000;
  const result: LyricLine[] = [];
  for (const line of lrc.split(/\r?\n/)) {
    const stamps = [...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const text = line.replace(/\[[^\]]*\]/g, "").trim().replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
    for (const stamp of stamps) {
      const seconds = Number(stamp[2]);
      if (seconds >= 60) continue;
      const fraction = stamp[3] ? Number(stamp[3]) / 10 ** stamp[3].length : 0;
      result.push({ time: Math.max(0, Number(stamp[1]) * 60 + seconds + fraction + offset), text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

export function lyricAt(track: MusicTrack, elapsed: number): string {
  if (track.instrumental) return "纯音乐";
  const lines = track.lyrics;
  if (!lines?.length) return "暂无歌词";
  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index].time <= elapsed) return lines[index].text || "间奏";
  }
  return "前奏";
}

export function formatMusicTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
