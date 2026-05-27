import { exerciseMuscles, exercisePool, filterExercises } from "@/lib/training/exercises";
import { scoreDay } from "@/lib/training/scorer";
import type { Exercise, MuscleGroup, PlanType, ReadinessContext, WorkoutPlan } from "@/lib/training/types";

const titles: Record<PlanType, string> = {
  starter: "Starter Home Strength",
  normal: "Home Strength Aufbau",
  low_motivation: "Machbarer Disziplin-Block",
  recovery: "Erholung und Mobility",
  progression: "Kontrollierter Fortschritt",
  deload: "Leichter Deload",
  comeback: "Comeback Training",
};

const pushMuscles = new Set<MuscleGroup>(["chest", "shoulders", "triceps"]);
const pullMuscles = new Set<MuscleGroup>(["back", "biceps", "forearms"]);
const legMuscles = new Set<MuscleGroup>(["legs", "glutes", "calves"]);

export function generateWorkoutPlan(context: ReadinessContext): WorkoutPlan {
  const { type } = scoreDay(context);
  const maxDifficulty = maxDifficultyFor(context, type);
  const targetMinutes = targetMinutesFor(context, type);
  const recentHard = context.history.recentHardMuscles.map((load) => load.muscle);
  const focusRotation = chooseFocusRotation(context, type);
  let candidates = filterExercises({
    equipment: context.equipment,
    planType: type,
    maxDifficulty,
    recentMuscleGroups: recentHard,
  });

  if (candidates.filter((exercise) => exercise.muscleGroup !== "mobility").length < minimumMainCount(type)) {
    candidates = filterExercises({
      equipment: context.equipment,
      planType: type,
      maxDifficulty,
      recentMuscleGroups: recentHard,
      includeRecent: type === "recovery" || type === "deload",
    });
  }

  const warmup = pickWarmup(context, type);
  const cooldown = pickCooldown(type);
  const selected = pickMainExercises(candidates, focusRotation, context, type).map((exercise, index) => tuneExercise(exercise, type, context, index));
  let plan: WorkoutPlan = {
    type,
    title: titles[type],
    summary: summaryFor(type, context),
    durationMin: estimatePlanMinutes(warmup, selected, cooldown),
    intensity: intensityFor(type, context),
    focusMuscles: focusMuscles(selected),
    warmup,
    exercises: selected,
    cooldown,
  };

  plan = capProgression(plan, context);
  plan = normalizeDuration(plan, targetMinutes);
  if (plan.type !== "recovery" && plan.durationMin < 20) plan = fillToMinimum(plan, context);
  return { ...plan, focusMuscles: focusMuscles(plan.exercises) };
}

export function estimatePlanMinutes(warmup: Exercise[], exercises: Exercise[], cooldown: Exercise[]) {
  return Math.round([...warmup, ...exercises, ...cooldown].reduce((sum, exercise) => sum + exerciseMinutes(exercise), 0));
}

export function countProgressionChanges(base: Exercise, progressed: Exercise) {
  let changes = 0;
  if (progressed.sets > base.sets) changes += 1;
  if ((progressed.restSec ?? 0) < (base.restSec ?? 0)) changes += 1;
  if (progressed.reps && base.reps && progressed.reps !== base.reps) changes += 1;
  if (progressed.durationSec && base.durationSec && progressed.durationSec > base.durationSec) changes += 1;
  if (progressed.difficulty > base.difficulty) changes += 1;
  return changes;
}

function pickWarmup(context: ReadinessContext, type: PlanType) {
  const ids = type === "recovery" && context.equipment.includes("treadmill")
    ? ["treadmill-walk", "joint-mobility"]
    : ["joint-mobility", "march-in-place"];
  return ids.flatMap(findExercise);
}

function pickCooldown(type: PlanType) {
  const ids = type === "recovery" || type === "deload" || type === "low_motivation"
    ? ["cat-cow", "hip-flexor-stretch", "childs-pose"]
    : ["hip-flexor-stretch", "childs-pose"];
  return ids.flatMap(findExercise);
}

