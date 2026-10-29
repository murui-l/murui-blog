import { homeProfile } from "./home-profile";

export type HomeDay = { key: string; date: string; time: string; iso: string };
export type HistoryEntry = { year: number; title: string; summary: string; source: string };
export type HistoryMonth = Record<string, HistoryEntry>;
export const historySeenKey = "murui-home-history-seen";
const dateFormat = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric", weekday: "long" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

export function getHomeDay(now = new Date()): HomeDay {
  return { key: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10), date: dateFormat.format(now), time: timeFormat.format(now), iso: now.toISOString() };
}

export function dailyMood(key: string) {
  let hash = 2166136261;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return homeProfile.moods[(hash >>> 0) % homeProfile.moods.length];
}

export function validHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as HistoryEntry;
  return Number.isInteger(entry.year) && entry.year > 0 && entry.year <= 2026
    && typeof entry.title === "string" && entry.title.length > 0 && entry.title.length < 160
    && typeof entry.summary === "string" && entry.summary.length > 0 && entry.summary.length < 240
    && typeof entry.source === "string" && /^https:\/\/(?:baike\.baidu\.com|en\.wikipedia\.org|www\.nasa\.gov|science\.nasa\.gov|newsroom\.ucla\.edu|www\.paddington\.com|tezukaosamu\.net)\//.test(entry.source);
}
