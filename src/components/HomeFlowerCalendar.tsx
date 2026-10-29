"use client";

import { memo, useId, useMemo, useState } from "react";
import Link from "next/link";
import { isNoteCalendarDay, type NoteCalendarEntry } from "@/lib/note-calendar";
import "./HomeFlowerCalendar.css";

export type HomeFlowerCalendarProps = { entries: readonly NoteCalendarEntry[]; today?: string };

function monthShift(month: string, offset: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function dayLabel(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return `${year}年${month}月${date}日`;
}

function Flower({ blue = false }: { blue?: boolean }) {
  return (
    <svg className={`fc-flower${blue ? " fc-flower-blue" : ""}`} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <g className="fc-petals" strokeWidth="1.1">
        {[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cx="20" cy="11.5" rx="6.5" ry="8" transform={`rotate(${angle} 20 20)`} />)}
      </g>
      <circle className="fc-flower-heart" cx="20" cy="20" r="4.6" />
    </svg>
  );
}

function HomeFlowerCalendar({ entries, today }: HomeFlowerCalendarProps) {
  const id = useId();
  const todayKey = isNoteCalendarDay(today) ? today : undefined;
  const { byDay, days } = useMemo(() => {
    const grouped = new Map<string, NoteCalendarEntry[]>();
    for (const entry of entries) {
      if (!isNoteCalendarDay(entry.day)) continue;
      const group = grouped.get(entry.day) ?? [];
      group.push(entry);
      grouped.set(entry.day, group);
    }
    return { byDay: grouped, days: [...grouped.keys()].sort() };
  }, [entries]);
  const [browsedMonth, setBrowsedMonth] = useState<string | null>(null);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const currentMonth = todayKey?.slice(0, 7);
  const latestDay = days.filter(day => !todayKey || day <= todayKey).at(-1);
  const anchorMonth = currentMonth ?? latestDay?.slice(0, 7);
  const earliestMonth = days[0]?.slice(0, 7);
  const minimumMonth = earliestMonth && anchorMonth ? (earliestMonth < anchorMonth ? earliestMonth : anchorMonth) : anchorMonth;
  const month = browsedMonth && minimumMonth && anchorMonth && browsedMonth >= minimumMonth && browsedMonth <= anchorMonth ? browsedMonth : anchorMonth;
  const monthDays = month ? days.filter(day => day.startsWith(`${month}-`)) : [];
  const selectedDay = pickedDay && monthDays.includes(pickedDay) ? pickedDay : monthDays.at(-1);
  const selectedEntries = selectedDay ? byDay.get(selectedDay) ?? [] : [];
  const monthCount = monthDays.reduce((count, day) => count + (byDay.get(day)?.length ?? 0), 0);
  const monthDate = month ? new Date(`${month}-01T00:00:00Z`) : null;
  const leadingDays = monthDate ? (monthDate.getUTCDay() + 6) % 7 : 0;
  const daysInMonth = month ? new Date(`${monthShift(month, 1)}-01T00:00:00Z`).getTime() - monthDate!.getTime() : 0;
  const dayCount = Math.round(daysInMonth / 86400000);
  const cellCount = Math.ceil((leadingDays + dayCount) / 7) * 7;
  const previousMonth = month ? monthShift(month, -1) : null;
  const nextMonth = month ? monthShift(month, 1) : null;

  function showMonth(target: string) {
    setBrowsedMonth(target);
    setPickedDay(null);
  }

  return (
    <section className="fc" aria-labelledby={`${id}-title`}>
      <div className="fc-heading">
        <h3 id={`${id}-title`}><Flower />随笔小花历</h3>
        <span className="fc-caption">写过的日子，会开花</span>
      </div>
      {month ? <>
        <div className="fc-month-nav">
          <div className="fc-month-switch">
            <button className="fc-nav-button" type="button" aria-label="查看上个月" disabled={!previousMonth || !minimumMonth || previousMonth < minimumMonth} onClick={() => previousMonth && showMonth(previousMonth)}>‹</button>
            <span className="fc-month-label" id={`${id}-month`}>{Number(month.slice(0, 4))}年 {Number(month.slice(5))}月</span>
            <button className="fc-nav-button" type="button" aria-label="查看下个月" disabled={!nextMonth || !anchorMonth || nextMonth > anchorMonth} onClick={() => nextMonth && showMonth(nextMonth)}>›</button>
          </div>
          <button className="fc-today-button" type="button" disabled={!currentMonth || month === currentMonth} onClick={() => currentMonth && showMonth(currentMonth)}>本月</button>
        </div>
        <ol className="fc-weekdays" aria-hidden="true">{["一", "二", "三", "四", "五", "六", "日"].map(day => <li key={day}>{day}</li>)}</ol>
        <ol className="fc-days" role="list" aria-labelledby={`${id}-month`}>
          {Array.from({ length: cellCount }, (_, index) => {
            const date = index - leadingDays + 1;
            if (date < 1 || date > dayCount) return <li key={`space-${index}`} className="fc-spacer" aria-hidden="true" />;
            const day = `${month}-${String(date).padStart(2, "0")}`;
            const count = byDay.get(day)?.length ?? 0;
            return <li key={day} className="fc-cell">
              {count ? <button className={`fc-day fc-day-flowered${day === selectedDay ? " fc-day-selected" : ""}`} type="button" aria-label={`${dayLabel(day)}，${count}篇随笔`} aria-pressed={day === selectedDay} aria-current={day === todayKey ? "date" : undefined} aria-controls={`${id}-entries`} onClick={() => setPickedDay(day)}>
                <span className="fc-day-number">{date}</span><Flower blue={date % 2 === 0} />
              </button> : <time className="fc-day fc-day-quiet" dateTime={day} aria-label={`${dayLabel(day)}，没有公开随笔`} aria-current={day === todayKey ? "date" : undefined}><span className="fc-day-number">{date}</span><span className="fc-seed" aria-hidden="true">·</span></time>}
            </li>;
          })}
        </ol>
        <p className="fc-legend"><Flower /><span>有随笔的日子</span><span className="fc-month-total">{monthCount} 篇</span></p>
        <div className="fc-entry-panel" id={`${id}-entries`}>
          <p className="fc-status" aria-live="polite">{selectedDay ? `${dayLabel(selectedDay)} · ${selectedEntries.length} 篇随笔` : days.length ? "这个月还没有公开随笔。" : "还没有公开的随笔。"}</p>
          {selectedDay ? <ul className="fc-entries">{selectedEntries.map(entry => <li key={entry.id} className="fc-entry">
            <Link className="fc-entry-title" href={`/posts/${encodeURIComponent(entry.slug)}`}>{entry.title}<span aria-hidden="true"> ↗</span></Link>
            {entry.excerpt ? <p className="fc-excerpt">{entry.excerpt}</p> : <p className="fc-excerpt fc-excerpt-empty">这篇随笔还没有摘要，点开读一读。</p>}
          </li>)}</ul> : <p className="fc-empty-copy">{latestDay ? <>花会开在写下文字的那天。<button type="button" className="fc-recent-button" onClick={() => { setBrowsedMonth(latestDay.slice(0, 7)); setPickedDay(latestDay); }}>去看最近一朵 · {Number(latestDay.slice(5, 7))}月{Number(latestDay.slice(8))}日 <span aria-hidden="true">↗</span></button></> : "等下一篇公开随笔，给日历添一朵小花。"}</p>}
        </div>
      </> : <p className="fc-loading">{entries.length ? "正在翻开今天的日历…" : "还没有公开的随笔，等文字慢慢开花。"}</p>}
    </section>
  );
}

export default memo(HomeFlowerCalendar);
