import { NextResponse } from "next/server";
import { saveEveningTaskStatus } from "@/lib/db";
import { todayKey } from "@/lib/date";
import type { PlanningTask } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    task?: PlanningTask;
    status?: "open" | "done" | "blocked";
    progressPercent?: number;
    nextStep?: string;
    actualBedtime?: string;
  };
  if (!body.task) {
    return NextResponse.json({ error: "task fehlt" }, { status: 400 });
  }
  saveEveningTaskStatus({
    date: todayKey(),
    task: body.task,
    status: body.status ?? "open",
    progressPercent: body.progressPercent,
    nextStep: body.nextStep,
    actualBedtime: body.actualBedtime,
  });
  return NextResponse.json({ ok: true });
}
