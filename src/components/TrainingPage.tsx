"use client";

import { AlertTriangle, Clock3, Dumbbell, RefreshCw, Sparkles } from "lucide-react";
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
  const active = useMemo(() => new Set(focusMuscles), [focusMuscles]);
  const tone = (muscle: string) => `muscle-zone ${active.has(muscle) ? "active" : ""}`;

  return (
    <div className="muscle-map" aria-label="Muskelvisualisierung">
      <svg viewBox="0 0 560 320" role="img" aria-labelledby="muscle-title">
        <title id="muscle-title">Stilisierte Körperzeichnung mit hervorgehobenen Muskelgruppen</title>
        <defs>
          <linearGradient id="muscleActive" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--teal)" />
          </linearGradient>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="body-outline" transform="translate(55 16)">
          <circle cx="110" cy="28" r="20" />
          <path d="M92 52 C100 45 120 45 128 52 L140 106 C143 123 132 143 120 153 L118 210 L139 284 L112 284 L103 218 L95 284 L68 284 L89 210 L87 153 C75 143 64 123 67 106 Z" />
          <path d="M67 78 C39 91 28 121 25 154" />
          <path d="M140 78 C168 91 179 121 182 154" />
        </g>
        <g transform="translate(55 16)">
          <path className={tone("Schultern")} d="M68 72 C80 54 94 54 103 66 C94 78 81 84 68 78 Z" />
          <path className={tone("Schultern")} d="M117 66 C126 54 140 54 152 72 C139 84 126 78 117 66 Z" />
          <path className={tone("Brust")} d="M82 83 C96 72 109 76 110 99 C96 102 86 99 77 91 Z" />
          <path className={tone("Brust")} d="M110 99 C111 76 124 72 138 83 L143 91 C134 99 124 102 110 99 Z" />
          <path className={tone("Bauch")} d="M91 108 L129 108 L123 158 L97 158 Z" />
          <path className={tone("Bizeps")} d="M53 94 C42 110 38 127 37 146 C47 143 53 128 61 103 Z" />
          <path className={tone("Bizeps")} d="M167 94 C178 110 182 127 183 146 C173 143 167 128 159 103 Z" />
          <path className={tone("Unterarme")} d="M33 147 C27 165 24 182 27 196 C39 186 42 168 42 148 Z" />
          <path className={tone("Unterarme")} d="M187 147 C193 165 196 182 193 196 C181 186 178 168 178 148 Z" />
          <path className={tone("Beine")} d="M84 163 L105 163 L100 232 L69 276 L62 263 L84 206 Z" />
          <path className={tone("Beine")} d="M115 163 L136 163 L158 263 L151 276 L120 232 Z" />
          <path className={tone("Waden")} d="M72 235 L98 235 L91 285 L65 285 Z" />
          <path className={tone("Waden")} d="M122 235 L148 235 L155 285 L129 285 Z" />
        </g>

        <g className="body-outline" transform="translate(300 16)">
          <circle cx="110" cy="28" r="20" />
          <path d="M92 52 C100 45 120 45 128 52 L140 106 C143 123 132 143 120 153 L118 210 L139 284 L112 284 L103 218 L95 284 L68 284 L89 210 L87 153 C75 143 64 123 67 106 Z" />
          <path d="M67 78 C39 91 28 121 25 154" />
          <path d="M140 78 C168 91 179 121 182 154" />
        </g>
        <g transform="translate(300 16)">
          <path className={tone("Schultern")} d="M68 72 C80 54 94 54 103 66 C94 78 81 84 68 78 Z" />
          <path className={tone("Schultern")} d="M117 66 C126 54 140 54 152 72 C139 84 126 78 117 66 Z" />
          <path className={tone("Rücken")} d="M83 78 C99 68 121 68 137 78 L128 142 C118 151 102 151 92 142 Z" />
          <path className={tone("Trizeps")} d="M54 94 C45 113 42 132 43 151 C53 147 59 126 63 101 Z" />
          <path className={tone("Trizeps")} d="M166 94 C175 113 178 132 177 151 C167 147 161 126 157 101 Z" />
          <path className={tone("Unterarme")} d="M36 148 C30 166 27 183 30 196 C41 187 44 169 44 149 Z" />
          <path className={tone("Unterarme")} d="M184 148 C190 166 193 183 190 196 C179 187 176 169 176 149 Z" />
          <path className={tone("Gesäß")} d="M84 153 C97 148 110 152 110 170 C101 178 90 177 81 170 Z" />
          <path className={tone("Gesäß")} d="M110 170 C110 152 123 148 136 153 L139 170 C130 177 119 178 110 170 Z" />
          <path className={tone("Beine")} d="M84 177 L105 177 L99 232 L70 276 L63 263 L84 211 Z" />
          <path className={tone("Beine")} d="M115 177 L136 177 L157 263 L150 276 L121 232 Z" />
          <path className={tone("Waden")} d="M72 235 L98 235 L91 285 L65 285 Z" />
          <path className={tone("Waden")} d="M122 235 L148 235 L155 285 L129 285 Z" />
        </g>
      </svg>
    </div>
  );
}
