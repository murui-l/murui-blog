import { NextRequest, NextResponse } from "next/server";
import cloudCatalog from "@/lib/cloud-music-catalog.json";

const musicHeaders = { Referer: "https://music.163.com/" };
type Song = {
  id: number; name: string;
  artists?: Array<{ name?: string }>;
  album?: { picUrl?: string };
};

async function getSong(id: string) {
  const [detailResponse, lyricResponse] = await Promise.all([
    fetch(`https://music.163.com/api/song/detail/?id=${id}&ids=[${id}]`, {
      headers: musicHeaders, signal: AbortSignal.timeout(6000), next: { revalidate: 3600 },
    }),
    fetch(`https://music.163.com/api/song/lyric?id=${id}&lv=-1&kv=-1&tv=-1`, {
      headers: musicHeaders, signal: AbortSignal.timeout(6000), next: { revalidate: 3600 },
    }).catch(() => null),
  ]);
  if (!detailResponse.ok) return null;
  const detail = await detailResponse.json() as { songs?: Song[] };
  const song = detail.songs?.find(song => String(song.id) === id);
  if (!song || typeof song.name !== "string") return null;
  const lyric = lyricResponse?.ok
    ? await lyricResponse.json().catch(() => null) as { lrc?: { lyric?: string }; nolyric?: boolean } | null
    : null;
  const cover = song.album?.picUrl;
  return {
    id,
    title: song.name,
    artist: song.artists?.map(artist => artist.name).filter(Boolean).join(" / ") || "未知歌手",
    src: `https://music.163.com/song/media/outer/url?id=${id}.mp3`,
    source: `https://music.163.com/#/song?id=${id}`,
    provider: "netease",
    ...(cover && /^https?:\/\//.test(cover) ? { cover: cover.replace(/^http:/, "https:") } : {}),
    lyrics: typeof lyric?.lrc?.lyric === "string" ? lyric.lrc.lyric.slice(0, 100000) : "",
    instrumental: lyric?.nolyric === true || /纯音乐[,，\s]*请欣赏|纯音乐曲目|instrumental\s*track/i.test(lyric?.lrc?.lyric || ""),
  };
}

export async function GET(request: NextRequest) {
  if (!request.nextUrl.searchParams.has("ids")) {
    // The full directory is frozen; only the selected song requests live lyrics.
    return NextResponse.json(cloudCatalog.tracks, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  }
  const rawIds = request.nextUrl.searchParams.get("ids")!.split(",").map(id => id.trim());
  if (!rawIds.length || rawIds.length > 25 || rawIds.some(id => !/^[1-9]\d{0,11}$/.test(id))) {
    return NextResponse.json({ message: "请提供 1 至 25 个有效的网易云歌曲 ID。" }, { status: 400 });
  }
  const ids = [...new Set(rawIds)];
  const results = await Promise.all(ids.map(id => getSong(id).catch(() => null)));
  const tracks = results.filter(track => track !== null);
  if (!tracks.length) {
    return NextResponse.json({ message: "网易云音乐暂时无法连接，请稍后重试或切换到轻音乐。" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json(tracks, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } });
}
