import type {
  CalendarEvent,
  Course,
  DailyPlanDetails,
  Deadline,
  DayPlan,
  DaySectionKey,
  DayType,
  EnergyCheckIn,
  PlanningTask,
  PriorityBand,
  ScheduleBlock,
  StudyGoal,
  TimeBlock,
  WeeklyReview,
  WorkoutPlan,
} from "@/lib/types";

const sectionByHour: { max: number; key: DaySectionKey }[] = [
  { max: 11, key: "morning" },
  { max: 15, key: "midday" },
  { max: 18, key: "afternoon" },
  { max: 22, key: "evening" },
  { max: 24, key: "night" },
];

export const seedCourses: Course[] = [
  {
    id: "math2",
    name: "Mathe 2",
    difficulty: "hard",
    attendanceExpectedDefault: true,
    weeklyTargetSessions: 3,
    weeklyTargetMinutes: 240,
    defaultBlockMinutes: 90,
    maxGapDays: 3,
    preferredTimeWindows: ["Mittwoch Nachmittag", "Wochenende", "freie Nachmittage"],
    afterLectureReviewMinutes: 25,
  },
  {
    id: "prog2",
    name: "Programmieren 2",
    difficulty: "hard",
    attendanceExpectedDefault: true,
    weeklyTargetSessions: 3,
    weeklyTargetMinutes: 360,
    defaultBlockMinutes: 120,
    maxGapDays: 2,
    preferredTimeWindows: ["Nachmittag", "Abend", "Wochenende"],
  },
  {
    id: "prog1",
    name: "Programmieren 1",
    difficulty: "light",
    attendanceExpectedDefault: false,
    weeklyTargetSessions: 1,
    weeklyTargetMinutes: 90,
    defaultBlockMinutes: 60,
    maxGapDays: 4,
    preferredTimeWindows: ["Nachmittag", "freie Tage"],
  },
  {
    id: "ads",
    name: "Algorithmen & Datenstrukturen",
    difficulty: "medium",
    attendanceExpectedDefault: true,
    weeklyTargetSessions: 2,
    weeklyTargetMinutes: 120,
    defaultBlockMinutes: 60,
    maxGapDays: 4,
    preferredTimeWindows: ["Nachmittag", "Abend"],
  },
  {
    id: "os",
    name: "Betriebssysteme",
    difficulty: "hard",
    attendanceExpectedDefault: true,
    weeklyTargetSessions: 2,
    weeklyTargetMinutes: 120,
    defaultBlockMinutes: 60,
    maxGapDays: 3,
    preferredTimeWindows: ["nach Vorlesung", "Dienstag Nachmittag"],
    afterLectureReviewMinutes: 25,
  },
  {
    id: "softskills",
    name: "Soft Skills",
    difficulty: "light",
    attendanceExpectedDefault: true,
    weeklyTargetSessions: 1,
    weeklyTargetMinutes: 75,
    defaultBlockMinutes: 60,
    maxGapDays: 7,
    preferredTimeWindows: ["Freitag", "Wochenende"],
    projectBased: true,
  },
];

export const seedDeadlines: Deadline[] = [
  {
    id: "prog1-testat-2026-05-26",
    title: "Programmieren 1 Testat",
    courseId: "prog1",
    kind: "testat",
    dueAt: "2026-05-26",
    internalDueAt: "2026-05-26",
    estimatedMinutesTotal: 360,
    progressPercent: 15,
    status: "in_progress",
    isSubmitted: false,
  },
  {
    id: "prog2-testat-2026-05-26",
    title: "Programmieren 2 Testat",
    courseId: "prog2",
    kind: "testat",
    dueAt: "2026-05-26",
    internalDueAt: "2026-05-26",
    estimatedMinutesTotal: 540,
    progressPercent: 10,
    status: "in_progress",
    isSubmitted: false,
  },
  {
    id: "softskills-paper-2026-05-29",
    title: "Soft Skills Hausarbeit",
    courseId: "softskills",
    kind: "paper",
    dueAt: "2026-05-29",
    internalDueAt: "2026-05-28",
    estimatedMinutesTotal: 420,
    progressPercent: 5,
    status: "in_progress",
    isSubmitted: false,
  },
];

