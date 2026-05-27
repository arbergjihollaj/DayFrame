import { NextResponse } from "next/server";
import { completeTrainingPlan } from "@/lib/training/db";

type CompleteBody = {
  planId?: number;
  completed?: boolean;
  checkedExercises?: { exerciseId: string; setIndex?: number | null; checked: boolean }[];
  effortActual?: number | null;
  durationActual?: number | null;
  notes?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CompleteBody;
    if (!body.planId) return NextResponse.json({ error: "planId fehlt." }, { status: 400 });
    const training = completeTrainingPlan({
      planId: body.planId,
      completed: Boolean(body.completed),
      checkedExercises: Array.isArray(body.checkedExercises) ? body.checkedExercises : [],
      effortActual: body.effortActual ?? null,
      durationActual: body.durationActual ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json({ training });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Training konnte nicht gespeichert werden." }, { status: 500 });
  }
}
