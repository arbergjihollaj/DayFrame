"use client";

import { AlertTriangle, Check, CheckCircle2, Dumbbell, PlayCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DailyTrainingPlan, TrainingExercise, WorkoutStep } from "@/lib/types";

type TrainingPayload = {
  date: string;
  generatedAt: string;
  plan: DailyTrainingPlan;
  source: string;
  errorMessage: string | null;
  retryAfterSeconds?: number;
};

type CompletedSets = Record<string, number[]>;

export function TrainingPage() {
  const [training, setTraining] = useState<TrainingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [completedSets, setCompletedSets] = useState<CompletedSets>({});
  const [error, setError] = useState("");

  async function load(method: "GET" | "POST" = "GET") {
    setError("");
    if (method === "POST") {
      setGenerating(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch("/api/training", { method });
      if (!response.ok) throw new Error("Training konnte nicht geladen werden.");
      const data = (await response.json()) as { training: TrainingPayload | null };
      if (!data.training) throw new Error("Training konnte nicht vorbereitet werden.");
      setTraining(data.training);
      setCompletedSets(loadCompletedSets(data.training));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Training konnte nicht geladen werden.");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const plan = training?.plan;
  const generatedAt = training ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(training.generatedAt)) : "";
  const stats = useMemo(() => (plan ? getTrainingStats(plan) : null), [plan]);

  useEffect(() => {
    if (!training) return;
    localStorage.setItem(completedSetsStorageKey(training), JSON.stringify(completedSets));
  }, [completedSets, training]);

  function toggleSet(exerciseKey: string, setIndex: number) {
    setCompletedSets((current) => {
      const done = new Set(current[exerciseKey] ?? []);
      if (done.has(setIndex)) {
        done.delete(setIndex);
      } else {
        done.add(setIndex);
      }
      return { ...current, [exerciseKey]: Array.from(done).sort((a, b) => a - b) };
    });
  }

  function completeNextSet(exerciseKey: string, setCount: number) {
    setCompletedSets((current) => {
      const done = new Set(current[exerciseKey] ?? []);
      const nextOpen = Array.from({ length: setCount }, (_, index) => index).find((index) => !done.has(index));
      if (nextOpen === undefined) {
        return { ...current, [exerciseKey]: [] };
      }
      done.add(nextOpen);
      return { ...current, [exerciseKey]: Array.from(done).sort((a, b) => a - b) };
    });
  }

  if (loading) return <TrainingLoading />;

  return (
    <div className="training-page">
      <header className="training-hero">
        <div className="training-hero-copy">
          <span className="eyebrow">
            <span className="dot" />
            Training
          </span>
          <h1 className="page-title">{plan?.title ?? "Heutiges Workout"}</h1>
          <p className="lead">Dein Tagesplan für zuhause, passend zu Laufband, Pull-up-Stange, Liegestützebrett, Yogamatte und Körpergewicht.</p>
        </div>
        <button className="primary training-refresh" onClick={() => load("POST")} disabled={generating}>
          <RefreshCw size={18} className={generating ? "spin" : ""} />
          {generating ? "Wird generiert" : "Neues Training generieren"}
        </button>
      </header>

      {error ? (
        <div className="card training-alert">
          <AlertTriangle size={19} />
          <span>{error}</span>
        </div>
      ) : null}

      {training?.source === "fallback" ? (
        <div className="card training-alert">
          <AlertTriangle size={19} />
          <span>
            <strong>Fallback-Training aktiv.</strong>{" "}
            {training.errorMessage ?? "Gemini konnte gerade keinen Plan erstellen."}
            {training.retryAfterSeconds ? ` Neuer Versuch in ca. ${training.retryAfterSeconds} Sekunden sinnvoll.` : ""}
          </span>
        </div>
      ) : null}

      {plan ? (
        <section className="training-tracker">
          <div className="tracker-label">Recent Stats</div>
          <div className="tracker-stats">
            <StatCard label="Volume" value={stats?.volume ?? 0} suffix=" sets" tone="violet" />
            <StatCard label="Duration" value={stats?.duration ?? 0} suffix=" min" tone="green" />
            <StatCard label="Intensity" value={stats?.intensity ?? 0} suffix="%" tone="amber" />
          </div>

          <div className="tracker-section-head">
            <span>Warm-up</span>
            <strong>Completed</strong>
          </div>
          <div className="warmup-complete-card">
            <div className="complete-icon"><Check size={20} /></div>
            <div>
              <h2>{plan.warmup[0]?.name ?? "Warm-up"}</h2>
              <p>{plan.warmup[0]?.duration ?? "5 Minuten"} · Mobility Focus</p>
            </div>
          </div>

          <div className="tracker-section-head">
            <span>Current Exercises</span>
            {generatedAt ? <small>Updated {generatedAt}</small> : null}
          </div>

          <div className="tracker-exercises">
            {plan.exercises.map((exercise, index) => (
              <ExerciseCard
                completedSetIndexes={completedSets[exerciseKey(exercise, index)] ?? []}
                exercise={exercise}
                index={index}
                key={`${exercise.name}-${exercise.sets}-${exercise.restSeconds}`}
                onCompleteNextSet={completeNextSet}
                onToggleSet={toggleSet}
              />
            ))}
          </div>

          <div className="tracker-section-head">
            <span>Cooldown</span>
            <small>{training.source === "gemini" ? "Gemini plan" : "Fallback plan"}</small>
          </div>
          <TrainingStepSection steps={plan.cooldown} />
        </section>
      ) : null}
    </div>
  );
}

function TrainingLoading() {
  return (
    <div className="training-page">
      <div className="card loading-card">
        <Dumbbell size={24} />
        <strong>Training wird vorbereitet</strong>
        <span className="muted small loading-dots">Gemini plant dein Workout<span>.</span><span>.</span><span>.</span></span>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, tone }: { label: string; value: string | number; suffix: string; tone: "violet" | "green" | "amber" }) {
  return (
    <article className="tracker-stat-card">
      <span>{label}</span>
      <strong className={`stat-${tone}`}>{value}<small>{suffix}</small></strong>
    </article>
  );
}

function TrainingStepSection({ steps }: { steps: WorkoutStep[] }) {
  return (
    <div className="cooldown-list">
      {steps.map((step) => (
        <article className="cooldown-row" key={step.name}>
          <CheckCircle2 size={18} />
          <div>
            <strong>{step.name}</strong>
            <p>{step.duration} · {step.instructions}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ExerciseCard({
  completedSetIndexes,
  exercise,
  index,
  onCompleteNextSet,
  onToggleSet,
}: {
  completedSetIndexes: number[];
  exercise: TrainingExercise;
  index: number;
  onCompleteNextSet: (exerciseKey: string, setCount: number) => void;
  onToggleSet: (exerciseKey: string, setIndex: number) => void;
}) {
  const reps = exercise.reps ?? exercise.duration ?? "sauber";
  const load = exercise.duration ? "Timed" : exercise.muscles.includes("Brust") || exercise.muscles.includes("Rücken") ? "Body" : "BW";
  const setCount = Math.max(1, exercise.sets || 1);
  const key = exerciseKey(exercise, index);
  const completed = new Set(completedSetIndexes);
  const isFinished = completed.size >= setCount;

  return (
    <article className="tracker-exercise-card">
      <div className="tracker-exercise-head">
        <div className="exercise-number">{index + 1}</div>
        <div>
          <h3>{exercise.name}</h3>
          <div className="pill-grid">
            {exercise.muscles.map((muscle) => (
              <span className="pill" key={`${exercise.name}-${muscle}`}>{muscle}</span>
            ))}
          </div>
        </div>
        <button
          className={`play-button ${isFinished ? "finished" : ""}`}
          aria-label={isFinished ? `${exercise.name} zurücksetzen` : `Nächstes Set von ${exercise.name} abschließen`}
          onClick={() => onCompleteNextSet(key, setCount)}
        >
          {isFinished ? <CheckCircle2 size={25} /> : <PlayCircle size={25} />}
        </button>
      </div>
      <div className="set-table" role="table" aria-label={`Sets für ${exercise.name}`}>
        <div className="set-table-head" role="row">
          <span role="columnheader">Set</span>
          <span role="columnheader">Weight</span>
          <span role="columnheader">Reps</span>
          <span role="columnheader">Status</span>
        </div>
        {Array.from({ length: setCount }, (_, setIndex) => (
          <div className={`set-row ${completed.has(setIndex) ? "done" : ""}`} role="row" key={`${exercise.name}-set-${setIndex + 1}`}>
            <strong role="cell">Set {setIndex + 1}</strong>
            <span role="cell">{load}</span>
            <span role="cell">{reps}</span>
            <span role="cell">
              <button
                className="status-pill"
                onClick={() => onToggleSet(key, setIndex)}
                aria-pressed={completed.has(setIndex)}
                aria-label={`Set ${setIndex + 1} von ${exercise.name} ${completed.has(setIndex) ? "als offen markieren" : "abschließen"}`}
              >
                {completed.has(setIndex) ? "Done" : "Ready"}
              </button>
            </span>
          </div>
        ))}
      </div>
      <p className="exercise-instructions">{exercise.instructions}</p>
      {exercise.techniqueTip ? <p className="technique-tip">{exercise.techniqueTip}</p> : null}
      <p className="muted small">Pause: {exercise.restSeconds} Sek. · Schwierigkeit: {exercise.difficulty}</p>
    </article>
  );
}

function getTrainingStats(plan: DailyTrainingPlan) {
  const totalSets = plan.exercises.reduce((sum, exercise) => sum + Math.max(1, exercise.sets || 1), 0);

  return {
    volume: totalSets,
    duration: plan.durationMinutes,
    intensity: plan.intensityPercent ?? estimateIntensity(plan),
  };
}

function estimateIntensity(plan: DailyTrainingPlan) {
  const averageDifficulty = Math.round(
    plan.exercises.reduce((sum, exercise) => sum + difficultyScore(exercise.difficulty), 0) / Math.max(1, plan.exercises.length),
  );
  const totalSets = plan.exercises.reduce((sum, exercise) => sum + Math.max(1, exercise.sets || 1), 0);
  const densityBonus = totalSets >= 22 ? 7 : totalSets >= 16 ? 3 : 0;
  const durationBonus = plan.durationMinutes >= 45 ? 4 : plan.durationMinutes <= 30 ? -4 : 0;
  return Math.max(35, Math.min(95, averageDifficulty + densityBonus + durationBonus));
}

function difficultyScore(difficulty: TrainingExercise["difficulty"]) {
  if (difficulty === "Leicht") return 58;
  if (difficulty === "Anspruchsvoll") return 88;
  return 74;
}

function exerciseKey(exercise: TrainingExercise, index: number) {
  return `${index}-${exercise.name}-${exercise.sets}-${exercise.restSeconds}`;
}

function completedSetsStorageKey(training: TrainingPayload) {
  return `dayframe_training_completion_${training.date}_${training.plan.title}`;
}

function loadCompletedSets(training: TrainingPayload): CompletedSets {
  try {
    const saved = localStorage.getItem(completedSetsStorageKey(training));
    return saved ? (JSON.parse(saved) as CompletedSets) : {};
  } catch {
    return {};
  }
}