export const seedWorkoutPlans: WorkoutPlan[] = [
  { id: "full-body-a", name: "Ganzkörper A", type: "strength", durationMinutes: 55, intensity: "medium", minRecoveryHours: 48, exercises: ["Kniebeuge", "Drücken", "Rudern", "Core"] },
  { id: "full-body-b", name: "Ganzkörper B", type: "strength", durationMinutes: 55, intensity: "medium", minRecoveryHours: 48, exercises: ["Hinge", "Ziehen", "Ausfallschritte", "Core"] },
  { id: "cardio-light", name: "Mobility/Cardio light", type: "light", durationMinutes: 25, intensity: "low", minRecoveryHours: 12, exercises: ["Zone 2", "Mobility"] },
  { id: "minimal-routine", name: "Minimalroutine", type: "minimal", durationMinutes: 10, intensity: "low", minRecoveryHours: 0, exercises: ["Mobility", "Walk"] },
];

type GenerateInput = {
  date: string;
  calendarEvents: CalendarEvent[];
  checkIn?: Partial<EnergyCheckIn> | null;
  carryOvers?: PlanningTask[];
  deadlineProgress?: Record<string, number>;
  forcedEmergency?: boolean;
  goesToUniversity?: boolean | null;
};

type Window = { start: number; end: number };

export function generateDailyPlan(input: GenerateInput): DailyPlanDetails {
  const courses = seedCourses;
  const checkIn = normalizeCheckIn(input.date, input.checkIn);
  const weekday = weekdayIndex(input.date);
  const fixedBlocks = buildFixedBlocks(input.date, input.calendarEvents, input.goesToUniversity);
  const blocksWithCommute = addCommutes(input.date, fixedBlocks);
  const fixedMinutes = blocksWithCommute.reduce((sum, block) => sum + minutesBetween(block.start, block.end), 0);
  const emergency = input.forcedEmergency || isEmergencyDay(checkIn, fixedMinutes, weekday);
  const dayType = emergency ? "emergency" : classifyDay(weekday, fixedMinutes, checkIn);
  const bedtimeTarget = bedtimeFor(weekday, checkIn);
  const learningCutoff = hasEarlyClassTomorrow(input.date) ? "21:45" : "22:15";
  const activeDeadlines = seedDeadlines
    .map((deadline) => ({ ...deadline, progressPercent: input.deadlineProgress?.[deadline.id] ?? deadline.progressPercent }))
    .filter((deadline) => !deadline.isSubmitted && daysUntil(input.date, deadline.dueAt) >= -1 && daysUntil(input.date, deadline.dueAt) <= 14);

  const deadlineTasks = activeDeadlines.flatMap((deadline) => expandDeadline(deadline, input.date));
  const weeklyGoals = buildWeeklyGoals(input.date, activeDeadlines);
  const weeklyTasks = buildWeeklyTasks(input.date, courses, weeklyGoals, activeDeadlines);
  const reviewTasks = buildLectureReviews(input.date, fixedBlocks);
  const carryOvers = (input.carryOvers ?? []).map((task) => ({
    ...task,
    id: `carry-${task.id}`,
    carryOverCount: task.carryOverCount + 1,
    priorityScore: task.priorityScore + 1,
  }));
  const allTasks = [...deadlineTasks, ...weeklyTasks, ...reviewTasks, ...carryOvers].map((task) =>
    scoreTask(task, input.date, dayType, checkIn, activeDeadlines, weeklyGoals),
  );
  const cappedTasks = capP1(allTasks, dayType);
  const windows = freeWindows(blocksWithCommute, dayType, learningCutoff);
  const scheduled = scheduleTasks(cappedTasks, windows, dayType, checkIn, input.date);
  const withEssentials = addEssentials(input.date, scheduled.timeBlocks, blocksWithCommute, bedtimeTarget, learningCutoff);
  const sortedBlocks = withEssentials.sort((a, b) => a.start.localeCompare(b.start));
  const emergencyPlan = emergency
    ? undefined
    : buildEmergencyPlan(input.date, blocksWithCommute, cappedTasks, bedtimeTarget, learningCutoff, checkIn);
  const topDeadline = activeDeadlines.sort((a, b) => daysUntil(input.date, a.internalDueAt) - daysUntil(input.date, b.internalDueAt))[0];
  const priorityCounts = countPriorities(cappedTasks);
  const totalPlannedMinutes = sortedBlocks.reduce((sum, block) => sum + minutesBetween(block.start, block.end), 0);

  return {
    id: `plan-${input.date}-${emergency ? "emergency" : "normal"}`,
    date: input.date,
    dayType,
    mode: emergency ? "emergency" : "normal",
    focusHeadline: buildFocusHeadline(scheduled.timeBlocks, topDeadline, dayType),
    totalPlannedMinutes,
    bedtimeTarget,
    learningCutoff,
    sleepHours: checkIn.sleepHours,
    energyLevel: checkIn.energy,
    summary: buildSummary(dayType, scheduled.deferredTasks.length, topDeadline),
    firstBlock: sortedBlocks.find((block) => block.kind !== "buffer"),
    topDeadline,
    timeBlocks: sortedBlocks,
    deferredTasks: scheduled.deferredTasks,
    activeDeadlines,
    priorityCounts,
    emergencyPlan,
    weeklyReview: weekday === 0 ? buildWeeklyReview(input.date, scheduled.deferredTasks) : undefined,
  };
}

