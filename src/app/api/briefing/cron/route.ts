import { NextResponse } from "next/server";
import { generateBriefing } from "@/lib/briefingGenerator";
import { getBriefingByDate, getSettings } from "@/lib/db";
import { todayKey } from "@/lib/date";

export async function GET() {
  const settings = getSettings();
  const now = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  if (now !== settings.generationTime) {
    return NextResponse.json({ ok: true, skipped: "not due", now, generationTime: settings.generationTime });
  }
  if (getBriefingByDate(todayKey())) {
    return NextResponse.json({ ok: true, skipped: "already generated" });
  }
  const briefing = await generateBriefing();
  return NextResponse.json({ ok: true, briefingId: briefing.id });
}
