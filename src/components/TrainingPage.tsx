"use client";

import Body from "@mjcdev/react-body-highlighter";
import { AlertTriangle, Clock3, Dumbbell, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { muscleGroupsToBodyData } from "@/lib/muscles";
import type { DailyTrainingPlan, TrainingExercise, WorkoutStep } from "@/lib/types";

type TrainingPayload = {
  date: string;
  generatedAt: string;
  plan: DailyTrainingPlan;
  source: string;
  errorMessage: string | null;
  retryAfterSeconds?: number;
};

export function TrainingPage() {
  const [training, setTraining] = useState<TrainingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
        <>
          <section className="training-summary card">
            <div>
              <span className="muted small">Heute</span>
              <h2>{plan.title}</h2>
            </div>
            <div className="training-meta-grid">
              <div className="training-meta">
                <Clock3 size={18} />
                <strong>{plan.durationMinutes} Min.</strong>
              </div>
              <div className="training-meta">
                <Sparkles size={18} />
                <strong>{training.source === "gemini" ? "Gemini" : "Fallback"}</strong>
              </div>
            </div>
            <div className="pill-grid">
              {plan.focusMuscles.map((muscle) => (
                <span className="pill active" key={muscle}>{muscle}</span>
              ))}
            </div>
            {generatedAt ? <p className="muted small">Aktualisiert um {generatedAt}</p> : null}
          </section>

          <section className="card muscle-card">
            <div className="section-head compact">
              <div>
                <h2>Muskel-Fokus</h2>
                <div className="muted">Markiert sind die Muskelgruppen des heutigen Trainings.</div>
              </div>
            </div>
            <MuscleMap focusMuscles={plan.focusMuscles} />
          </section>

          <TrainingStepSection title="Warm-up" steps={plan.warmup} />

          <section className="training-section">
            <div className="section-head compact">
              <div>
                <h2>Übungen</h2>
                <div className="muted">{plan.exercises.length} Blöcke für heute</div>
              </div>
            </div>
            <div className="exercise-grid">
              {plan.exercises.map((exercise) => (
                <ExerciseCard exercise={exercise} key={`${exercise.name}-${exercise.sets}-${exercise.restSeconds}`} />
              ))}
            </div>
          </section>

          <TrainingStepSection title="Cooldown" steps={plan.cooldown} />
        </>
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

function TrainingStepSection({ title, steps }: { title: string; steps: WorkoutStep[] }) {
  return (
    <section className="training-section">
      <div className="section-head compact">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="training-step-list">
        {steps.map((step) => (
          <article className="card training-step" key={`${title}-${step.name}`}>
            <div className="training-step-icon"><Clock3 size={17} /></div>
            <div>
              <h3>{step.name}</h3>
              <p className="muted small">{step.duration}</p>
              <p>{step.instructions}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExerciseCard({ exercise }: { exercise: TrainingExercise }) {
  const effort = exercise.duration ?? `${exercise.sets} Sätze × ${exercise.reps ?? "sauber"}`;
  return (
    <article className="card exercise-card">
      <div className="exercise-card-head">
        <div>
          <h3>{exercise.name}</h3>
          <div className="pill-grid">
            {exercise.muscles.map((muscle) => (
              <span className="pill" key={`${exercise.name}-${muscle}`}>{muscle}</span>
            ))}
          </div>
        </div>
        <span className="difficulty">{exercise.difficulty}</span>
      </div>
      <div className="exercise-stats">
        <span><strong>{effort}</strong></span>
        <span>Pause: {exercise.restSeconds} Sek.</span>
      </div>
      <p>{exercise.instructions}</p>
      {exercise.techniqueTip ? <p className="technique-tip">{exercise.techniqueTip}</p> : null}
    </article>
  );
}

function MuscleMap({ focusMuscles }: { focusMuscles: string[] }) {
  const bodyData = useMemo(() => muscleGroupsToBodyData(focusMuscles), [focusMuscles]);
  const colors = useMemo(() => ["color-mix(in srgb, var(--accent) 32%, transparent)", "var(--accent)"], []);

  return (
    <div className="muscle-map" aria-label="Muskelvisualisierung">
      <div className="muscle-body-panel">
        <span className="muted small">Vorne</span>
        <Body data={bodyData} side="front" gender="male" scale={0.48} colors={colors} border="rgba(246, 243, 235, 0.46)" />
      </div>
      <div className="muscle-body-panel">
        <span className="muted small">Hinten</span>
        <Body data={bodyData} side="back" gender="male" scale={0.48} colors={colors} border="rgba(246, 243, 235, 0.46)" />
      </div>
      <p className="visual-license muted small">
        Body SVG: @mjcdev/react-body-highlighter, MIT License.
      </p>
    </div>
  );
}
