import { db, getEnergyCheckIn } from "@/lib/db";
import { normalizeMuscles, summarizeHistory } from "@/lib/training/history";
import { normalizeExerciseVisual } from "@/lib/training/visuals";
import type {
  HistoryStats,
  MuscleGroup,
  PlanType,
  TrainingGoal,
  TrainingEquipment,
  TrainingHistoryEntry,
  TrainingPlanRecord,
  TrainingSettings,
  WorkoutPlan,
} from "@/lib/training/types";

type PlanRow = {
  id: number;
  date: string;
  version: number;
  is_active: number;
  plan_type: PlanType;
  plan_json: string;
  motivation_score: number | null;
  readiness_score: number | null;
  intensity: number;
  duration_min: number;
  focus_muscles_json: string;
  generated_at: string;
  completed_at: string | null;
  completion_score: number | null;
};

type HistoryRow = {
  id: number;
  date: string;
  plan_id: number | null;
  plan_type: string | null;
  completed: number;
  skipped: number;
  effort_actual: number | null;
  duration_actual: number | null;
  completion_score: number | null;
  focus_muscles_json: string | null;
  notes: string | null;
  created_at: string;
};

export function ensureTrainingSchema() {
  const columns = db.prepare("PRAGMA table_info(training_plans)").all() as { name: string }[];
  if (columns.length && !columns.some((column) => column.name === "version")) {
    migrateLegacyTrainingPlans();
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS training_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      equipment TEXT NOT NULL,
      default_effort INTEGER NOT NULL DEFAULT 3,
      goal TEXT NOT NULL DEFAULT 'muscle',
      training_ai_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS training_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      plan_type TEXT NOT NULL,
      plan_json TEXT NOT NULL,
      motivation_score INTEGER,
      readiness_score INTEGER,
      intensity INTEGER NOT NULL,
      duration_min INTEGER NOT NULL,
      focus_muscles_json TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      completed_at TEXT,
      completion_score REAL,
      UNIQUE(date, version)
    );
    CREATE TABLE IF NOT EXISTS training_exercise_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      exercise_id TEXT NOT NULL,
      set_index INTEGER,
      checked INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE(plan_id, exercise_id, set_index)
    );
    CREATE TABLE IF NOT EXISTS training_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      plan_id INTEGER,
      plan_type TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      effort_actual INTEGER,
      duration_actual INTEGER,
      completion_score REAL,
      focus_muscles_json TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);
  addColumnIfMissing("training_plans", "readiness_score", "INTEGER");
}

export function getTrainingSettings(): TrainingSettings {
  ensureTrainingSchema();
  const row = db.prepare("SELECT * FROM training_settings WHERE id=1").get() as
    | { equipment: string; default_effort: number; goal: TrainingGoal; training_ai_enabled: number; created_at: string; updated_at: string }
    | undefined;
  if (row) return parseSettings(row);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO training_settings (id, equipment, default_effort, goal, training_ai_enabled, created_at, updated_at)
    VALUES (1, ?, 3, 'muscle', 0, ?, ?)
  `).run(JSON.stringify(["bodyweight"]), now, now);
  return getTrainingSettings();
}

export function saveTrainingSettings(input: { equipment?: unknown; defaultEffort?: number; goal?: unknown; trainingAIEnabled?: boolean }) {
  const current = getTrainingSettings();
  const now = new Date().toISOString();
  const equipment = sanitizeEquipment(input.equipment ?? current.equipment);
  const defaultEffort = clampInt(input.defaultEffort ?? current.defaultEffort, 1, 5);
  const goal = sanitizeGoal(input.goal ?? current.goal);
  const trainingAIEnabled = input.trainingAIEnabled ?? current.trainingAIEnabled;
  db.prepare(`
    INSERT INTO training_settings (id, equipment, default_effort, goal, training_ai_enabled, created_at, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      equipment=excluded.equipment,
      default_effort=excluded.default_effort,
      goal=excluded.goal,
      training_ai_enabled=excluded.training_ai_enabled,
      updated_at=excluded.updated_at
  `).run(JSON.stringify(equipment), defaultEffort, goal, trainingAIEnabled ? 1 : 0, current.createdAt, now);
  return getTrainingSettings();
}

export function getActiveTrainingPlan(date: string) {
  ensureTrainingSchema();
  const row = db.prepare("SELECT * FROM training_plans WHERE date=? AND is_active=1 ORDER BY version DESC LIMIT 1").get(date) as PlanRow | undefined;
  return row ? parsePlanRow(row) : null;
}

export function getPlanById(planId: number) {
  ensureTrainingSchema();
  const row = db.prepare("SELECT * FROM training_plans WHERE id=?").get(planId) as PlanRow | undefined;
  return row ? parsePlanRow(row) : null;
}

export function saveNewTrainingPlan(input: {
  date: string;
  plan: WorkoutPlan;
  motivationScore: number;
  readinessScore: number;
}) {
  ensureTrainingSchema();
  const now = new Date().toISOString();
  const version = nextVersion(input.date);
  db.prepare("UPDATE training_plans SET is_active=0 WHERE date=?").run(input.date);
  db.prepare(`
    INSERT INTO training_plans
      (date, version, is_active, plan_type, plan_json, motivation_score, readiness_score, intensity, duration_min, focus_muscles_json, generated_at)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.date,
    version,
    input.plan.type,
    JSON.stringify({ ...input.plan, id: undefined }),
    input.motivationScore,
    input.readinessScore,
    input.plan.intensity,
    input.plan.durationMin,
    JSON.stringify(input.plan.focusMuscles),
    now,
  );
  const saved = getActiveTrainingPlan(input.date);
  if (!saved) throw new Error("Training plan could not be saved");
  insertPlannedHistory(saved);
  return saved;
}