export function dailyPlanToSections(plan: DailyPlanDetails): DayPlan {
  const empty: DayPlan = { morning: [], midday: [], afternoon: [], evening: [], night: [] };
  plan.timeBlocks.forEach((block) => {
    if (block.kind === "buffer" || block.kind === "meal") return;
    const hour = Number(block.start.slice(0, 2));
    const section = sectionByHour.find((item) => hour < item.max)?.key ?? "night";
    empty[section].push({
      id: block.id,
      type: block.kind === "commute" ? "calendar" : block.kind,
      time: block.start,
      endTime: block.end,
      title: block.priorityBand ? `${block.priorityBand} · ${block.title}` : block.title,
    });
  });
  return empty;
}

export function buildFixedBlocks(date: string, calendarEvents: CalendarEvent[], goesToUniversity: boolean | null = true): ScheduleBlock[] {
  const weekday = weekdayIndex(date);
  const uniByWeekday: Record<number, ScheduleBlock[]> = {
    1: [block(date, "os-mon", "Betriebssysteme", "class", "11:30", "13:00", "Campus", "os")],
    2: [block(date, "os-tue", "Betriebssysteme", "class", "08:00", "09:30", "Campus", "os")],
    3: [block(date, "math2-wed", "Mathe 2", "class", "09:00", "11:30", "Online", "math2")],
    4: [
      block(date, "prog2-thu", "Programmieren 2", "class", "08:00", "11:15", "Campus", "prog2"),
      block(date, "prog1-thu", "Programmieren 1", "class", "11:30", "17:15", "Campus", "prog1", false),
      block(date, "ads-thu", "Algorithmen & Datenstrukturen", "class", "14:00", "17:15", "Campus", "ads"),
    ],
    5: [block(date, "softskills-fri", "Soft Skills", "class", "17:30", "19:00", "Online", "softskills")],
  };
  const uniBlocks = uniByWeekday[weekday] ?? [];
  const activeUni = uniBlocks.filter((item) => item.attendanceExpected !== false && (item.location !== "Campus" || goesToUniversity !== false));
  const calendar = calendarEvents
    .filter((event) => event.date === date)
    .map((event) => block(date, `cal-${event.id}`, event.title, "class", event.startTime, event.endTime, undefined, undefined, true, true));
  return mergeOverlapping([...activeUni, ...calendar].sort((a, b) => a.start.localeCompare(b.start)));
}

function block(
  date: string,
  id: string,
  title: string,
  type: ScheduleBlock["type"],
  start: string,
  end: string,
  location?: string,
  courseId?: string,
  attendanceExpected = true,
  include = true,
): ScheduleBlock {
  return { id, title, type, date, start, end, location, fixed: true, courseId, attendanceExpected: include ? attendanceExpected : false };
}

function normalizeCheckIn(date: string, checkIn?: Partial<EnergyCheckIn> | null): EnergyCheckIn {
  return {
    id: `check-${date}`,
    date,
    sleepHours: checkIn?.sleepHours ?? 7,
    energy: checkIn?.energy ?? 3,
    stress: checkIn?.stress ?? 3,
    soreness: checkIn?.soreness ?? 2,
    unexpectedEvents: checkIn?.unexpectedEvents,
    manualEmergency: checkIn?.manualEmergency ?? false,
  };
}

