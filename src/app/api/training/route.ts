import { NextResponse } from "next/server";
import { getSettings, getTrainingPlanByDate, saveTrainingPlan } from "@/lib/db";
import { todayKey } from "@/lib/date";
import { fallbackTrainingPlan, generateTrainingWithGemini } from "@/lib/training";

async function buildPlan(force = false) {
  const date = todayKey();
  const difficulty = getSettings().trainingDifficulty;
  const cached = getTrainingPlanByDate(date);
  if (cached && cached.difficulty === difficulty && !force) return cached;

  try {
    const generated = await generateTrainingWithGemini(date, difficulty);
    if (generated) {
      return saveTrainingPlan(date, generated, "gemini", difficulty);
    }
    return saveTrainingPlan(date, fallbackTrainingPlan(difficulty), "fallback", difficulty, "Gemini ist nicht konfiguriert oder nicht erreichbar.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini konnte keinen validen Trainingsplan liefern.";
    return saveTrainingPlan(date, fallbackTrainingPlan(difficulty), "fallback", difficulty, message);
  }
}

export async function GET() {
  const training = await buildPlan(false);
  return NextResponse.json({ training });
}

export async function POST() {
  const training = await buildPlan(true);
  return NextResponse.json({ training });
}