export function countPlanVersions(date: string) {
  ensureTrainingSchema();
  const row = db.prepare("SELECT COUNT(*) as count FROM training_plans WHERE date=?").get(date) as { count: number };
  return Number(row.count);
}

export function getTrainingHistory(days = 14): TrainingHistoryEntry[] {
  ensureTrainingSchema();
  const limit = clampInt(days, 1, 90);
  const rows = db.prepare("SELECT * FROM training_history ORDER BY date DESC, id DESC LIMIT ?").all(limit) as HistoryRow[];
  return rows.map(parseHistoryRow);
}

export function getHistoryStats(today: string): HistoryStats {
  return summarizeHistory(getTrainingHistory(60), today);
}

export function completeTrainingPlan(input: {
  planId: number;
  completed: boolean;
  checkedExercises: { exerciseId: string; setIndex?: number | null; checked: boolean }[];
  effortActual?: number | null;
  durationActual?: number | null;
  notes?: string | null;
}) {
  ensureTrainingSchema();
  const plan = getPlanById(input.planId);
  if (!plan) throw new Error("Training plan not found");
  const now = new Date().toISOString();
  const completionScore = calculateCompletionScore(plan.plan, input.checkedExercises, input.completed);
  const updateCheck = db.prepare(`
    INSERT INTO training_exercise_checks (plan_id, exercise_id, set_index, checked, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(plan_id, exercise_id, set_index) DO UPDATE SET checked=excluded.checked, updated_at=excluded.updated_at
  `);
  for (const check of input.checkedExercises) {
    updateCheck.run(input.planId, check.exerciseId, check.setIndex ?? null, check.checked ? 1 : 0, now);
  }
  db.prepare("UPDATE training_plans SET completed_at=?, completion_score=? WHERE id=?").run(input.completed ? now : null, completionScore, input.planId);
  db.prepare(`
    INSERT INTO training_history
      (date, plan_id, plan_type, completed, skipped, effort_actual, duration_actual, completion_score, focus_muscles_json, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    plan.date,
    plan.id,
    plan.plan.type,
    input.completed ? 1 : 0,
    input.completed ? 0 : 1,
    input.effortActual ?? null,
    input.durationActual ?? null,
    completionScore,
    JSON.stringify(plan.focusMuscles),
    input.notes ?? null,
    now,
  );
  return getPlanById(input.planId);
}

export function defaultMotivationForDate(date: string) {
  const checkIn = getEnergyCheckIn(date);
  return checkIn?.energy ? clampInt(checkIn.energy, 1, 10) : 5;
}

function migrateLegacyTrainingPlans() {
  const legacyName = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='training_plans_legacy'").get()
    ? `training_plans_legacy_${Date.now()}`
    : "training_plans_legacy";
  db.exec(`ALTER TABLE training_plans RENAME TO ${legacyName}`);
  ensureTrainingSchema();
  {
    const legacyRows = db.prepare(`SELECT * FROM ${legacyName}`).all() as {
      date: string;
      generatedAt?: string;
      planJson: string;
    }[];
    const insert = db.prepare(`
      INSERT OR IGNORE INTO training_plans
        (date, version, is_active, plan_type, plan_json, motivation_score, readiness_score, intensity, duration_min, focus_muscles_json, generated_at)
      VALUES (?, 1, 1, ?, ?, NULL, 50, ?, ?, ?, ?)
    `);
    for (const row of legacyRows) {
      const parsed = parseLegacyPlan(row.planJson);
      insert.run(row.date, parsed.type, row.planJson, parsed.intensity, parsed.durationMin, JSON.stringify(parsed.focusMuscles), row.generatedAt ?? new Date().toISOString());
    }
  }
}

function insertPlannedHistory(plan: TrainingPlanRecord) {
  db.prepare(`
    INSERT INTO training_history (date, plan_id, plan_type, completed, skipped, focus_muscles_json, created_at)
    VALUES (?, ?, ?, 0, 0, ?, ?)
  `).run(plan.date, plan.id, plan.plan.type, JSON.stringify(plan.focusMuscles), plan.generatedAt);
}

function nextVersion(date: string) {
  const row = db.prepare("SELECT COALESCE(MAX(version), 0) + 1 as version FROM training_plans WHERE date=?").get(date) as { version: number };
  return Number(row.version);
}

function parseSettings(row: { equipment: string; default_effort: number; goal: TrainingGoal; training_ai_enabled: number; created_at: string; updated_at: string }): TrainingSettings {
  return {
    id: 1,
    equipment: sanitizeEquipment(parseJson(row.equipment, ["bodyweight"])),
    defaultEffort: clampInt(row.default_effort, 1, 5),
    goal: sanitizeGoal(row.goal),
    trainingAIEnabled: Boolean(row.training_ai_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parsePlanRow(row: PlanRow): TrainingPlanRecord {
  const plan = normalizeStoredPlan(parseJson(row.plan_json, null));
  const focusMuscles = plan.focusMuscles.length ? plan.focusMuscles : normalizeMuscles(parseJson(row.focus_muscles_json, []));
  return {
    id: row.id,
    date: row.date,
    version: row.version,
    isActive: Boolean(row.is_active),
    plan: { ...plan, id: row.id },
    motivationScore: row.motivation_score,
    readinessScore: clampInt(row.readiness_score ?? 50, 0, 100),
    intensity: row.intensity,
    durationMin: row.duration_min,
    focusMuscles,
    generatedAt: row.generated_at,
    completedAt: row.completed_at,
    completionScore: row.completion_score,
  };
}

function normalizeStoredPlan(input: unknown): WorkoutPlan {
  if (isWorkoutPlan(input)) {
    return {
      ...input,
      type: normalizePlanType(input.type),
      warmup: input.warmup.map(normalizeStoredExercise),
      exercises: input.exercises.map(normalizeStoredExercise),
      cooldown: input.cooldown.map(normalizeStoredExercise),
    };
  }
  const legacy = input as {
    title?: string;
    durationMinutes?: number;
    intensityPercent?: number;
    intensityLabel?: string;
    focusMuscles?: unknown;
    warmup?: { name?: string; duration?: string; instructions?: string }[];
    exercises?: {
      name?: string;
      muscles?: unknown;
      sets?: number;
      reps?: string | null;
      duration?: string | null;
      restSeconds?: number;
      difficulty?: string;
      instructions?: string;
    }[];
    cooldown?: { name?: string; duration?: string; instructions?: string }[];
  };
  const legacyExercises = Array.isArray(legacy.exercises) ? legacy.exercises : [];
  const exercises = legacyExercises.map((exercise, index) => {
    const muscles = legacyMuscles(exercise.muscles);
    return {
      id: `legacy-${index}-${slug(exercise.name ?? "exercise")}`,
      name: exercise.name ?? "Uebung",
      sets: clampInt(exercise.sets ?? 2, 1, 6),
      reps: exercise.reps ?? undefined,
      durationSec: secondsFromLegacyDuration(exercise.duration),
      restSec: clampInt(exercise.restSeconds ?? 60, 0, 180),
      muscleGroup: muscles[0] ?? "core",
      secondaryMuscles: muscles.slice(1),
      difficulty: legacyDifficulty(exercise.difficulty),
      equipment: ["bodyweight" as const],
      visual: normalizeExerciseVisual(undefined, exercise.name ?? "Uebung"),
      instructions: exercise.instructions,
    };
  });
  return {
    type: "normal",
    title: legacy.title ?? "Gespeicherter Trainingsplan",
    summary: legacy.intensityLabel ? `Alter Plan im Format: ${legacy.intensityLabel}.` : "Alter Trainingsplan wurde kompatibel geladen.",
    durationMin: clampInt(legacy.durationMinutes ?? 30, 1, 90),
    intensity: clampInt(legacy.intensityPercent ?? 55, 1, 100),
    focusMuscles: legacyMuscles(legacy.focusMuscles),
    warmup: legacySteps(legacy.warmup, "warmup"),
    exercises,
    cooldown: legacySteps(legacy.cooldown, "cooldown"),
  };
}

function isWorkoutPlan(input: unknown): input is WorkoutPlan {
  const value = input as Partial<WorkoutPlan> | null;
  return Boolean(value && typeof value.type === "string" && typeof value.durationMin === "number" && Array.isArray(value.exercises));
}

function legacySteps(steps: { name?: string; duration?: string; instructions?: string }[] | undefined, prefix: string) {
  return (Array.isArray(steps) ? steps : []).map((step, index) => ({
    id: `legacy-${prefix}-${index}-${slug(step.name ?? prefix)}`,
    name: step.name ?? prefix,
    sets: 1,
    durationSec: secondsFromLegacyDuration(step.duration) ?? 180,
    restSec: 0,
    muscleGroup: "mobility" as const,
    difficulty: 1 as const,
    equipment: ["bodyweight" as const],
    visual: normalizeExerciseVisual(undefined, step.name ?? prefix),
    instructions: step.instructions,
  }));
}

function legacyMuscles(input: unknown): MuscleGroup[] {
  const aliases: Record<string, MuscleGroup> = {
    Brust: "chest",
    Ruecken: "back",
    Rücken: "back",
    Schultern: "shoulders",
    Bizeps: "biceps",
    Trizeps: "triceps",
    Bauch: "core",
    Beine: "legs",
    Gesaess: "glutes",
    Gesäß: "glutes",
    Waden: "calves",
    Unterarme: "forearms",
  };
  if (!Array.isArray(input)) return [];
  return input
    .flatMap((item) => (typeof item === "string" && aliases[item] ? [aliases[item]] : normalizeMuscles([item])))
    .filter((muscle, index, array) => array.indexOf(muscle) === index);
}

function legacyDifficulty(input: string | undefined) {
  if (input === "Anspruchsvoll") return 4 as const;
  if (input === "Mittel") return 3 as const;
  return 2 as const;
}

function secondsFromLegacyDuration(input: string | null | undefined) {
  if (!input) return undefined;
  const value = Number(input.match(/\d+/)?.[0] ?? 0);
  if (!value) return undefined;
  return /sek/i.test(input) ? value : value * 60;
}

function slug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function parseHistoryRow(row: HistoryRow): TrainingHistoryEntry {
  return {
    id: row.id,
    date: row.date,
    planId: row.plan_id,
    planType: row.plan_type ? normalizePlanType(row.plan_type) : null,
    completed: Boolean(row.completed),
    skipped: Boolean(row.skipped),
    effortActual: row.effort_actual,
    durationActual: row.duration_actual,
    completionScore: row.completion_score,
    focusMuscles: normalizeMuscles(parseJson(row.focus_muscles_json ?? "[]", [])),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function calculateCompletionScore(plan: WorkoutPlan, checks: { exerciseId: string; setIndex?: number | null; checked: boolean }[], completed: boolean) {
  if (completed) return 1;
  const allExercises = [...plan.warmup, ...plan.exercises, ...plan.cooldown];
  const totalSets = allExercises.reduce((sum, exercise) => sum + Math.max(1, exercise.sets), 0);
  const checked = checks.filter((check) => check.checked && check.setIndex !== null && check.setIndex !== undefined).length;
  return Math.max(0, Math.min(1, totalSets ? checked / totalSets : 0));
}

function parseLegacyPlan(planJson: string): { type: PlanType; intensity: number; durationMin: number; focusMuscles: MuscleGroup[] } {
  const plan = parseJson(planJson, {}) as { intensityPercent?: number; durationMinutes?: number; focusMuscles?: unknown };
  return {
    type: "normal",
    intensity: clampInt(plan.intensityPercent ?? 55, 1, 100),
    durationMin: clampInt(plan.durationMinutes ?? 30, 1, 90),
    focusMuscles: normalizeMuscles(plan.focusMuscles),
  };
}

function normalizeStoredExercise(exercise: WorkoutPlan["exercises"][number]) {
  return { ...exercise, visual: normalizeExerciseVisual(exercise.visual, exercise.name) };
}

function normalizePlanType(input: string): PlanType {
  if (input === "starter" || input === "normal" || input === "low_motivation" || input === "recovery" || input === "progression" || input === "deload" || input === "comeback") {
    return input;
  }
  if (input === "busy_day") return "low_motivation";
  if (input === "weekend" || input === "full") return "normal";
  return "normal";
}

function sanitizeEquipment(input: unknown): TrainingEquipment[] {
  const valid = new Set<TrainingEquipment>(["bodyweight", "pullup_bar", "treadmill"]);
  const equipment = Array.isArray(input) ? input.filter((item): item is TrainingEquipment => typeof item === "string" && valid.has(item as TrainingEquipment)) : [];
  return equipment.length ? Array.from(new Set(["bodyweight", ...equipment] as TrainingEquipment[])) : ["bodyweight"];
}

function sanitizeGoal(input: unknown): TrainingGoal {
  return input === "definition" || input === "discipline" || input === "muscle" ? input : "muscle";
}

function addColumnIfMissing(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((item) => item.name === column)) return;
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column")) throw error;
  }
}

function parseJson(input: string, fallback: unknown) {
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

ensureTrainingSchema();
