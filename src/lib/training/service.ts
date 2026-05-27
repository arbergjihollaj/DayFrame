import { todayKey } from "@/lib/date";
import { maybeGenerateWithAI } from "@/lib/training/aiAdapter";
import {
  countPlanVersions,
  defaultMotivationForDate,
  getActiveTrainingPlan,
  getHistoryStats,
  getTrainingSettings,
  saveNewTrainingPlan,
} from "@/lib/training/db";
import { generateWorkoutPlan } from "@/lib/training/generator";
import { scoreReadiness } from "@/lib/training/scorer";
import type { ReadinessContext, TrainingPlanRecord } from "@/lib/training/types";

export const maxDailyRegenerations = 3;

export async function getOrCreateTodayTrainingPlan(motivationScore?: number) {
  const date = todayKey();
  const active = getActiveTrainingPlan(date);
  if (active) return withMeta(active);
  return withMeta(await createTrainingPlanForDate(date, motivationScore));
}

export async function regenerateTodayTrainingPlan(motivationScore?: number) {
  const date = todayKey();
  const versions = countPlanVersions(date);
  if (versions >= maxDailyRegenerations + 1) {
    const active = getActiveTrainingPlan(date);
    return {
      plan: active ? withMeta(active) : null,
      limitReached: true,
      regenerationsUsed: Math.max(0, versions - 1),
      regenerationsRemaining: 0,
    };
  }
  const plan = await createTrainingPlanForDate(date, motivationScore);
  const totalVersions = countPlanVersions(date);
  const used = Math.max(0, totalVersions - 1);
  return {
    plan: withMeta(plan),
    limitReached: false,
    regenerationsUsed: used,
    regenerationsRemaining: Math.max(0, maxDailyRegenerations - used),
  };
}

export async function createTrainingPlanForDate(date: string, motivationScore?: number) {
  const context = buildReadinessContext(date, motivationScore);
  const settings = getTrainingSettings();
  const aiPlan = settings.trainingAIEnabled ? await maybeGenerateWithAI(context) : null;
  const plan = aiPlan ?? generateWorkoutPlan(context);
  return saveNewTrainingPlan({
    date,
    plan,
    motivationScore: context.motivationScore,
    readinessScore: context.readinessScore,
  });
}

export function buildReadinessContext(date: string, motivationScore?: number): ReadinessContext {
  const settings = getTrainingSettings();
  const history = getHistoryStats(date);
  const base = {
    date,
    motivationScore: clampMotivation(motivationScore ?? defaultMotivationForDate(date)),
    desiredEffort: clampDesiredEffort(settings.defaultEffort),
    goal: settings.goal,
    equipment: settings.equipment,
    history,
  };
  const readiness = scoreReadiness(base);
  return {
    ...base,
    readinessScore: readiness.score,
    readinessBreakdown: readiness.breakdown,
  };
}

function withMeta(plan: TrainingPlanRecord) {
  const versions = countPlanVersions(plan.date);
  const regenerationsUsed = Math.max(0, versions - 1);
  return {
    ...plan,
    regenerationsUsed,
    regenerationsRemaining: Math.max(0, maxDailyRegenerations - regenerationsUsed),
    regenerationLimit: maxDailyRegenerations,
  };
}

function clampMotivation(value: number) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function clampDesiredEffort(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}
