import { NextResponse } from "next/server";
import { getBriefingByDate } from "@/lib/db";
import { todayKey } from "@/lib/date";

export async function GET() {
  return NextResponse.json({ news: getBriefingByDate(todayKey())?.news ?? [] });
}