function pickMainExercises(candidates: Exercise[], focusRotation: MuscleGroup[], context: ReadinessContext, type: PlanType) {
  if (type === "recovery") {
    return candidates
      .filter((exercise) => exercise.muscleGroup === "mobility" || exercise.id === "treadmill-walk" || exercise.id === "dead-bug" || exercise.id === "dead-hang")
      .slice(0, 4);
  }

  const selected: Exercise[] = [];
  for (const muscle of rotate(focusRotation, deterministicOffset(`${context.date}-${context.history.completedLast14Days}`, focusRotation.length))) {
    const match = candidates.find((exercise) => isMuscleMatch(exercise, muscle) && !selected.some((item) => item.id === exercise.id));
    if (match) selected.push(match);
    if (selected.length >= desiredExerciseCount(type)) break;
  }
  for (const exercise of candidates) {
    if (selected.length >= desiredExerciseCount(type)) break;
    if (exercise.muscleGroup !== "mobility" && !selected.some((item) => item.id === exercise.id)) selected.push(exercise);
  }
  return selected;
}

function chooseFocusRotation(context: ReadinessContext, type: PlanType): MuscleGroup[] {
  const recent = new Set(context.history.recentHardMuscles.map((load) => load.muscle));
  if (type === "low_motivation" || type === "deload" || type === "comeback" || type === "starter") return withoutRecent(["legs", "chest", "core", "glutes", "back"], recent);
  if (recentHas(recent, pushMuscles)) return withoutRecent(["back", "legs", "core", "glutes", "calves"], recent);
  if (recentHas(recent, legMuscles)) return withoutRecent(["chest", "back", "shoulders", "core"], recent);
  if (recentHas(recent, pullMuscles)) return withoutRecent(["legs", "chest", "glutes", "core", "shoulders"], recent);
  return ["chest", "legs", "back", "core", "glutes", "shoulders", "calves"];
}

function tuneExercise(exercise: Exercise, type: PlanType, context: ReadinessContext, index: number): Exercise {
  if (type === "progression" && index === 0 && context.history.recentHardMuscles.length === 0) {
    if (exercise.sets < 4) return { ...exercise, sets: exercise.sets + 1 };
    if (exercise.durationSec) return { ...exercise, durationSec: Math.round(exercise.durationSec * 1.08) };
    return { ...exercise, restSec: Math.max(35, exercise.restSec - 8) };
  }
  if (type === "low_motivation" || type === "deload" || type === "comeback") {
    return { ...exercise, sets: Math.max(1, exercise.sets - 1), restSec: Math.min(105, exercise.restSec + 15) };
  }
  if (type === "starter") {
    return { ...exercise, sets: Math.min(2, exercise.sets), restSec: Math.min(95, exercise.restSec + 10) };
  }
  return exercise;
}

function capProgression(plan: WorkoutPlan, context: ReadinessContext): WorkoutPlan {
  if (plan.type !== "progression") return plan;
  const learnedCap = context.history.comparableAverageDuration ? Math.ceil(context.history.comparableAverageDuration * 1.1) : 42;
  const intensityCap = context.history.comparableAverageIntensity ? Math.ceil(context.history.comparableAverageIntensity * 10 * 1.1) : 82;
  return {
    ...plan,
    durationMin: Math.min(plan.durationMin, learnedCap),
    intensity: Math.min(plan.intensity, intensityCap),
  };
}

function normalizeDuration(plan: WorkoutPlan, targetMinutes: number): WorkoutPlan {
  let exercises = [...plan.exercises];
  let duration = estimatePlanMinutes(plan.warmup, exercises, plan.cooldown);
  while (duration > targetMinutes + 3 && exercises.some((exercise) => exercise.sets > 1)) {
    exercises = exercises.map((exercise, index) => (index === exercises.findIndex((item) => item.sets > 1) ? { ...exercise, sets: exercise.sets - 1 } : exercise));
    duration = estimatePlanMinutes(plan.warmup, exercises, plan.cooldown);
  }
  return { ...plan, exercises, durationMin: duration };
}

function fillToMinimum(plan: WorkoutPlan, context: ReadinessContext): WorkoutPlan {
  const fillers = filterExercises({
    equipment: context.equipment,
    planType: "deload",
    maxDifficulty: 1,
    recentMuscleGroups: [],
    includeRecent: true,
  }).filter((exercise) => exercise.muscleGroup === "mobility" && !plan.cooldown.some((item) => item.id === exercise.id));
  const cooldown = [...plan.cooldown];
  for (const filler of fillers) {
    if (estimatePlanMinutes(plan.warmup, plan.exercises, cooldown) >= 20) break;
    cooldown.push(filler);
  }
  return { ...plan, cooldown, durationMin: Math.max(20, estimatePlanMinutes(plan.warmup, plan.exercises, cooldown)) };
}

