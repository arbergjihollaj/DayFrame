import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defaultNewsSources, defaultSettings } from "@/lib/defaults";
import type { Briefing, DailyContext, DailyPlanDetails, DailyTrainingPlan, EnergyCheckIn, PlanningTask, Settings, Subject, Topic } from "@/lib/types";

const isNextProductionBuild = process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
const dbPath = isNextProductionBuild
  ? path.join(os.tmpdir(), `dayframe-build-${process.pid}.sqlite`)
  : process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "dayframe.sqlite");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const globalForDb = globalThis as unknown as { dayframeDb?: Database.Database };
export const db = globalForDb.dayframeDb ?? new Database(dbPath);
globalForDb.dayframeDb = db;
db.pragma("journal_mode = WAL");

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS news_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      generatedAt TEXT NOT NULL,
      greeting TEXT NOT NULL,
      weatherJson TEXT NOT NULL,
      dayPlanJson TEXT NOT NULL,
      newsJson TEXT NOT NULL,
      tomorrowPreviewJson TEXT NOT NULL,
      weekLoadJson TEXT NOT NULL,
      errorsJson TEXT NOT NULL,
      dayRating TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS routine_todo_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      briefingId INTEGER NOT NULL,
      todoId TEXT NOT NULL,
      title TEXT NOT NULL,
      section TEXT NOT NULL,
      checked INTEGER NOT NULL DEFAULT 0,
      checkedAt TEXT,
      UNIQUE(briefingId, todoId)
    );
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subjectId INTEGER NOT NULL,
      name TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 3,
      lastStudiedAt TEXT,
      examDate TEXT,
      deadlineDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(subjectId) REFERENCES subjects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS generation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      errorMessage TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS daily_context (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      goesToUniversity INTEGER NOT NULL,
      answeredAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS energy_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      sleepHours REAL NOT NULL,
      energy INTEGER NOT NULL,
      stress INTEGER NOT NULL,
      soreness INTEGER NOT NULL DEFAULT 2,
      unexpectedEvents TEXT,
      manualEmergency INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS planning_task_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      taskId TEXT NOT NULL,
      taskJson TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      progressPercent INTEGER,
      nextStep TEXT,
      actualBedtime TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(date, taskId)
    );
    CREATE TABLE IF NOT EXISTS training_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      generatedAt TEXT NOT NULL,
      planJson TEXT NOT NULL,
      source TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'normal',
      errorMessage TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
  const columns = db.prepare("PRAGMA table_info(briefings)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "planningJson")) {
    try {
      db.exec("ALTER TABLE briefings ADD COLUMN planningJson TEXT");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("duplicate column")) throw error;
    }
  }
  const trainingColumns = db.prepare("PRAGMA table_info(training_plans)").all() as { name: string }[];
  if (!trainingColumns.some((column) => column.name === "difficulty")) {
    try {
      db.exec("ALTER TABLE training_plans ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'normal'");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("duplicate column")) throw error;
    }
  }
}

function seedDefaults() {
  const now = new Date().toISOString();
  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)");
  Object.entries(defaultSettings).forEach(([key, value]) => {
    insertSetting.run(key, JSON.stringify(value), now);
  });

  const insert = db.prepare(
    "INSERT INTO news_sources (name, url, category, enabled, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)",
  );
  const existingByUrl = db.prepare("SELECT id FROM news_sources WHERE url = ?");
  defaultNewsSources.forEach((source) => {
    if (!existingByUrl.get(source.url)) {
      insert.run(source.name, source.url, source.category, now, now);
    }
  });

  db.prepare(`
    UPDATE news_sources
    SET enabled = 0, updatedAt = ?
    WHERE category = 'Deutschland'
      AND url IN (
        'https://www.tagesschau.de/xml/rss2',
        'https://www.deutschlandfunk.de/nachrichten-100.rss',
        'https://newsfeed.zeit.de/index'
      )
  `).run(now);

  db.prepare("UPDATE news_sources SET category = 'AI', updatedAt = ? WHERE category = 'KI / OpenAI / Tech'").run(now);
  db.prepare("UPDATE settings SET value = replace(value, 'KI / OpenAI / Tech', 'AI'), updatedAt = ? WHERE key = 'newsCategories'").run(now);
  db.prepare("UPDATE briefings SET newsJson = replace(newsJson, 'KI / OpenAI / Tech', 'AI'), updatedAt = ? WHERE newsJson LIKE '%KI / OpenAI / Tech%'").run(now);
}

