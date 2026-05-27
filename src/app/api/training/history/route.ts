import { NextResponse } from "next/server";
import { getTrainingHistory } from "@/lib/training/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") ?? 14);
  return NextResponse.json({ history: getTrainingHistory(Number.isFinite(days) ? days : 14) });
}