function targetMinutesFor(context: ReadinessContext, type: PlanType) {
  const base: Record<PlanType, number> = {
    starter: 24,
    normal: 32,
    low_motivation: 22,
    recovery: 18,
    progression: 36,
    deload: 24,
    comeback: 22,
  };
  const effortAdjustment = (context.desiredEffort - 3) * 3;
  const motivationAdjustment = context.motivationScore >= 8 ? 3 : context.motivationScore <= 4 ? -3 : 0;
  const learnedCap = type === "progression" && context.history.comparableAverageDuration ? Math.ceil(context.history.comparableAverageDuration * 1.1) : 45;
  return Math.max(type === "recovery" ? 14 : 20, Math.min(learnedCap, base[type] + effortAdjustment + motivationAdjustment));
}

function maxDifficultyFor(context: ReadinessContext, type: PlanType) {
  if (type === "recovery") return 1;
  if (type === "starter" || type === "low_motivation" || type === "deload" || type === "comeback") return 2;
  if (type === "progression" && context.motivationScore >= 8 && context.desiredEffort >= 4) return 5;
  return context.motivationScore >= 7 ? 4 : 3;
}

function intensityFor(type: PlanType, context: ReadinessContext) {
  const base: Record<PlanType, number> = {
    starter: 40,
    normal: 58,
    low_motivation: 34,
    recovery: 22,
    progression: 68,
    deload: 32,
    comeback: 36,
  };
  const effort = (context.desiredEffort - 3) * 5;
  const motivation = (context.motivationScore - 5) * 2;
  const recoveryPenalty = context.history.recentHardMuscles.length ? 8 : 0;
  const learnedLimit = context.history.comparableAverageIntensity && type === "progression" ? Math.round(context.history.comparableAverageIntensity * 10 * 1.1) : 84;
  return Math.max(15, Math.min(88, Math.min(learnedLimit, base[type] + effort + motivation - recoveryPenalty)));
}

function desiredExerciseCount(type: PlanType) {
  if (type === "recovery") return 3;
  if (type === "starter" || type === "low_motivation" || type === "deload" || type === "comeback") return 4;
  if (type === "progression") return 6;
  return 5;
}

function minimumMainCount(type: PlanType) {
  return type === "recovery" ? 2 : 3;
}

function focusMuscles(exercises: Exercise[]) {
  const muscles = exercises.flatMap(exerciseMuscles).filter((muscle) => muscle !== "mobility");
  return muscles.filter((muscle, index, array) => array.indexOf(muscle) === index).slice(0, 5);
}

function exerciseMinutes(exercise: Exercise) {
  const active = exercise.durationSec ? exercise.durationSec : exercise.reps ? 42 : 30;
  const rest = Math.max(0, exercise.sets - 1) * exercise.restSec;
  return (exercise.sets * active + rest) / 60;
}

function summaryFor(type: PlanType, context: ReadinessContext) {
  if (type === "starter") return "Ein sauberer Einstieg mit moderatem Volumen und Bodyweight-Fokus.";
  if (type === "recovery") return "Heute zaehlt Erholung: Mobility, leichte Aktivierung und keine harte Doppelbelastung.";
  if (type === "low_motivation") return "Kurz, klar und machbar, damit Disziplin auch an zaehen Tagen klappt.";
  if (type === "progression") return "Eine einzige Progressionsvariable wird vorsichtig erhoeht, weil Konstanz und Readiness passen.";
  if (type === "deload") return "Bewusst leichter, weil die letzten Tage nicht nach mehr Druck verlangen.";
  if (type === "comeback") return "Wiedereinstieg nach Pause mit kontrollierter Intensitaet.";
  return `Ausgewogener Aufbauplan bei ${context.readinessScore}/100 Readiness.`;
}

function findExercise(id: string) {
  const exercise = exercisePool.find((item) => item.id === id);
  return exercise ? [exercise] : [];
}

function deterministicOffset(seed: string, modulo: number) {
  const value = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return modulo <= 0 ? 0 : value % modulo;
}

function rotate<T>(items: T[], offset: number) {
  return items.length ? [...items.slice(offset), ...items.slice(0, offset)] : items;
}

function withoutRecent(muscles: readonly MuscleGroup[], recent: Set<MuscleGroup>): MuscleGroup[] {
  const filtered = muscles.filter((muscle) => !recent.has(muscle));
  return filtered.length ? filtered : ["mobility"];
}

function recentHas(recent: Set<MuscleGroup>, group: Set<MuscleGroup>) {
  return Array.from(group).some((muscle) => recent.has(muscle));
}

function isMuscleMatch(exercise: Exercise, muscle: MuscleGroup) {
  return exercise.muscleGroup === muscle || Boolean(exercise.secondaryMuscles?.includes(muscle));
}
