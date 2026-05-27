import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { filterExercises } from "@/lib/training/exercises";
import { countProgressionChanges, generateWorkoutPlan } from "@/lib/training/generator";
import { choosePlanType, scoreReadiness } from "@/lib/training/scorer";
import type { HistoryStats, ReadinessContext } from "@/lib/training/types";

function history(overrides: Partial<HistoryStats> = {}): HistoryStats {
  return {
    completedLast7Days: 2,
    completedLast14Days: 4,
    plannedLast14Days: 6,
    skippedLast14Days: 1,
    completionRate: 67,
    daysSinceLastWorkout: 3,
    weeklyVolume: 2,
    recentMuscleGroups: [],
    recentHardMuscles: [],
    lastHardTrainingDays: [],
    comparableAverageIntensity: 5,
    comparableAverageDuration: 30,
    ...overrides,
  };
}

function context(overrides: Partial<Omit<ReadinessContext, "readinessScore" | "readinessBreakdown">> = {}): ReadinessContext {
  const base = {
    date: "2026-05-27",
    motivationScore: 6,
    desiredEffort: 3,
    goal: "muscle" as const,
    equipment: ["bodyweight" as const],
    history: history(),
    ...overrides,
  };
  const readiness = scoreReadiness(base);
  return { ...base, readinessScore: readiness.score, readinessBreakdown: readiness.breakdown };
}

test("starter bei fehlender History", () => {
  assert.equal(choosePlanType(context({ history: history({ completedLast14Days: 0, plannedLast14Days: 0, completionRate: 0 }) })), "starter");
});

test("niedrige Motivation erzeugt low_motivation oder recovery", () => {
  assert.match(choosePlanType(context({ motivationScore: 2 })), /^(low_motivation|recovery)$/);
});

test("hohe Motivation und hohe Completion Rate erzeugt progression", () => {
  assert.equal(choosePlanType(context({ motivationScore: 8, history: history({ completionRate: 90, completedLast7Days: 3, weeklyVolume: 3 }) })), "progression");
});

test("niedrige Completion Rate erzeugt deload", () => {
  assert.equal(choosePlanType(context({ history: history({ completionRate: 35, plannedLast14Days: 6 }) })), "deload");
});

test("lange Pause erzeugt comeback", () => {
  assert.equal(choosePlanType(context({ history: history({ daysSinceLastWorkout: 9, completedLast14Days: 3, plannedLast14Days: 5 }) })), "comeback");
});

test("weeklyVolume >= 5 erzeugt recovery oder deload", () => {
  assert.match(choosePlanType(context({ history: history({ weeklyVolume: 5 }) })), /^(recovery|deload)$/);
});

test("Mindestdauer bleibt bei mindestens 20 Minuten", () => {
  const plan = generateWorkoutPlan(context({ motivationScore: 4 }));
  assert.ok(plan.durationMin >= 20);
});

test("Plan enthaelt Warm-up, Uebungen und Cooldown", () => {
  const plan = generateWorkoutPlan(context());
  assert.ok(plan.warmup.length > 0);
  assert.ok(plan.exercises.length > 0);
  assert.ok(plan.cooldown.length > 0);
});

test("Equipment-Filter funktioniert", () => {
  const bodyweightOnly = filterExercises({ equipment: ["bodyweight"], planType: "normal", maxDifficulty: 5, recentMuscleGroups: [] });
  assert.equal(bodyweightOnly.some((exercise) => exercise.equipment.includes("pullup_bar") || exercise.equipment.includes("treadmill")), false);
});

test("kuerzlich trainierte Muskelgruppen werden vermieden", () => {
  const plan = generateWorkoutPlan(context({ history: history({ recentHardMuscles: [{ muscle: "chest", daysAgo: 1 }, { muscle: "back", daysAgo: 1 }, { muscle: "shoulders", daysAgo: 1 }] }) }));
  assert.equal(plan.exercises.some((exercise) => ["chest", "back", "shoulders"].includes(exercise.muscleGroup)), false);
});

test("Neu-Generierung ist auf maximal 3x pro Tag begrenzt", async () => {
  process.env.DATABASE_PATH = path.join(os.tmpdir(), `dayframe-training-${process.pid}-${Date.now()}.sqlite`);
  const service = await import("@/lib/training/service");

  await service.getOrCreateTodayTrainingPlan(5);
  await service.regenerateTodayTrainingPlan(6);
  await service.regenerateTodayTrainingPlan(7);
  const third = await service.regenerateTodayTrainingPlan(8);
  const fourth = await service.regenerateTodayTrainingPlan(9);

  assert.equal(third.limitReached, false);
  assert.equal(third.regenerationsUsed, 3);
  assert.equal(fourth.limitReached, true);
  assert.equal(fourth.regenerationsRemaining, 0);
});

test("keine extremen Intensitaetswerte", () => {
  const plan = generateWorkoutPlan(context({ motivationScore: 10, history: history({ completionRate: 95, completedLast7Days: 3, weeklyVolume: 3, comparableAverageIntensity: 7 }) }));
  assert.ok(plan.intensity >= 1);
  assert.ok(plan.intensity <= 88);
});

test("fehlende Visuals erzeugen Placeholder", () => {
  const plan = generateWorkoutPlan(context());
  assert.ok([...plan.warmup, ...plan.exercises, ...plan.cooldown].every((exercise) => exercise.visual?.type === "placeholder"));
});

test("Progression erhoeht maximal eine Variable", () => {
  const plan = generateWorkoutPlan(context({ motivationScore: 8, history: history({ completionRate: 90, completedLast7Days: 3, weeklyVolume: 3 }) }));
  assert.equal(plan.type, "progression");
  const progressed = plan.exercises[0];
  const base = filterExercises({ equipment: ["bodyweight"], planType: "progression", maxDifficulty: 5, recentMuscleGroups: [] }).find((exercise) => exercise.id === progressed.id);
  assert.ok(base);
  assert.ok(countProgressionChanges(base, progressed) <= 1);
});

test("keine harte gleiche Muskelgruppe innerhalb von 48 Stunden", () => {
  const plan = generateWorkoutPlan(context({ history: history({ recentHardMuscles: [{ muscle: "legs", daysAgo: 1 }, { muscle: "glutes", daysAgo: 1 }] }) }));
  assert.equal(plan.exercises.some((exercise) => exercise.muscleGroup === "legs" || exercise.muscleGroup === "glutes"), false);
});
