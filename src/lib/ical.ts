import ical from "node-ical";
import { addDays, toDateKey } from "@/lib/date";
import type { CalendarEvent, WeekLoadItem } from "@/lib/types";

type CalendarEntry = {
  type?: string;
  uid?: string;
  summary?: string;
  start?: Date;
  end?: Date;
};

const visibleMarkers = new Set(["Ab", "F"]);
const familyMarkerPattern = /^\s*\[(Ab|Ad|V|M|F)\]\s*/;

function isTimedEvent(entry: unknown): entry is CalendarEntry & { start: Date; end: Date } {
  const event = entry as CalendarEntry | undefined;
  return Boolean(event && event.type === "VEVENT" && event.start instanceof Date && event.end instanceof Date);
}

export function normalizeCalendarTitle(summary?: string) {
  const title = String(summary ?? "Termin").trim();
  const match = title.match(familyMarkerPattern);
  if (!match) return null;
  if (!visibleMarkers.has(match[1])) return null;
  return title.replace(familyMarkerPattern, "").trim() || "Termin";
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
      .filter((entry) => entry.start >= start && entry.start < end)
      .map((entry) => {
        const title = normalizeCalendarTitle(entry.summary);
        if (!title) return null;
        return {
          id: String(entry.uid ?? `${entry.summary}-${entry.start?.toISOString()}`),
          title,
          date: toDateKey(entry.start as Date),
          startTime: timePart(entry.start as Date),
          endTime: timePart(entry.end as Date),
        };
      })
      .filter((event): event is CalendarEvent => Boolean(event))
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
