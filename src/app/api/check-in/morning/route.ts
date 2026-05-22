import { NextResponse } from "next/server";
import { saveEnergyCheckIn } from "@/lib/db";
import { todayKey } from "@/lib/date";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sleepHours?: number;
    energy?: number;
    stress?: number;
    soreness?: number;
    unexpectedEvents?: string;
    manualEmergency?: boolean;
  };
  const checkIn = saveEnergyCheckIn({
    date: todayKey(),
    sleepHours: clamp(body.sleepHours ?? 7, 0, 14),
    energy: clamp(body.energy ?? 3, 1, 5),
    stress: clamp(body.stress ?? 3, 1, 5),
    soreness: clamp(body.soreness ?? 2, 1, 5),
    unexpectedEvents: body.unexpectedEvents,
    manualEmergency: Boolean(body.manualEmergency),
  });
  return NextResponse.json({ checkIn });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
