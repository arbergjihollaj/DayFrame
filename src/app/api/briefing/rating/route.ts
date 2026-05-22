import { NextResponse } from "next/server";
import { setDayRating } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  setDayRating(Number(body.briefingId), String(body.rating));
  return NextResponse.json({ ok: true });
}
