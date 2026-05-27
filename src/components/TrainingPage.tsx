"use client";

import { AlertTriangle, CheckCircle2, Dumbbell, ImageIcon, PlayCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Exercise, MuscleGroup, WorkoutPlan } from "@/lib/training/types";

type TrainingPayload = {
  id: number;
  date: string;
  version: number;
  plan: WorkoutPlan;
  motivationScore: number | null;
  readinessScore: number;
  generatedAt: string;
  completedAt: string | null;
  regenerationsUsed: number;
  regenerationsRemaining: number;
  regenerationLimit: number;
};

type CompletedSets = Record<string, number[]>;

const muscleLabels: Record<MuscleGroup, string> = {
  chest: "Brust",
  back: "Rücken",
  shoulders: "Schultern",
  biceps: "Bizeps",
  triceps: "Trizeps",
  core: "Bauch",
  legs: "Beine",
  glutes: "Gesäß",
  calves: "Waden",
  forearms: "Unterarme",
  mobility: "Mobility",
};

const planTypeLabels: Record<string, string> = {
  starter: "Starter",
  normal: "Normal",
  low_motivation: "Niedrige Motivation",
  recovery: "Erholung",
  progression: "Fortschritt",
  deload: "Deload",
  comeback: "Comeback",
};

export function TrainingPage() {
  const [training, setTraining] = useState<TrainingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedSets, setCompletedSets] = useState<CompletedSets>({});
  const [motivationScore, setMotivationScore] = useState(5);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function load() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/training/today");
      if (!response.ok) throw new Error("Training konnte nicht geladen werden.");
      const data = (await response.json()) as { training: TrainingPayload | null };
      if (!data.training) throw new Error("Training konnte nicht vorbereitet werden.");
      setTraining(data.training);
      setMotivationScore(data.training.motivationScore ?? 5);
      setCompletedSets(loadCompletedSets(data.training));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Training konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    if (training?.regenerationsRemaining === 0) return;
    setError("");
    setSaved("");
    setGenerating(true);
    try {
      const response = await fetch("/api/training/regenerate", {
        method: "POST",
        body: JSON.stringify({ motivationScore }),
      });
      const data = (await response.json()) as { plan?: TrainingPayload | null; training?: TrainingPayload | null; error?: string };
      const next = data.plan ?? data.training;
      if (!response.ok) throw new Error(data.error ?? "Tageslimit fuer Neu-Generierungen erreicht.");
      if (!next) throw new Error("Training konnte nicht neu generiert werden.");
      setTraining(next);
      setCompletedSets({});
    } catch (regenerateError) {
      setError(regenerateError instanceof Error ? regenerateError.message : "Training konnte nicht neu generiert werden.");
    } finally {
      setGenerating(false);
    }
  }

  async function completePlan() {
    if (!training) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/training/complete", {
        method: "POST",
        body: JSON.stringify({
          planId: training.id,
          completed: true,
          checkedExercises: checkedPayload(completedSets),
          effortActual: Math.max(1, Math.min(5, Math.ceil(training.plan.intensity / 20))),
          durationActual: training.plan.durationMin,
        }),
      });
      if (!response.ok) throw new Error("Training konnte nicht gespeichert werden.");
      setSaved("Training gespeichert.");
      await load();
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Training konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
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

  function toggleSet(exerciseId: string, setIndex: number) {
    setCompletedSets((current) => {
      const done = new Set(current[exerciseId] ?? []);
      if (done.has(setIndex)) {
        done.delete(setIndex);
      } else {
        done.add(setIndex);
      }
      return { ...current, [exerciseId]: Array.from(done).sort((a, b) => a - b) };
    });
  }

  function completeNextSet(exerciseId: string, setCount: number) {
    setCompletedSets((current) => {
      const done = new Set(current[exerciseId] ?? []);
      const nextOpen = Array.from({ length: setCount }, (_, index) => index).find((index) => !done.has(index));
      if (nextOpen === undefined) return { ...current, [exerciseId]: [] };
      done.add(nextOpen);
      return { ...current, [exerciseId]: Array.from(done).sort((a, b) => a - b) };
    });
  }

  if (loading) return <TrainingLoading />;

  return (
    <div className="training-page">
      <header className="training-hero">
        <div className="training-hero-copy">
          <span className="eyebrow">
            <span className="dot" />
            Trainingsplan
          </span>
          <h1 className="page-title">{plan?.title ?? "Heute"}</h1>
          <p className="lead">{plan?.summary ?? "Dein Tagesplan für zuhause wird vorbereitet."}</p>
        </div>
        <div className="training-actions">
          <label className="motivation-slider">
            <span>Motivation {motivationScore}/10</span>
            <input min={1} max={10} type="range" value={motivationScore} onChange={(event) => setMotivationScore(Number(event.target.value))} />
          </label>
          <button className="primary training-refresh" onClick={regenerate} disabled={generating || training?.regenerationsRemaining === 0}>
            <RefreshCw size={18} className={generating ? "spin" : ""} />
            {generating ? "Wird generiert" : "Neu generieren"}
          </button>
          {training ? <span className="muted small">Noch {training.regenerationsRemaining} von {training.regenerationLimit} heute</span> : null}
        </div>
      </header>

      {error ? (
        <div className="card training-alert">
          <AlertTriangle size={19} />
          <span>{error}</span>
        </div>
      ) : null}

      {saved ? (
        <div className="card training-success">
          <CheckCircle2 size={19} />
          <span>{saved}</span>
        </div>
      ) : null}

      {plan && training ? (
        <section className="training-tracker">
          <div className="tracker-label">Heute</div>
          <div className="tracker-stats">
            <StatCard label="Dauer" value={stats?.duration ?? 0} suffix=" min" tone="green" />
            <StatCard label="Intensität" value={stats?.intensity ?? 0} suffix="/100" tone="amber" />
            <StatCard label="Readiness" value={training.readinessScore} suffix="/100" tone="violet" />
          </div>

          <div className="tracker-section-head">
            <span>Warm-up</span>
            <small>{generatedAt ? `Aktualisiert ${generatedAt}` : null}</small>
          </div>
          <div className="tracker-exercises">
            {plan.warmup.map((exercise, index) => (
              <ExerciseCard
                completedSetIndexes={completedSets[exercise.id] ?? []}
                exercise={exercise}
                index={index}
                key={exercise.id}
                onCompleteNextSet={completeNextSet}
                onToggleSet={toggleSet}
              />
            ))}
          </div>

          <div className="tracker-section-head">
            <span>Übungen</span>
            <strong>{planTypeLabels[plan.type] ?? plan.type}</strong>
          </div>

          <div className="tracker-exercises">
            {plan.exercises.map((exercise, index) => (
              <ExerciseCard
                completedSetIndexes={completedSets[exercise.id] ?? []}
                exercise={exercise}
                index={plan.warmup.length + index}
                key={exercise.id}
                onCompleteNextSet={completeNextSet}
                onToggleSet={toggleSet}
              />
            ))}
          </div>

          <div className="tracker-section-head">
            <span>Cooldown</span>
            <small>{plan.focusMuscles.map((muscle) => muscleLabels[muscle]).join(", ")}</small>
          </div>
          <div className="tracker-exercises">
            {plan.cooldown.map((exercise, index) => (
              <ExerciseCard
                completedSetIndexes={completedSets[exercise.id] ?? []}
                exercise={exercise}
                index={plan.warmup.length + plan.exercises.length + index}
                key={exercise.id}
                onCompleteNextSet={completeNextSet}
                onToggleSet={toggleSet}
              />
            ))}
          </div>

          <button className="primary training-complete" onClick={completePlan} disabled={saving || Boolean(training.completedAt)}>
            <CheckCircle2 size={18} />
            {training.completedAt ? "Fertig gespeichert" : saving ? "Speichert" : "Fertig"}
          </button>
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
        <span className="muted small loading-dots">Der Tagesplan wird lokal berechnet<span>.</span><span>.</span><span>.</span></span>
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

function ExerciseCard({
  completedSetIndexes,
  exercise,
  index,
  onCompleteNextSet,
  onToggleSet,
}: {
  completedSetIndexes: number[];
  exercise: Exercise;
  index: number;
  onCompleteNextSet: (exerciseId: string, setCount: number) => void;
  onToggleSet: (exerciseId: string, setIndex: number) => void;
}) {
  const reps = exercise.reps ?? durationLabel(exercise);
  const setCount = Math.max(1, exercise.sets || 1);
  const completed = new Set(completedSetIndexes);
  const isFinished = completed.size >= setCount;

  return (
    <article className="tracker-exercise-card">
      <div className="tracker-exercise-head">
        <ExerciseVisual exercise={exercise} />
        <div className="exercise-number">{index + 1}</div>
        <div>
          <h3>{exercise.name}</h3>
          <div className="pill-grid">
            <span className="pill">{muscleLabels[exercise.muscleGroup]}</span>
            {exercise.secondaryMuscles?.slice(0, 2).map((muscle) => (
              <span className="pill" key={`${exercise.id}-${muscle}`}>{muscleLabels[muscle]}</span>
            ))}
          </div>
        </div>
        <button
          className={`play-button ${isFinished ? "finished" : ""}`}
          aria-label={isFinished ? `${exercise.name} zurücksetzen` : `Nächstes Set von ${exercise.name} abschließen`}
          onClick={() => onCompleteNextSet(exercise.id, setCount)}
        >
          {isFinished ? <CheckCircle2 size={25} /> : <PlayCircle size={25} />}
        </button>
      </div>
      <div className="set-table" role="table" aria-label={`Sets für ${exercise.name}`}>
        <div className="set-table-head" role="row">
          <span role="columnheader">Set</span>
          <span role="columnheader">Equipment</span>
          <span role="columnheader">Reps</span>
          <span role="columnheader">Status</span>
        </div>
        {Array.from({ length: setCount }, (_, setIndex) => (
          <div className={`set-row ${completed.has(setIndex) ? "done" : ""}`} role="row" key={`${exercise.id}-set-${setIndex + 1}`}>
            <strong role="cell">Set {setIndex + 1}</strong>
            <span role="cell">{equipmentLabel(exercise)}</span>
            <span role="cell">{reps}</span>
            <span role="cell">
              <button
                className="status-pill"
                onClick={() => onToggleSet(exercise.id, setIndex)}
                aria-pressed={completed.has(setIndex)}
                aria-label={`Set ${setIndex + 1} von ${exercise.name} ${completed.has(setIndex) ? "als offen markieren" : "abhaken"}`}
              >
                {completed.has(setIndex) ? "Fertig" : "Offen"}
              </button>
            </span>
          </div>
        ))}
      </div>
      {exercise.instructions ? <p className="exercise-instructions">{exercise.instructions}</p> : null}
      <p className="muted small">Pause: {exercise.restSec} Sek. · Schwierigkeit: {exercise.difficulty}/5</p>
    </article>
  );
}

function ExerciseVisual({ exercise }: { exercise: Exercise }) {
  const visual = exercise.visual;
  if (visual?.url && visual.type !== "placeholder" && visual.type !== "none") {
    return <div className="exercise-visual" role="img" aria-label={visual.alt ?? exercise.name} style={{ backgroundImage: `url(${visual.url})` }} />;
  }
  return (
    <div className="exercise-visual placeholder" aria-label={`Platzhalter fuer ${exercise.name}`}>
      <ImageIcon size={18} />
    </div>
  );
}

function getTrainingStats(plan: WorkoutPlan) {
  return {
    duration: plan.durationMin,
    intensity: plan.intensity,
  };
}

function durationLabel(exercise: Exercise) {
  if (!exercise.durationSec) return "sauber";
  if (exercise.durationSec < 60) return `${exercise.durationSec} Sekunden`;
  return `${Math.round(exercise.durationSec / 60)} Minuten`;
}

function equipmentLabel(exercise: Exercise) {
  if (exercise.equipment.includes("pullup_bar")) return "Stange";
  if (exercise.equipment.includes("treadmill")) return "Laufband";
  return "Bodyweight";
}

function checkedPayload(completedSets: CompletedSets) {
  return Object.entries(completedSets).flatMap(([exerciseId, sets]) => sets.map((setIndex) => ({ exerciseId, setIndex, checked: true })));
}

function completedSetsStorageKey(training: TrainingPayload) {
  return `dayframe_training_completion_${training.date}_${training.id}`;
}

function loadCompletedSets(training: TrainingPayload): CompletedSets {
  try {
    const saved = localStorage.getItem(completedSetsStorageKey(training));
    return saved ? (JSON.parse(saved) as CompletedSets) : {};
  } catch {
    return {};
  }
}