runMigrations();
seedDefaults();

export function getSettings(): Settings {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const values = { ...defaultSettings } as Record<string, unknown>;
  rows.forEach((row) => {
    try {
      values[row.key] = JSON.parse(row.value);
    } catch {
      values[row.key] = row.value;
    }
  });
  return values as Settings;
}

export function saveSettings(input: Partial<Settings>) {
  const now = new Date().toISOString();
  const statement = db.prepare(`
    INSERT INTO settings (key, value, updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `);
  Object.entries(input).forEach(([key, value]) => {
    statement.run(key, JSON.stringify(value), now);
  });
  return getSettings();
}

export function getNewsSources() {
  return db.prepare("SELECT * FROM news_sources ORDER BY category, name").all();
}

export function upsertNewsSource(input: { id?: number; name: string; url: string; category: string; enabled: boolean }) {
  const now = new Date().toISOString();
  if (input.id) {
    db.prepare("UPDATE news_sources SET name=?, url=?, category=?, enabled=?, updatedAt=? WHERE id=?").run(
      input.name,
      input.url,
      input.category,
      input.enabled ? 1 : 0,
      now,
      input.id,
    );
  } else {
    db.prepare("INSERT INTO news_sources (name, url, category, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)").run(
      input.name,
      input.url,
      input.category,
      input.enabled ? 1 : 0,
      now,
      now,
    );
  }
}

export function deleteNewsSource(id: number) {
  db.prepare("DELETE FROM news_sources WHERE id=?").run(id);
}

export function parseBriefing(row: Record<string, unknown>): Briefing {
  return {
    id: Number(row.id),
    date: String(row.date),
    generatedAt: String(row.generatedAt),
    greeting: String(row.greeting),
    weather: JSON.parse(String(row.weatherJson)),
    dayPlan: JSON.parse(String(row.dayPlanJson)),
    planning: row.planningJson ? (JSON.parse(String(row.planningJson)) as DailyPlanDetails) : null,
    news: JSON.parse(String(row.newsJson)),
    tomorrowPreview: JSON.parse(String(row.tomorrowPreviewJson)),
    weekLoad: JSON.parse(String(row.weekLoadJson)),
    errors: JSON.parse(String(row.errorsJson)),
    dayRating: row.dayRating ? String(row.dayRating) : null,
  };
}

export function getBriefingByDate(date: string) {
  const row = db.prepare("SELECT * FROM briefings WHERE date=?").get(date) as Record<string, unknown> | undefined;
  return row ? parseBriefing(row) : null;
}

