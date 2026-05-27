import type { HistoryStats, MuscleGroup, TrainingHistoryEntry } from "@/lib/training/types";

export function summarizeHistory(history: TrainingHistoryEntry[], today: string): HistoryStats {
  const last14 = history.filter((entry) => daysBetween(entry.date, today) < 14);
  const completedLast14Days = last14.filter((entry) => entry.completed).length;
  const skippedLast14Days = last14.filter((entry) => entry.skipped || entry.completionScore === 0).length;
  const completedLast7Days = history.filter((entry) => entry.completed && daysBetween(entry.date, today) < 7).length;
  const plannedLast14Days = last14.filter((entry) => entry.planId !== null || entry.completed || entry.skipped).length;
  const completionRate = plannedLast14Days === 0 ? 0 : Math.round((completedLast14Days / plannedLast14Days) * 100);
  const completedDates = history.filter((entry) => entry.completed).map((entry) => entry.date).sort((a, b) => b.localeCompare(a));
  const daysSinceLastWorkout = completedDates[0] ? daysBetween(completedDates[0], today) : 99;
  const completedLast30 = history.filter((entry) => entry.completed && daysBetween(entry.date, today) < 30);
  const comparable = completedLast30.filter((entry) => entry.completionScore === null || entry.completionScore >= 0.7);
  const recentHardEntries = history.filter((entry) => entry.completed && isHardEntry(entry) && daysBetween(entry.date, today) <= 2);

  return {
    completedLast7Days,
    completedLast14Days,
    plannedLast14Days,
    skippedLast14Days,
    completionRate,
    daysSinceLastWorkout,
    weeklyVolume: completedLast7Days,
    recentMuscleGroups: uniqueMuscles(recentHardEntries.flatMap((entry) => entry.focusMuscles)),
    recentHardMuscles: recentHardEntries.flatMap((entry) =>
      entry.focusMuscles
        .filter((muscle) => muscle !== "mobility")
        .map((muscle) => ({ muscle, daysAgo: daysBetween(entry.date, today) })),
    ),
    lastHardTrainingDays: recentHardEntries.map((entry) => daysBetween(entry.date, today)),
    comparableAverageIntensity: average(comparable.map((entry) => entry.effortActual).filter(isNumber)),
    comparableAverageDuration: average(comparable.map((entry) => entry.durationActual).filter(isNumber)),
  };
}

export function normalizeMuscles(input: unknown): MuscleGroup[] {
  if (!Array.isArray(input)) return [];
  const valid = new Set<MuscleGroup>(["chest", "back", "shoulders", "biceps", "triceps", "core", "legs", "glutes", "calves", "forearms", "mobility"]);
  return input.filter((item): item is MuscleGroup => typeof item === "string" && valid.has(item as MuscleGroup));
}

export function daysBetween(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00Z`).getTime();
  const toDate = new Date(`${to}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((toDate - fromDate) / 86_400_000));
}

function isHardEntry(entry: TrainingHistoryEntry) {
  if (!entry.completed) return false;
  if ((entry.effortActual ?? 0) >= 4) return true;
  if ((entry.durationActual ?? 0) >= 25 && (entry.completionScore ?? 1) >= 0.7) return true;
  return entry.planType === "normal" || entry.planType === "progression";
}

function uniqueMuscles(values: MuscleGroup[]) {
  return values.filter((muscle, index, array) => muscle !== "mobility" && array.indexOf(muscle) === index);
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