function addCommutes(date: string, blocks: ScheduleBlock[]) {
  const result: ScheduleBlock[] = [];
  blocks.forEach((item, index) => {
    const previousCampus = [...blocks].slice(0, index).reverse().find((block) => block.location === "Campus");
    const nextCampus = blocks.slice(index + 1).find((block) => block.location === "Campus");
    const needsCommute = item.location === "Campus";
    const startsCampusStay = needsCommute && !previousCampus;
    const endsCampusStay = needsCommute && !nextCampus;
    if (startsCampusStay) {
      result.push({ id: `commute-to-${item.id}`, title: "Hinweg zur Uni", type: "commute", date, start: addMinutes(item.start, -50), end: item.start, fixed: true });
    }
    result.push(item);
    if (endsCampusStay) {
      result.push({ id: `commute-from-${item.id}`, title: "Rückweg von der Uni", type: "commute", date, start: item.end, end: addMinutes(item.end, 50), fixed: true });
    }
  });
  return mergeOverlapping(result.sort((a, b) => a.start.localeCompare(b.start)));
}

function classifyDay(weekday: number, fixedMinutes: number, checkIn: EnergyCheckIn): DayType {
  if (weekday === 4 || fixedMinutes >= 420 || checkIn.sleepHours < 6.5) return "heavy";
  if (fixedMinutes >= 150 || checkIn.energy <= 3) return "medium";
  return "light";
}

function isEmergencyDay(checkIn: EnergyCheckIn, fixedMinutes: number, weekday: number) {
  if (checkIn.manualEmergency || checkIn.sleepHours < 6 || checkIn.energy <= 2) return true;
  const soft = [checkIn.stress >= 4, fixedMinutes >= 480, weekday === 2 && checkIn.sleepHours < 6.5].filter(Boolean).length;
  return soft >= 2;
}

function expandDeadline(deadline: Deadline, date: string): PlanningTask[] {
  const remaining = Math.max(30, deadline.estimatedMinutesTotal * (1 - deadline.progressPercent / 100));
  const phases =
    deadline.kind === "paper"
      ? [
          ["research", "Recherche", 0.15, "writing"],
          ["understanding", "Thema klären", 0.1, "writing"],
          ["outline", "Gliederung", 0.15, "writing"],
          ["rough-draft", "Rohfassung", 0.35, "writing"],
          ["revision", "Überarbeitung", 0.15, "writing"],
          ["final-check", "Finalcheck", 0.05, "submission"],
          ["submission", "Abgabepuffer", 0.05, "submission"],
        ]
      : [
          ["requirements", "Requirements klären", 0.1, "coding"],
          ["setup", "Setup prüfen", 0.1, "coding"],
          ["core", "Kernimplementation", 0.4, "coding"],
          ["testing", "Tests", 0.2, "debug"],
          ["debugging", "Debugging-Puffer", 0.15, "debug"],
          ["submission", "Finalcheck", 0.05, "submission"],
        ];
  return phases.map(([phase, label, weight, kind]) => {
    const minutes = clamp(Math.round((remaining * Number(weight)) / 15) * 15, 25, deadline.kind === "testat" ? 135 : 90);
    return {
      id: `${deadline.id}-${phase}`,
      title: `${courseName(deadline.courseId)}: ${label}`,
      courseId: deadline.courseId,
      deadlineId: deadline.id,
      kind: kind as PlanningTask["kind"],
      phase: String(phase),
      estimatedMinutes: minutes,
      minChunkMinutes: minutes >= 90 ? 75 : 25,
      requiresDeepFocus: minutes >= 75 || phase === "core" || phase === "rough-draft",
      movable: phase !== "submission",
      dueAt: deadline.internalDueAt,
      priorityScore: 0,
      priorityBand: "P3" as PriorityBand,
      carryOverCount: 0,
      blocked: false,
      progressPercent: deadline.progressPercent,
      nextStep: String(label),
    };
  }).filter((task) => daysUntil(date, task.dueAt ?? date) <= (deadline.kind === "paper" ? 7 : 7));
}

function buildWeeklyGoals(date: string, deadlines: Deadline[]): StudyGoal[] {
  const weekStart = startOfWeek(date);
  return seedCourses.map((course) => {
    const hasDeadline = deadlines.some((deadline) => deadline.courseId === course.id && daysUntil(date, deadline.dueAt) <= 7);
    const targetSessions = course.id === "prog2" && hasDeadline ? 4 : course.id === "prog1" && hasDeadline ? 2 : course.weeklyTargetSessions;
    return {
      id: `goal-${weekStart}-${course.id}`,
      scope: "weekly",
      courseId: course.id,
      weekStart,
      targetSessions,
      targetMinutes: hasDeadline ? course.weeklyTargetMinutes + 60 : course.weeklyTargetMinutes,
      completedSessions: 0,
      completedMinutes: 0,
    };
  });
}

