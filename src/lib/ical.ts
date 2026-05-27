import ical from "node-ical";
import { addDays, toDateKey } from "@/lib/date";
import type { CalendarEvent, WeekLoadItem } from "@/lib/types";

type CalendarEntry = {
  type?: string;
  uid?: string;
  summary?: string;
  start?: Date & { dateOnly?: true };
  end?: Date & { dateOnly?: true };
  datetype?: string;
};

const visibleMarkers = new Set(["Ab", "F"]);
const familyMarkerPattern = /^\s*\[(Ab|Ad|V|M|F)\]\s*/;
const scheduleBlockingPattern = /\b(urlaub|ferien|frei|vacation|holiday)\b/i;

function isTimedEvent(entry: unknown): entry is CalendarEntry & { start: Date; end: Date } {
  const event = entry as CalendarEntry | undefined;
  return Boolean(event && event.type === "VEVENT" && event.start instanceof Date && event.end instanceof Date);
}

export function normalizeCalendarTitle(summary?: string) {
  const title = String(summary ?? "Termin").trim();
  const match = title.match(familyMarkerPattern);
  if (!match) return scheduleBlockingPattern.test(title) ? title : null;
  if (!visibleMarkers.has(match[1]) && !scheduleBlockingPattern.test(title)) return null;
  return title.replace(familyMarkerPattern, "").trim() || "Termin";
}

function isScheduleBlockingEvent(title: string) {
  return scheduleBlockingPattern.test(title);
}

function isAllDayEvent(entry: CalendarEntry & { start: Date; end: Date }) {
  const durationMs = entry.end.getTime() - entry.start.getTime();
  return entry.datetype === "date" || Boolean(entry.start.dateOnly) || (durationMs >= 23 * 60 * 60 * 1000 && timePart(entry.start) === timePart(entry.end));
}

function timePart(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function fetchCalendarEvents(icalUrl: string) {
  if (!icalUrl) {
    return { events: [] as CalendarEvent[], error: "Verbinde deinen iCal-Link, um Termine und Wochenauslastung zu nutzen." };
  }
  try {
    const data = await ical.async.fromURL(icalUrl);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 8);
    const values: unknown[] = Object.values(data);
    const events = values
      .filter(isTimedEvent)
      .filter((entry) => entry.start < end && entry.end > start)
      .flatMap((entry) => {
        const title = normalizeCalendarTitle(entry.summary);
        if (!title) return [];
        const allDay = isAllDayEvent(entry);
        const firstDay = entry.start > start ? entry.start : start;
        const lastDay = entry.end < end ? entry.end : end;
        const days = Math.max(1, Math.ceil((lastDay.getTime() - firstDay.getTime()) / 86_400_000));
        return Array.from({ length: days }).map((_, index) => {
          const day = addDays(firstDay, index);
          const date = toDateKey(day);
          return {
            id: String(`${entry.uid ?? `${entry.summary}-${entry.start.toISOString()}`}-${date}`),
            title,
            date,
            startTime: allDay || index > 0 ? "00:00" : timePart(entry.start),
            endTime: allDay || index < days - 1 ? "23:59" : timePart(entry.end),
            isAllDay: allDay,
            blocksSchedule: isScheduleBlockingEvent(title),
          };
        });
      })
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
    return { events, error: null };
  } catch {
    return { events: [] as CalendarEvent[], error: "Kalender konnte gerade nicht geladen werden. Dein Tagesplan funktioniert trotzdem." };
  }
}

export function buildWeekLoad(events: CalendarEvent[]): WeekLoadItem[] {
  const today = new Date();
  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(today, index);
    const key = toDateKey(date);
    const count = events.filter((event) => event.date === key).length;
    return {
      date: key,
      label: new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "short" }).format(date),
      load: Math.min(4, count),
      isToday: index === 0,
    };
  });
}
