import { NextResponse } from "next/server";
import { setRoutineChecked } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  setRoutineChecked(Number(body.briefingId), String(body.todoId), Boolean(body.checked));
  return NextResponse.json({ ok: true });
}
