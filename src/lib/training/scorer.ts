import type { PlanScore, PlanType, ReadinessBreakdown, ReadinessContext } from "@/lib/training/types";

export function scoreReadiness(context: Omit<ReadinessContext, "readinessScore" | "readinessBreakdown">): { score: number; breakdown: ReadinessBreakdown } {
  const breakdown: ReadinessBreakdown = {
    motivation: context.motivationScore * 10,
    recovery: recoveryScore(context),
    consistency: consistencyScore(context),
    daysSinceLastWorkout: daysSinceLastWorkoutScore(context.history.daysSinceLastWorkout),
    weeklyVolume: weeklyVolumeScore(context.history.weeklyVolume),
  };
  const score =
    breakdown.motivation * 0.25 +
    breakdown.recovery * 0.25 +
    breakdown.consistency * 0.25 +
    breakdown.daysSinceLastWorkout * 0.15 +
    breakdown.weeklyVolume * 0.1;

  return { score: clamp(Math.round(score), 0, 100), breakdown };
}

export function scoreDay(context: ReadinessContext): PlanScore {
  return { readinessScore: context.readinessScore, type: choosePlanType(context) };
}

export function choosePlanType(context: ReadinessContext): PlanType {
  const { history, motivationScore } = context;
  const hasLittleHistory = history.plannedLast14Days < 2 && history.completedLast14Days < 2;
  const hasGoodRecovery = history.recentHardMuscles.length === 0 && context.readinessBreakdown.recovery >= 70;

  if (motivationScore <= 2) return history.recentHardMuscles.length > 0 || history.weeklyVolume >= 3 ? "recovery" : "low_motivation";
  if (history.daysSinceLastWorkout >= 7 && !hasLittleHistory) return "comeback";
  if (history.weeklyVolume >= 5) return history.completionRate >= 70 ? "recovery" : "deload";
  if (history.completionRate <= 40 && history.plannedLast14Days >= 3) return "deload";
  if (motivationScore <= 4) return "low_motivation";
  if (hasLittleHistory) return "starter";
  if (history.completedLast7Days <= 1 && history.completionRate < 65) return "comeback";
  if (history.completionRate >= 80 && motivationScore >= 7 && hasGoodRecovery && history.weeklyVolume >= 3 && history.weeklyVolume <= 4) return "progression";
  if (history.recentHardMuscles.length >= 5 || (history.weeklyVolume >= 4 && context.readinessScore < 70)) return "recovery";
  return "normal";
}

function recoveryScore(context: Omit<ReadinessContext, "readinessScore" | "readinessBreakdown">) {
  const recentHardPenalty = context.history.recentHardMuscles.reduce((sum, load) => sum + (load.daysAgo === 0 ? 34 : load.daysAgo === 1 ? 24 : 12), 0);
  const hardDayPenalty = context.history.lastHardTrainingDays.length >= 2 ? 18 : 0;
  return clamp(100 - recentHardPenalty - hardDayPenalty, 0, 100);
}

function consistencyScore(context: Omit<ReadinessContext, "readinessScore" | "readinessBreakdown">) {
  if (context.history.plannedLast14Days === 0) return 55;
  const skipPenalty = context.history.skippedLast14Days * 6;
  return clamp(context.history.completionRate - skipPenalty + Math.min(10, context.history.completedLast14Days), 0, 100);
}

function daysSinceLastWorkoutScore(days: number) {
  if (days <= 0) return 45;
  if (days === 1) return 75;
  if (days <= 3) return 100;
  if (days <= 6) return 75;
  if (days <= 10) return 45;
  return 30;
}

function weeklyVolumeScore(volume: number) {
  if (volume <= 1) return 72;
  if (volume <= 3) return 100;
  if (volume === 4) return 78;
  if (volume === 5) return 42;
  return 22;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