function buildWeeklyTasks(date: string, courses: Course[], goals: StudyGoal[], deadlines: Deadline[]): PlanningTask[] {
  const weekday = weekdayIndex(date);
  const goodStudyDay = [0, 2, 3, 5, 6].includes(weekday);
  return goals.reduce<PlanningTask[]>((tasks, goal) => {
    if (!goodStudyDay && !["math2", "os", "prog1"].includes(goal.courseId)) return tasks;
      const course = courses.find((item) => item.id === goal.courseId)!;
      const deadlineWeek = deadlines.some((deadline) => deadline.courseId === course.id);
      const sessionsRemaining = goal.targetSessions - goal.completedSessions;
      if (sessionsRemaining <= 0) return tasks;
      tasks.push({
        id: `weekly-${date}-${course.id}`,
        title: `${course.name}: Wochenziel pflegen`,
        courseId: course.id,
        kind: "study" as const,
        estimatedMinutes: deadlineWeek ? Math.min(course.defaultBlockMinutes, 90) : course.defaultBlockMinutes,
        minChunkMinutes: course.defaultBlockMinutes >= 90 ? 60 : 35,
        requiresDeepFocus: course.difficulty === "hard" && course.defaultBlockMinutes >= 90,
        movable: true,
        priorityScore: 0,
        priorityBand: "P3" as PriorityBand,
        carryOverCount: 0,
        blocked: false,
        nextStep: deadlineWeek ? "sichtbar halten trotz Testatdruck" : "nächste solide Einheit",
      });
      return tasks;
    }, []);
}

function buildLectureReviews(date: string, blocks: ScheduleBlock[]): PlanningTask[] {
  return blocks
    .filter((item) => item.courseId && ["math2", "os"].includes(item.courseId))
    .map((item) => ({
      id: `review-${date}-${item.courseId}-${item.start}`,
      title: `${courseName(item.courseId!)}: kurze Nachbereitung`,
      courseId: item.courseId,
      kind: "review" as const,
      estimatedMinutes: item.courseId === "os" ? 25 : 30,
      minChunkMinutes: 20,
      requiresDeepFocus: false,
      movable: true,
      earliestStart: item.end,
      priorityScore: 0,
      priorityBand: "P3" as PriorityBand,
      carryOverCount: 0,
      blocked: false,
      nextStep: "Frisch aus der Vorlesung sichern",
    }));
}

function scoreTask(
  task: PlanningTask,
  date: string,
  dayType: DayType,
  checkIn: EnergyCheckIn,
  deadlines: Deadline[],
  goals: StudyGoal[],
): PlanningTask {
  const course = seedCourses.find((item) => item.id === task.courseId);
  const deadline = task.deadlineId ? deadlines.find((item) => item.id === task.deadlineId) : undefined;
  const days = deadline ? daysUntil(date, deadline.internalDueAt) : task.dueAt ? daysUntil(date, task.dueAt) : 9;
  const deadlineUrgency = deadline ? (days <= 0 ? 5 : days <= 2 ? 4.5 : days <= 4 ? 4 : days <= 7 ? 3 : 1) : 0;
  const courseDifficulty = course?.difficulty === "hard" ? 2 : course?.difficulty === "medium" ? 1 : 0.5;
  const goal = goals.find((item) => item.courseId === task.courseId);
  const feasibleDaysRemaining = [0, 2, 3, 5, 6].filter((day) => day >= weekdayIndex(date)).length || 1;
  const behindScheduleBoost = goal && (goal.targetSessions - goal.completedSessions) / feasibleDaysRemaining > 1 ? 2 : 0;
  const noTouchGapBoost = course && ["math2", "os", "prog2"].includes(course.id) ? 1.25 : course?.id === "prog1" ? 0.75 : 0;
  const lectureFollowUpBoost = task.kind === "review" ? 1 : 0;
  const blockerBoost = task.blocked ? 1 : 0;
  const energyMismatchPenalty = task.requiresDeepFocus && checkIn.energy <= 3 ? 1.25 : 0;
  const overloadPenalty = dayType === "heavy" && task.requiresDeepFocus ? 1 : dayType === "emergency" ? 2 : 0;
  let score =
    deadlineUrgency +
    courseDifficulty +
    behindScheduleBoost +
    Math.min(2, task.carryOverCount) +
    noTouchGapBoost +
    lectureFollowUpBoost +
    blockerBoost -
    energyMismatchPenalty -
    overloadPenalty;

  const hardP1 =
    (deadline && days <= 0) ||
    (deadline?.kind === "testat" && days <= 4 && deadline.progressPercent < 80) ||
    (deadline?.kind === "paper" && daysUntil(date, deadline.internalDueAt) <= 1 && deadline.progressPercent < 75);
  if (hardP1) score = Math.max(score, 8);
  const priorityBand: PriorityBand = score >= 8 ? "P1" : score >= 5 ? "P2" : score >= 3 ? "P3" : "P4";
  return { ...task, priorityScore: Number(score.toFixed(2)), priorityBand };
}

