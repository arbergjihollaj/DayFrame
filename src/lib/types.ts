export type ThemeMode = "dark" | "light";
export type RoutineLevel = "leicht" | "normal" | "ambitioniert";
export type TrainingDifficulty = "leicht" | "normal" | "anspruchsvoll";
export type DaySectionKey = "morning" | "midday" | "afternoon" | "evening" | "night";
export type PlanItemType = "calendar" | "learning" | "sport" | "routine" | "sleep";
export type CourseDifficulty = "hard" | "medium" | "light";
export type PriorityBand = "P1" | "P2" | "P3" | "P4";
export type DayType = "light" | "medium" | "heavy" | "emergency";
export type DailyPlanMode = "normal" | "emergency";

export type Settings = {
  icalUrl: string;
  weatherPlace: string;
  theme: ThemeMode;
  accentColor: string;
  routineLevel: RoutineLevel;
  trainingDifficulty: TrainingDifficulty;
  newsCategories: string[];
  generationTime: string;
  sleepTime: string;
  wakeTime: string;
  setupCompleted: boolean;
};

export type WeatherSummary = {
  place?: string;
  temperature?: number;
  label: string;
  warning?: string;
  hourly?: {
    time: string;
    temperature: number;
    precipitationProbability?: number;
  }[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  blocksSchedule?: boolean;
};

export type PlanItem = {
  id: string;
  type: PlanItemType;
  time: string;
  endTime?: string;
  title: string;
};

export type DayPlan = Record<DaySectionKey, PlanItem[]>;

export type Course = {
  id: string;
  name: string;
  difficulty: CourseDifficulty;
  attendanceExpectedDefault: boolean;
  weeklyTargetSessions: number;
  weeklyTargetMinutes: number;
  defaultBlockMinutes: number;
  maxGapDays: number;
  preferredTimeWindows: string[];
  afterLectureReviewMinutes?: number;
  projectBased?: boolean;
};

export type ScheduleBlock = {
  id: string;
  title: string;
  type: "class" | "commute" | "meal" | "routine" | "buffer";
  date: string;
  start: string;
  end: string;
  location?: string;
  fixed: boolean;
  courseId?: string;
  attendanceExpected?: boolean;
};

export type Deadline = {
  id: string;
  title: string;
  courseId: string;
  kind: "testat" | "paper" | "assignment";
  dueAt: string;
  internalDueAt: string;
  estimatedMinutesTotal: number;
  progressPercent: number;
  status: "open" | "in_progress" | "done";
  isSubmitted: boolean;
};

export type PlanningTask = {
  id: string;
  title: string;
  courseId?: string;
  deadlineId?: string;
  kind: "study" | "review" | "coding" | "debug" | "writing" | "submission" | "workout" | "sleep";
  phase?: string;
  estimatedMinutes: number;
  minChunkMinutes: number;
  requiresDeepFocus: boolean;
  movable: boolean;
  dueAt?: string;
  earliestStart?: string;
  priorityScore: number;
  priorityBand: PriorityBand;
  carryOverCount: number;
  blocked: boolean;
  lastWorkedAt?: string;
  progressPercent?: number;
  nextStep?: string;
  deferredReason?: string;
};

export type StudyGoal = {
  id: string;
  scope: "weekly" | "daily";
  courseId: string;
  weekStart: string;
  targetSessions: number;
  targetMinutes: number;
  completedSessions: number;
  completedMinutes: number;
};

export type PlanningRoutine = {
  id: string;
  name: string;
  category: "morning" | "evening" | "meal" | "reset";
  preferredWindow: string;
  durationMinutes: number;
  mandatory: boolean;
  canShrink: boolean;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  type: "strength" | "light" | "minimal";
  durationMinutes: number;
  intensity: "low" | "medium" | "high";
  minRecoveryHours: number;
  exercises: string[];
};

export type TimeBlock = {
  id: string;
  dailyPlanId: string;
  start: string;
  end: string;
  kind: PlanItemType | "commute" | "meal" | "buffer";
  title: string;
  taskId?: string;
  priorityBand?: PriorityBand;
  movable: boolean;
  notes?: string;
};

export type EnergyCheckIn = {
  id: string;
  date: string;
  sleepHours: number;
  energy: number;
  stress: number;
  soreness: number;
  unexpectedEvents?: string;
  manualEmergency: boolean;
};

export type WeeklyReview = {
  id: string;
  weekStart: string;
  completedByCourse: Record<string, number>;
  missedTasks: string[];
  carryOvers: string[];
  workoutsDone: number;
  bedtimeCompliance: number;
  nextWeekAdjustments: string[];
};

export type PlanningRule = {
  id: string;
  key: string;
  value: string | number | boolean;
  scope: "global" | "course" | "day";
  enabled: boolean;
};

export type DailyPlanDetails = {
  id: string;
  date: string;
  dayType: DayType;
  mode: DailyPlanMode;
  focusHeadline: string;
  totalPlannedMinutes: number;
  bedtimeTarget: string;
  learningCutoff: string;
  sleepHours: number;
  energyLevel: number;
  summary: string;
  firstBlock?: TimeBlock;
  topDeadline?: Deadline;
  timeBlocks: TimeBlock[];
  deferredTasks: PlanningTask[];
  activeDeadlines: Deadline[];
  priorityCounts: Record<PriorityBand, number>;
  emergencyPlan?: Omit<DailyPlanDetails, "emergencyPlan">;
  weeklyReview?: WeeklyReview;
};

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  summary: string;
  relevance: string;
  category: string;
  url?: string;
};

export type WeekLoadItem = {
  date: string;
  label: string;
  load: number;
  isToday: boolean;
};

export type DailyContext = {
  id: number;
  date: string;
  goesToUniversity: boolean;
  source: "daily-modal";
  answeredAt: string;
};

export type Briefing = {
  id: number;
  date: string;
  generatedAt: string;
  greeting: string;
  weather: WeatherSummary;
  dayPlan: DayPlan;
  planning?: DailyPlanDetails | null;
  news: NewsItem[];
  tomorrowPreview: string[];
  weekLoad: WeekLoadItem[];
  errors: string[];
  dayRating: string | null;
};

export type Subject = {
  id: number;
  name: string;
};

export type Topic = {
  id: number;
  subjectId: number;
  subjectName?: string;
  name: string;
  confidence: number;
  lastStudiedAt: string | null;
  examDate: string | null;
  deadlineDate: string | null;
};

export type WorkoutStep = {
  name: string;
  duration: string;
  instructions: string;
};

export type TrainingExercise = {
  name: string;
  muscles: string[];
  sets: number;
  reps: string | null;
  duration: string | null;
  restSeconds: number;
  difficulty: "Leicht" | "Mittel" | "Anspruchsvoll";
  visual?: {
    type: "image" | "gif" | "video" | "none";
    url?: string;
    source?: "local" | "exercisedb" | "wger";
    alt?: string;
  };
  instructions: string;
  techniqueTip?: string | null;
};

export type DailyTrainingPlan = {
  title: string;
  durationMinutes: number;
  intensityPercent?: number;
  intensityLabel?: string;
  focusMuscles: string[];
  warmup: WorkoutStep[];
  exercises: TrainingExercise[];
  cooldown: WorkoutStep[];
};
