import { NextResponse } from "next/server";
import { getTrainingSettings, saveTrainingSettings } from "@/lib/training/db";

export async function GET() {
  return NextResponse.json({ settings: getTrainingSettings() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { equipment?: unknown; defaultEffort?: number; goal?: unknown; trainingAIEnabled?: boolean };
    return NextResponse.json({
      settings: saveTrainingSettings({
        equipment: body.equipment,
        defaultEffort: body.defaultEffort,
        goal: body.goal,
        trainingAIEnabled: body.trainingAIEnabled,
      }),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Einstellungen konnten nicht gespeichert werden." }, { status: 500 });
  }
}