function capP1(tasks: PlanningTask[], dayType: DayType) {
  const max = dayType === "heavy" || dayType === "emergency" ? 1 : 2;
  let used = 0;
  return [...tasks]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((task) => {
      if (task.priorityBand !== "P1") return task;
      used += 1;
      return used <= max ? task : { ...task, priorityBand: "P2" as PriorityBand, priorityScore: 7.75 };
    });
}

function scheduleTasks(tasks: PlanningTask[], windows: Window[], dayType: DayType, checkIn: EnergyCheckIn, date: string) {
  const limits = dayType === "emergency" ? { deep: 1, total: 2 } : dayType === "heavy" ? { deep: 1, total: 2 } : dayType === "medium" ? { deep: 2, total: 3 } : { deep: 3, total: 4 };
  const timeBlocks: TimeBlock[] = [];
  const deferredTasks: PlanningTask[] = [];
  let deepCount = 0;
  let totalCount = 0;
  const ordered = [...tasks].sort((a, b) => b.priorityScore - a.priorityScore || a.estimatedMinutes - b.estimatedMinutes);
  const mutableWindows = windows.map((item) => ({ ...item }));

  for (const task of ordered) {
    if (task.priorityBand === "P4" || totalCount >= limits.total || (task.requiresDeepFocus && deepCount >= limits.deep)) {
      deferredTasks.push({ ...task, deferredReason: "Heute bewusst verschiebbar" });
      continue;
    }
    const duration = chooseDuration(task, dayType, checkIn);
    const slot = findSlot(mutableWindows, duration, task.requiresDeepFocus, task.earliestStart);
    if (!slot) {
      deferredTasks.push({ ...task, deferredReason: "Kein realistisches Zeitfenster" });
      continue;
    }
    timeBlocks.push({
      id: `tb-${date}-${task.id}`,
      dailyPlanId: `plan-${date}`,
      start: fromMinutes(slot.start),
      end: fromMinutes(slot.start + duration),
      kind: task.kind === "workout" ? "sport" : task.kind === "sleep" ? "sleep" : "learning",
      title: task.title,
      taskId: task.id,
      priorityBand: task.priorityBand,
      movable: task.movable,
      notes: task.nextStep,
    });
    totalCount += 1;
    if (task.requiresDeepFocus) deepCount += 1;
    slot.window.start = slot.start + duration + 15;
  }

  const workout = chooseWorkout(date, mutableWindows, dayType, checkIn, tasks);
  if (workout) timeBlocks.push(workout);
  return { timeBlocks, deferredTasks };
}

function chooseWorkout(date: string, windows: Window[], dayType: DayType, checkIn: EnergyCheckIn, tasks: PlanningTask[]): TimeBlock | null {
  const weekday = weekdayIndex(date);
  const hardDeadlineCrash = tasks.some((task) => task.priorityBand === "P1" && task.requiresDeepFocus);
  if (dayType === "emergency") return minimalWorkout(date, "Minimalroutine", 10, windows);
  if (weekday === 4 || checkIn.energy < 3) return minimalWorkout(date, "Mobility/Cardio light", 25, windows);
  if (![2, 5, 6, 0].includes(weekday) || hardDeadlineCrash) return null;
  const plan = seedWorkoutPlans[weekday === 5 ? 1 : 0];
  const slot = findSlot(windows, plan.durationMinutes, false);
  if (!slot) return minimalWorkout(date, "Mobility/Cardio light", 25, windows);
  slot.window.start = slot.start + plan.durationMinutes + 15;
  return { id: `tb-${date}-workout-${plan.id}`, dailyPlanId: `plan-${date}`, start: fromMinutes(slot.start), end: fromMinutes(slot.start + plan.durationMinutes), kind: "sport", title: plan.name, priorityBand: "P3", movable: true };
}

function minimalWorkout(date: string, title: string, duration: number, windows: Window[]) {
  const slot = findSlot(windows, duration, false);
  if (!slot) return null;
  return { id: `tb-${date}-workout-minimal`, dailyPlanId: `plan-${date}`, start: fromMinutes(slot.start), end: fromMinutes(slot.start + duration), kind: "sport" as const, title, priorityBand: "P3" as const, movable: true };
}

