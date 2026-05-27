export type TrainingEquipment = "bodyweight" | "pullup_bar" | "treadmill";

export type PlanType = "starter" | "normal" | "low_motivation" | "recovery" | "progression" | "deload" | "comeback";

export type TrainingGoal = "muscle" | "definition" | "discipline";

export type MuscleGroup = "chest" | "back" | "shoulders" | "biceps" | "triceps" | "core" | "legs" | "glutes" | "calves" | "forearms" | "mobility";

export type ExerciseDifficulty = 1 | 2 | 3 | 4 | 5;

export type ExerciseVisual = {
  type: "image" | "gif" | "video" | "placeholder" | "none";
  url?: string;
  source?: "local" | "exercisedb" | "wger" | "placeholder";
  externalId?: string;
  alt?: string;
};

export type TrainingSettings = {
  id: 1;
  equipment: TrainingEquipment[];
  defaultEffort: number;
  goal: TrainingGoal;
  trainingAIEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps?: string;
  durationSec?: number;
  restSec: number;
  muscleGroup: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  difficulty: ExerciseDifficulty;
  equipment: TrainingEquipment[];
  visual?: ExerciseVisual;
  instructions?: string;
  tags?: PlanType[];
};

export type WorkoutPlan = {
  id?: number;
  type: PlanType;
  title: string;
  summary: string;
  durationMin: number;
  intensity: number;
  focusMuscles: MuscleGroup[];
  warmup: Exercise[];
  exercises: Exercise[];
  cooldown: Exercise[];
};

export type TrainingPlanRecord = {
  id: number;
  date: string;
  version: number;
  isActive: boolean;
  plan: WorkoutPlan;
  motivationScore: number | null;
  readinessScore: number;
  intensity: number;
  durationMin: number;
  focusMuscles: MuscleGroup[];
  generatedAt: string;
  completedAt: string | null;
  completionScore: number | null;
};

export type TrainingHistoryEntry = {
  id: number;
  date: string;
  planId: number | null;
  planType: PlanType | null;
  completed: boolean;
  skipped: boolean;
  effortActual: number | null;
  durationActual: number | null;
  completionScore: number | null;
  focusMuscles: MuscleGroup[];
  notes: string | null;
  createdAt: string;
};

export type RecentHardMuscleLoad = {
  muscle: MuscleGroup;
  daysAgo: number;
};

export type HistoryStats = {
  completedLast7Days: number;
  completedLast14Days: number;
  plannedLast14Days: number;
  skippedLast14Days: number;
  completionRate: number;
  daysSinceLastWorkout: number;
  weeklyVolume: number;
  recentMuscleGroups: MuscleGroup[];
  recentHardMuscles: RecentHardMuscleLoad[];
  lastHardTrainingDays: number[];
  comparableAverageIntensity: number | null;
  comparableAverageDuration: number | null;
};

export type ReadinessBreakdown = {
  motivation: number;
  recovery: number;
  consistency: number;
  daysSinceLastWorkout: number;
  weeklyVolume: number;
};

export type ReadinessContext = {
  date: string;
  motivationScore: number;
  desiredEffort: number;
  goal: TrainingGoal;
  equipment: TrainingEquipment[];
  history: HistoryStats;
  readinessScore: number;
  readinessBreakdown: ReadinessBreakdown;
};

export type PlanScore = {
  readinessScore: number;
  type: PlanType;
};
