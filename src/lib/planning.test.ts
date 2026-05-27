import assert from "node:assert/strict";
import test from "node:test";
import { buildFixedBlocks, generateDailyPlan } from "@/lib/planning";

test("Thursday stays conservative and skips Prog 1 attendance block", () => {
  const plan = generateDailyPlan({ date: "2026-05-21", calendarEvents: [], checkIn: { sleepHours: 7, energy: 4, stress: 3 } });
  const fixed = buildFixedBlocks("2026-05-21", []);
  const commuteBlocks = plan.timeBlocks.filter((block) => block.kind === "commute");
  const learningBlocks = plan.timeBlocks.filter((block) => block.kind === "learning");

  assert.equal(plan.dayType, "heavy");
  assert.ok(plan.timeBlocks.some((block) => block.title.includes("Programmieren 2")));
  assert.ok(plan.timeBlocks.some((block) => block.title.includes("Algorithmen")));
  assert.equal(fixed.some((block) => block.courseId === "prog1"), false);
  assert.equal(commuteBlocks.filter((block) => block.title === "Hinweg zur Uni").length, 1);
  assert.equal(commuteBlocks.filter((block) => block.title === "Rückweg von der Uni").length, 1);
  assert.ok(learningBlocks.length <= 2);
});

test("Home day skips campus attendance and commute but keeps self-study visible", () => {
  const plan = generateDailyPlan({
    date: "2026-05-21",
    calendarEvents: [],
    checkIn: { sleepHours: 7, energy: 4, stress: 2 },
    goesToUniversity: false,
  });
  const titles = [...plan.timeBlocks.map((block) => block.title), ...plan.deferredTasks.map((task) => task.title)];

  assert.equal(plan.timeBlocks.some((block) => block.kind === "commute"), false);
  assert.equal(plan.timeBlocks.some((block) => block.kind === "calendar" && block.title.includes("Programmieren 2")), false);
  assert.ok(titles.some((title) => title.includes("Programmieren 1")));
  assert.ok(titles.some((title) => title.includes("Programmieren 2")));
});

test("Vacation calendar entry replaces the seeded university schedule", () => {
  const plan = generateDailyPlan({
    date: "2026-05-21",
    calendarEvents: [
      {
        id: "vacation-2026-05-21",
        title: "Urlaub",
        date: "2026-05-21",
        startTime: "00:00",
        endTime: "23:59",
        isAllDay: true,
        blocksSchedule: true,
      },
    ],
    checkIn: { sleepHours: 8, energy: 6, stress: 1 },
  });
  const fixed = buildFixedBlocks("2026-05-21", [
    {
      id: "vacation-2026-05-21",
      title: "Urlaub",
      date: "2026-05-21",
      startTime: "00:00",
      endTime: "23:59",
      isAllDay: true,
      blocksSchedule: true,
    },
  ]);

  assert.ok(plan.timeBlocks.some((block) => block.kind === "calendar" && block.title === "Urlaub"));
  assert.equal(plan.timeBlocks.some((block) => block.title.includes("Programmieren 2")), false);
  assert.equal(plan.timeBlocks.some((block) => block.title.includes("Algorithmen")), false);
  assert.deepEqual(fixed.map((block) => block.title), ["Urlaub"]);
});

test("Prog 2 testat outranks normal study work during deadline week", () => {
  const plan = generateDailyPlan({ date: "2026-05-22", calendarEvents: [], checkIn: { sleepHours: 7.5, energy: 4, stress: 2 } });
  const prog2 = plan.timeBlocks.find((block) => block.title.includes("Programmieren 2") && block.priorityBand === "P1");

  assert.ok(prog2);
  assert.ok((prog2?.title ?? "").match(/Kernimplementation|Tests|Debugging|Requirements|Setup|Finalcheck/));
});

test("Prog 1 remains visible as self-study despite attendanceExpected false", () => {
  const plan = generateDailyPlan({ date: "2026-05-23", calendarEvents: [], checkIn: { sleepHours: 8, energy: 4, stress: 2 } });
  const plannedOrDeferred = [...plan.timeBlocks.map((block) => block.title), ...plan.deferredTasks.map((task) => task.title)];

  assert.ok(plannedOrDeferred.some((title) => title.includes("Programmieren 1")));
});

test("Soft Skills paper uses T-1 internal deadline and appears before real due date", () => {
  const plan = generateDailyPlan({ date: "2026-05-22", calendarEvents: [], checkIn: { sleepHours: 7, energy: 4, stress: 2 } });
  const paper = plan.activeDeadlines.find((deadline) => deadline.id === "softskills-paper-2026-05-29");
  const paperTaskVisible = [...plan.timeBlocks.map((block) => block.title), ...plan.deferredTasks.map((task) => task.title)].some((title) =>
    title.includes("Soft Skills"),
  );

  assert.equal(paper?.internalDueAt, "2026-05-28");
  assert.equal(paperTaskVisible, true);
});

test("Emergency mode keeps one core task and defers lower priorities", () => {
  const plan = generateDailyPlan({ date: "2026-05-22", calendarEvents: [], checkIn: { sleepHours: 5.5, energy: 2, stress: 4 } });
  const learningBlocks = plan.timeBlocks.filter((block) => block.kind === "learning");

  assert.equal(plan.mode, "emergency");
  assert.ok(learningBlocks.length <= 2);
  assert.ok(learningBlocks.filter((block) => block.priorityBand === "P1").length <= 1);
  assert.ok(plan.deferredTasks.length > 0);
});

test("Carry-over returns with boosted priority", () => {
  const plan = generateDailyPlan({
    date: "2026-05-23",
    calendarEvents: [],
    checkIn: { sleepHours: 7, energy: 4, stress: 2 },
    carryOvers: [
      {
        id: "prog2-leftover",
        title: "Programmieren 2: Debugging-Puffer",
        courseId: "prog2",
        kind: "debug",
        estimatedMinutes: 60,
        minChunkMinutes: 30,
        requiresDeepFocus: false,
        movable: true,
        priorityScore: 5,
        priorityBand: "P2",
        carryOverCount: 0,
        blocked: false,
      },
    ],
  });

  assert.ok([...plan.timeBlocks.map((block) => block.title), ...plan.deferredTasks.map((task) => task.title)].some((title) => title.includes("Debugging-Puffer")));
});