export function saveBriefing(briefing: Omit<Briefing, "id" | "dayRating">) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO briefings
      (date, generatedAt, greeting, weatherJson, dayPlanJson, newsJson, tomorrowPreviewJson, weekLoadJson, errorsJson, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      generatedAt=excluded.generatedAt,
      greeting=excluded.greeting,
      weatherJson=excluded.weatherJson,
      dayPlanJson=excluded.dayPlanJson,
      newsJson=excluded.newsJson,
      tomorrowPreviewJson=excluded.tomorrowPreviewJson,
      weekLoadJson=excluded.weekLoadJson,
      errorsJson=excluded.errorsJson,
      updatedAt=excluded.updatedAt
  `).run(
    briefing.date,
    briefing.generatedAt,
    briefing.greeting,
    JSON.stringify(briefing.weather),
    JSON.stringify(briefing.dayPlan),
    JSON.stringify(briefing.news),
    JSON.stringify(briefing.tomorrowPreview),
    JSON.stringify(briefing.weekLoad),
    JSON.stringify(briefing.errors),
    now,
    now,
  );
  db.prepare("UPDATE briefings SET planningJson=?, updatedAt=? WHERE date=?").run(
    JSON.stringify(briefing.planning ?? null),
    now,
    briefing.date,
  );
  const saved = getBriefingByDate(briefing.date);
  if (!saved) throw new Error("Briefing could not be saved");
  db.prepare("DELETE FROM routine_todo_status WHERE briefingId=?").run(saved.id);
  Object.entries(saved.dayPlan).forEach(([section, items]) => {
    items
      .filter((item) => item.type === "routine" || item.type === "sleep")
      .forEach((item) => {
        db.prepare(
          "INSERT OR IGNORE INTO routine_todo_status (briefingId, todoId, title, section, checked) VALUES (?, ?, ?, ?, 0)",
        ).run(saved.id, item.id, item.title, section);
      });
  });
  cleanupOldBriefings();
  return saved;
}

export function getRoutineStatuses(briefingId: number) {
  return db.prepare("SELECT * FROM routine_todo_status WHERE briefingId=?").all(briefingId);
}

export function setRoutineChecked(briefingId: number, todoId: string, checked: boolean) {
  db.prepare("UPDATE routine_todo_status SET checked=?, checkedAt=? WHERE briefingId=? AND todoId=?").run(
    checked ? 1 : 0,
    checked ? new Date().toISOString() : null,
    briefingId,
    todoId,
  );
}

export function setDayRating(briefingId: number, rating: string) {
  db.prepare("UPDATE briefings SET dayRating=?, updatedAt=? WHERE id=?").run(rating, new Date().toISOString(), briefingId);
}

export function getRecentBriefings(limit = 7) {
  const rows = db.prepare("SELECT * FROM briefings ORDER BY date DESC LIMIT ?").all(limit) as Record<string, unknown>[];
  return rows.map(parseBriefing);
}

export function cleanupOldBriefings() {
  db.prepare("DELETE FROM briefings WHERE id NOT IN (SELECT id FROM briefings ORDER BY date DESC LIMIT 7)").run();
}

export function getDailyContext(date: string): DailyContext | null {
  const row = db.prepare("SELECT * FROM daily_context WHERE date=?").get(date) as
    | { id: number; date: string; goesToUniversity: number; answeredAt: string }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    goesToUniversity: Boolean(row.goesToUniversity),
    source: "daily-modal",
    answeredAt: row.answeredAt,
  };
}

export function saveDailyContext(date: string, goesToUniversity: boolean): DailyContext {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO daily_context (date, goesToUniversity, answeredAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      goesToUniversity=excluded.goesToUniversity,
      answeredAt=excluded.answeredAt,
      updatedAt=excluded.updatedAt
  `).run(date, goesToUniversity ? 1 : 0, now, now, now);
  const saved = getDailyContext(date);
  if (!saved) throw new Error("Daily context could not be saved");
  return saved;
}

export function deleteDailyContext(date: string) {
  db.prepare("DELETE FROM daily_context WHERE date=?").run(date);
}

export function getEnergyCheckIn(date: string): EnergyCheckIn | null {
  const row = db.prepare("SELECT * FROM energy_checkins WHERE date=?").get(date) as
    | {
        id: number;
        date: string;
        sleepHours: number;
        energy: number;
        stress: number;
        soreness: number;
        unexpectedEvents: string | null;
        manualEmergency: number;
      }
    | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    date: row.date,
    sleepHours: Number(row.sleepHours),
    energy: Number(row.energy),
    stress: Number(row.stress),
    soreness: Number(row.soreness),
    unexpectedEvents: row.unexpectedEvents ?? undefined,
    manualEmergency: Boolean(row.manualEmergency),
  };
}

