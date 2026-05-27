import { NextResponse } from "next/server";
import { getOrCreateTodayTrainingPlan } from "@/lib/training/service";

export async function GET() {
  try {
    const training = await getOrCreateTodayTrainingPlan();
    return NextResponse.json({ training });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Training konnte nicht geladen werden." }, { status: 500 });
  }
}
