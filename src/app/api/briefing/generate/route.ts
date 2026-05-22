import { NextResponse } from "next/server";
import { generateBriefing } from "@/lib/briefingGenerator";
import { getRoutineStatuses } from "@/lib/db";

export async function POST() {
  try {
    const briefing = await generateBriefing();
    return NextResponse.json({ briefing, statuses: getRoutineStatuses(briefing.id) });
  } catch {
    return NextResponse.json(
      { error: "Briefing konnte gerade nicht erstellt werden. Bitte pruefe spaeter Einstellungen und .env." },
      { status: 500 },
    );
  }
}