export function saveEnergyCheckIn(input: Omit<EnergyCheckIn, "id">): EnergyCheckIn {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO energy_checkins (date, sleepHours, energy, stress, soreness, unexpectedEvents, manualEmergency, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      sleepHours=excluded.sleepHours,
      energy=excluded.energy,
      stress=excluded.stress,
      soreness=excluded.soreness,
      unexpectedEvents=excluded.unexpectedEvents,
      manualEmergency=excluded.manualEmergency,
      updatedAt=excluded.updatedAt
  `).run(
    input.date,
    input.sleepHours,
    input.energy,
    input.stress,
    input.soreness,
    input.unexpectedEvents ?? null,
    input.manualEmergency ? 1 : 0,
    now,
    now,
  );
  const saved = getEnergyCheckIn(input.date);
  if (!saved) throw new Error("Energy check-in could not be saved");
  return saved;
}

export function getCarryOverTasks(date: string): PlanningTask[] {
  const rows = db.prepare("SELECT taskJson FROM planning_task_status WHERE date < ? AND status != 'done' ORDER BY date DESC LIMIT 12").all(date) as {
    taskJson: string;
  }[];
  return rows.map((row) => JSON.parse(row.taskJson) as PlanningTask);
}

export function getSubjects(): Subject[] {
  return db.prepare("SELECT id, name FROM subjects ORDER BY name").all() as Subject[];
}

export function createSubject(name: string) {
  const now = new Date().toISOString();
  db.prepare("INSERT INTO subjects (name, createdAt, updatedAt) VALUES (?, ?, ?)").run(name, now, now);
}

export function deleteSubject(id: number) {
  db.prepare("DELETE FROM subjects WHERE id=?").run(id);
}

export function getTopics(subjectId?: number): Topic[] {
  const sql = `
    SELECT topics.*, subjects.name as subjectName
    FROM topics JOIN subjects ON subjects.id = topics.subjectId
    ${subjectId ? "WHERE subjectId=?" : ""}
    ORDER BY subjects.name, topics.name
  `;
  return (subjectId ? db.prepare(sql).all(subjectId) : db.prepare(sql).all()) as Topic[];
}

export function createTopic(input: Omit<Topic, "id" | "subjectName" | "lastStudiedAt"> & { lastStudiedAt?: string | null }) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO topics (subjectId, name, confidence, lastStudiedAt, examDate, deadlineDate, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(input.subjectId, input.name, input.confidence, input.lastStudiedAt ?? null, input.examDate, input.deadlineDate, now, now);
}

export function updateTopic(id: number, input: Partial<Topic>) {
  const current = db.prepare("SELECT * FROM topics WHERE id=?").get(id) as Topic | undefined;
  if (!current) return;
  const next = { ...current, ...input };
  db.prepare(`
    UPDATE topics SET name=?, confidence=?, lastStudiedAt=?, examDate=?, deadlineDate=?, updatedAt=? WHERE id=?
  `).run(next.name, next.confidence, next.lastStudiedAt, next.examDate, next.deadlineDate, new Date().toISOString(), id);
}

export function updateTopicConfidence(id: number, confidence: number) {
  updateTopic(id, { confidence, lastStudiedAt: new Date().toISOString().slice(0, 10) });
}

export function deleteTopic(id: number) {
  db.prepare("DELETE FROM topics WHERE id=?").run(id);
}

export function getTrainingPlanByDate(date: string): { date: string; generatedAt: string; plan: DailyTrainingPlan; source: string; difficulty: string; errorMessage: string | null } | null {
  const row = db.prepare("SELECT date, generatedAt, planJson, source, difficulty, errorMessage FROM training_plans WHERE date=?").get(date) as
    | { date: string; generatedAt: string; planJson: string; source: string; difficulty: string; errorMessage: string | null }
    | undefined;
  if (!row) return null;
  return {
    date: row.date,
    generatedAt: row.generatedAt,
    plan: JSON.parse(row.planJson) as DailyTrainingPlan,
    source: row.source,
    difficulty: row.difficulty,
    errorMessage: row.errorMessage,
  };
}

export function saveTrainingPlan(date: string, plan: DailyTrainingPlan, source: "gemini" | "fallback", difficulty: string, errorMessage?: string | null) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO training_plans (date, generatedAt, planJson, source, difficulty, errorMessage, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      generatedAt=excluded.generatedAt,
      planJson=excluded.planJson,
      source=excluded.source,
      difficulty=excluded.difficulty,
      errorMessage=excluded.errorMessage,
      updatedAt=excluded.updatedAt
  `).run(date, now, JSON.stringify(plan), source, difficulty, errorMessage ?? null, now, now);
  return getTrainingPlanByDate(date);
}