function addEssentials(date: string, scheduled: TimeBlock[], fixed: ScheduleBlock[], bedtime: string, cutoff: string): TimeBlock[] {
  const fixedBlocks: TimeBlock[] = fixed.map((item) => ({
    id: `tb-${date}-${item.id}`,
    dailyPlanId: `plan-${date}`,
    start: item.start,
    end: item.end,
    kind: item.type === "commute" ? "commute" : "calendar",
    title: item.title,
    movable: false,
  }));
  const essentials: TimeBlock[] = [
    { id: `tb-${date}-lunch`, dailyPlanId: `plan-${date}`, start: "13:00", end: "13:35", kind: "meal", title: "Mittagessen", movable: true },
    { id: `tb-${date}-dinner`, dailyPlanId: `plan-${date}`, start: "19:20", end: "19:55", kind: "meal", title: "Abendessen", movable: true },
    { id: `tb-${date}-cutoff`, dailyPlanId: `plan-${date}`, start: cutoff, end: addMinutes(cutoff, 15), kind: "routine", title: "Lernen beenden", priorityBand: "P2", movable: false },
    { id: `tb-${date}-winddown`, dailyPlanId: `plan-${date}`, start: addMinutes(bedtime, -35), end: bedtime, kind: "sleep", title: "Abendroutine und runterfahren", priorityBand: "P2", movable: false },
  ];
  return mergeTimeBlocks([...fixedBlocks, ...scheduled, ...essentials]);
}

function buildEmergencyPlan(date: string, fixed: ScheduleBlock[], tasks: PlanningTask[], bedtime: string, cutoff: string, checkIn: EnergyCheckIn): Omit<DailyPlanDetails, "emergencyPlan"> {
  const keep = capP1(tasks, "emergency");
  const windows = freeWindows(fixed, "emergency", cutoff);
  const scheduled = scheduleTasks(keep, windows, "emergency", { ...checkIn, manualEmergency: true }, date);
  const blocks = addEssentials(date, scheduled.timeBlocks, fixed, bedtime, cutoff).sort((a, b) => a.start.localeCompare(b.start));
  return {
    id: `plan-${date}-emergency`,
    date,
    dayType: "emergency",
    mode: "emergency",
    focusHeadline: "Reduzierter Plan: nur das Nötigste",
    totalPlannedMinutes: blocks.reduce((sum, block) => sum + minutesBetween(block.start, block.end), 0),
    bedtimeTarget: bedtime,
    learningCutoff: cutoff,
    sleepHours: checkIn.sleepHours,
    energyLevel: checkIn.energy,
    summary: "Fixtermine bleiben, P3/P4 und zusätzlicher Sport fallen raus.",
    firstBlock: blocks[0],
    timeBlocks: blocks,
    deferredTasks: scheduled.deferredTasks,
    activeDeadlines: seedDeadlines,
    priorityCounts: countPriorities(keep),
  };
}

function freeWindows(fixed: ScheduleBlock[], dayType: DayType, cutoff: string): Window[] {
  const start = dayType === "heavy" ? toMinutes("17:45") : toMinutes("08:30");
  const end = Math.min(toMinutes(cutoff), dayType === "emergency" ? toMinutes("20:30") : toMinutes("22:00"));
  let cursor = start;
  const windows: Window[] = [];
  fixed.forEach((block) => {
    const blockStart = toMinutes(block.start);
    const blockEnd = toMinutes(block.end);
    if (blockStart - cursor >= 25) windows.push({ start: cursor, end: blockStart - 10 });
    cursor = Math.max(cursor, blockEnd + 15);
  });
  if (end - cursor >= 25) windows.push({ start: cursor, end });
  return windows.filter((window) => window.end - window.start >= 20);
}

function findSlot(windows: Window[], duration: number, deep: boolean, earliest?: string) {
  const earliestMin = earliest ? toMinutes(earliest) + 15 : 0;
  const candidates = windows.filter((window) => window.end - Math.max(window.start, earliestMin) >= duration);
  const preferred = deep ? candidates.find((window) => Math.max(window.start, earliestMin) >= toMinutes("14:00")) : candidates[0];
  const window = preferred ?? candidates[0];
  if (!window) return null;
  return { window, start: Math.max(window.start, earliestMin) };
}

