import { NextResponse } from "next/server";
import { getBriefingByDate, getDailyContext, getEnergyCheckIn, getRecentBriefings, getRoutineStatuses } from "@/lib/db";
import { todayKey } from "@/lib/date";

export async function GET() {
  const briefing = getBriefingByDate(todayKey());
  const statuses = briefing ? getRoutineStatuses(briefing.id) : [];
  const dailyContext = getDailyContext(todayKey());
  const energyCheckIn = getEnergyCheckIn(todayKey());
  const history = getRecentBriefings(7).map((item) => ({
    id: item.id,
    date: item.date,
    dayRating: item.dayRating,
  }));
  return NextResponse.json({ briefing, statuses, history, dailyContext, energyCheckIn });
}
