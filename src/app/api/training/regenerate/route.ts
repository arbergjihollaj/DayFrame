import { NextResponse } from "next/server";
import { regenerateTodayTrainingPlan } from "@/lib/training/service";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { motivationScore?: number };
    const result = await regenerateTodayTrainingPlan(body.motivationScore);
    return NextResponse.json(result, { status: result.limitReached ? 429 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Training konnte nicht neu generiert werden." }, { status: 500 });
  }
}