function chooseDuration(task: PlanningTask, dayType: DayType, checkIn: EnergyCheckIn) {
  if (dayType === "emergency") return Math.min(task.estimatedMinutes, task.requiresDeepFocus ? 60 : 30);
  if (dayType === "heavy") return Math.min(task.estimatedMinutes, task.requiresDeepFocus ? 75 : 35);
  if (checkIn.energy <= 3) return Math.max(task.minChunkMinutes, Math.min(task.estimatedMinutes, 75));
  return task.estimatedMinutes;
}

function buildFocusHeadline(blocks: TimeBlock[], deadline?: Deadline, dayType?: DayType) {
  const firstP1 = blocks.find((block) => block.priorityBand === "P1");
  if (dayType === "emergency") return "Heute reduziert: ein Muss-Punkt reicht";
  if (firstP1) return firstP1.title;
  if (deadline) return `${deadline.title} im Blick behalten`;
  return "Ruhig durch den Tag, ohne Lücken in den schweren Fächern";
}

function buildSummary(dayType: DayType, deferredCount: number, deadline?: Deadline) {
  const load = dayType === "heavy" ? "konservativ" : dayType === "light" ? "offen" : "realistisch";
  const deadlineText = deadline ? ` Wichtigste Deadline: ${deadline.title}.` : "";
  return `Der Tag ist ${load} geplant.${deadlineText} ${deferredCount} Aufgabe(n) bleiben verschiebbar.`;
}

function buildWeeklyReview(date: string, deferred: PlanningTask[]): WeeklyReview {
  return {
    id: `weekly-review-${startOfWeek(date)}`,
    weekStart: startOfWeek(date),
    completedByCourse: {},
    missedTasks: deferred.map((task) => task.title),
    carryOvers: deferred.filter((task) => task.priorityBand === "P1" || task.priorityBand === "P2").map((task) => task.id),
    workoutsDone: 0,
    bedtimeCompliance: 0,
    nextWeekAdjustments: ["Donnerstag weiter konservativ halten", "Testat-Reste direkt Montag sichtbar machen"],
  };
}

function mergeOverlapping(blocks: ScheduleBlock[]) {
  const result: ScheduleBlock[] = [];
  blocks.forEach((item) => {
    const last = result[result.length - 1];
    if (last && toMinutes(item.start) < toMinutes(last.end)) {
      last.end = fromMinutes(Math.max(toMinutes(last.end), toMinutes(item.end)));
      last.title = last.title.includes(item.title) ? last.title : `${last.title} / ${item.title}`;
      last.courseId = last.courseId ?? item.courseId;
    } else {
      result.push({ ...item });
    }
  });
  return result;
}

function mergeTimeBlocks(blocks: TimeBlock[]) {
  return blocks.filter((block, index, array) => {
    if (block.kind !== "meal") return true;
    return !array.some((other) => other.id !== block.id && other.kind !== "meal" && overlaps(block, other));
  });
}

function overlaps(a: TimeBlock, b: TimeBlock) {
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

function countPriorities(tasks: PlanningTask[]) {
  return tasks.reduce(
    (counts, task) => ({ ...counts, [task.priorityBand]: counts[task.priorityBand] + 1 }),
    { P1: 0, P2: 0, P3: 0, P4: 0 } as Record<PriorityBand, number>,
  );
}

function bedtimeFor(weekday: number, checkIn: EnergyCheckIn) {
  const base = weekday === 1 || weekday === 3 ? "00:15" : "00:30";
  if (checkIn.sleepHours < 6.5) return addMinutes(base, -15);
  return base;
}

function hasEarlyClassTomorrow(date: string) {
  return [1, 3].includes(weekdayIndex(addDaysKey(date, 1)));
}

function courseName(courseId: string) {
  return seedCourses.find((course) => course.id === courseId)?.name ?? courseId;
}

function weekdayIndex(date: string) {
  return new Date(`${date}T12:00:00`).getDay();
}

function daysUntil(from: string, to: string) {
  const diff = new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime();
  return Math.round(diff / 86_400_000);
}

function startOfWeek(date: string) {
  const value = new Date(`${date}T12:00:00`);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  return value.toISOString().slice(0, 10);
}

function addDaysKey(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function fromMinutes(value: number) {
  const minutes = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function addMinutes(time: string, minutes: number) {
  return fromMinutes(toMinutes(time) + minutes);
}

function minutesBetween(start: string, end: string) {
  return Math.max(0, toMinutes(end) - toMinutes(start));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
