import { NextResponse } from "next/server";
import { getDailyContext, saveDailyContext } from "@/lib/db";
import { todayKey } from "@/lib/date";

export async function GET() {
  return NextResponse.json({ dailyContext: getDailyContext(todayKey()) });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body.goesToUniversity !== "boolean") {
    return NextResponse.json({ error: "goesToUniversity must be boolean" }, { status: 400 });
  }
  return NextResponse.json({ dailyContext: saveDailyContext(todayKey(), body.goesToUniversity) });
}
