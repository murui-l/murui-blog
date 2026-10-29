export const HOME_OPENED_AT = Date.parse("2026-09-14T00:00:00+08:00");

export const homeFooter = {
  links: [
    { kind: "link", label: "生活随笔", href: "/notes" },
    { kind: "link", label: "照片墙", href: "/gallery" },
    { kind: "link", label: "提瓦特", href: "/#home-teyvat-map" },
    { kind: "link", label: "文章归档", href: "/archive" },
    { kind: "link", label: "关于小窝", href: "/about" },
    { kind: "link", label: "成长记", href: "/changelog" },
    { kind: "link", label: "小窝电台", href: "/#home-collection-title" },
    { kind: "book", label: "翻页回忆册" },
    { kind: "search", label: "小窝寻物盒" },
    { kind: "external", label: "GitHub", href: "https://github.com/murui-l" },
    { kind: "external", label: "Bilibili", href: "https://space.bilibili.com/406213108" },
    { kind: "rss", label: "RSS 订阅" },
    { kind: "link", label: "写作入口", href: "/write" },
  ],
} as const;

export type FooterUptime = { days: number; hours: number; minutes: number; seconds: number };

export function getFooterUptime(now: number | null): FooterUptime | null {
  if (now === null || !Number.isFinite(now) || now < HOME_OPENED_AT) return null;
  const elapsed = Math.floor((now - HOME_OPENED_AT) / 1000);
  return {
    days: Math.floor(elapsed / 86400),
    hours: Math.floor(elapsed / 3600) % 24,
    minutes: Math.floor(elapsed / 60) % 60,
    seconds: elapsed % 60,
  };
}

export function formatFooterUptime(uptime: FooterUptime | null) {
  if (!uptime) return "— 天 —:—:—";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${uptime.days} 天 ${pad(uptime.hours)}:${pad(uptime.minutes)}:${pad(uptime.seconds)}`;
}

export function formatLightTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const remainder = total % 60;
  return `${hours} 时 ${String(minutes).padStart(2, "0")} 分 ${String(remainder).padStart(2, "0")} 秒`;
}
