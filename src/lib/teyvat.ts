import media from "./teyvat-media.json";
import music from "./teyvat-music.json";
import type { MusicTrack } from "./music";

export type TeyvatImage = { src: string; width: number; height: number; source: string; original: string };
export type TeyvatDestination = {
  slug: string; name: string; english: string; color: string; deep: string;
  kind: "nation" | "region" | "moon"; parentSlug?: string;
  point: readonly [number, number] | null; crest: TeyvatImage; cover: TeyvatImage;
  scenes: TeyvatImage[]; tracks: MusicTrack[];
};
export const teyvatMap = { src: "/images/artworks/teyvat-map-transparent.webp?v=57eeb81a", preview: "/images/artworks/teyvat-map-preview.webp", width: 2702, height: 2295 };
export const homeTeyvatHref = "/#home-teyvat-map";
const definitions = [
  ["mondstadt", "蒙德", "MONDSTADT", "#b4dbcc", "#223e38", .765, .475],
  ["liyue", "璃月", "LIYUE", "#e4c48b", "#453526", .700, .625],
  ["inazuma", "稻妻", "INAZUMA", "#d1b8e8", "#39294d", .875, .820],
  ["sumeru", "须弥", "SUMERU", "#c6d99a", "#303e2a", .570, .650],
  ["fontaine", "枫丹", "FONTAINE", "#b5d7ee", "#22394e", .550, .412],
  ["natlan", "纳塔", "NATLAN", "#edb48e", "#4a302a", .285, .745],
  ["snezhnaya", "至冬", "SNEZHNAYA", "#cfdfed", "#283947", .405, .135],
  ["nod-krai", "挪德卡莱", "NOD-KRAI", "#b6e4d9", "#21383d", .270, .435],
  ["frostmoon", "霜月", "FROST MOON", "#c8dfef", "#1c2b43", null, null],
] as const;

export const teyvatDestinations: TeyvatDestination[] = definitions.map(([slug, name, english, color, deep, x, y]) => {
  const image = (kind: string) => media.find(item => item.nation === slug && item.kind === kind)!;
  return { slug, name, english, color, deep, kind: slug === "frostmoon" ? "moon" : slug === "nod-krai" ? "region" : "nation", ...(slug === "nod-krai" ? { parentSlug: "snezhnaya" } : {}), point: x === null || y === null ? null : [x, y], crest: image("crest"), cover: image("cover"),
    scenes: [1, 2, 3].map(index => image(`scene-${index}`)),
    tracks: music.filter(track => track.nation === slug).map(track => ({ ...track, provider: "netease" })),
  };
});
export const teyvatNations = teyvatDestinations.filter(destination => destination.kind === "nation");
export function teyvatDestination(slug: string) { return teyvatDestinations.find(destination => destination.slug === slug); }
export function destinationFromPath(path: string) { return /^\/teyvat\/[^/]+\/?$/.test(path) ? teyvatDestination(path.split("/")[2]) : undefined; }
export function isTeyvatPath(path: string) { return path === "/teyvat" || Boolean(destinationFromPath(path)); }
