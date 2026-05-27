import { NextResponse } from "next/server";
import { getOrCreateTodayTrainingPlan, regenerateTodayTrainingPlan } from "@/lib/training/service";

export async function GET() {
  const training = await getOrCreateTodayTrainingPlan();
  return NextResponse.json({ training });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { motivationScore?: number };
  const result = await regenerateTodayTrainingPlan(body.motivationScore);
  return NextResponse.json(result.limitReached ? { ...result, training: result.plan } : { training: result.plan }, { status: result.limitReached ? 429 : 200 });
}
