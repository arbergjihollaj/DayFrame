"use client";

import Link from "next/link";
import { AlertTriangle, Moon, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Briefing, DailyContext, DailyPlanDetails, EnergyCheckIn, PlanItem, Settings } from "@/lib/types";
import { SetupWizard } from "@/components/SetupWizard";

type StatusRow = { todoId: string; checked: number };
type TodayPayload = {
  briefing: Briefing | null;
  statuses: StatusRow[];
  history: { id: number; date: string; dayRating: string | null }[];
  dailyContext: DailyContext | null;
  energyCheckIn: EnergyCheckIn | null;
};

const sectionLabels = {
  morning: "Morgen",
  midday: "Mittag",
  afternoon: "Nachmittag",
  evening: "Abend",
  night: "Nacht / Schlaf",
};

const icons: Record<PlanItem["type"], string> = {
  calendar: "📅",
  learning: "📘",
  sport: "🏃",
  routine: "✓",
  sleep: "☾",
};

export function DashboardPage() {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("News werden ausgewählt. Dein Tagesplan wird erstellt.");
  const [toast, setToast] = useState("");
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [contextDismissed, setContextDismissed] = useState(false);
  const checked = useMemo(() => new Set(data?.statuses.filter((item) => item.checked).map((item) => item.todoId)), [data]);

  async function load() {
    const [today, settingsResponse] = await Promise.all([fetch("/api/briefing/today").then((res) => res.json()), fetch("/api/settings").then((res) => res.json())]);
    setData(today);
    setSettings(settingsResponse.settings);
    document.documentElement.dataset.theme = settingsResponse.settings.theme;
    document.documentElement.style.setProperty("--accent", settingsResponse.settings.accentColor);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (settings?.setupCompleted && data && !data.dailyContext && !contextDismissed) {
      setContextModalOpen(true);
    }
  }, [contextDismissed, data, settings]);

  async function generate(confirmFirst = true, message = "News werden ausgewählt. Dein Tagesplan wird erstellt.") {
    if (confirmFirst && !window.confirm("Briefing wirklich neu generieren?")) return;
    setLoadingText(message);
    setLoading(true);
    const response = await fetch("/api/briefing/generate", { method: "POST" });
    setLoading(false);
    if (response.ok) {
      await load();
      setToast("Dein Tagesplan wurde aktualisiert.");
      setTimeout(() => setToast(""), 3200);
    }
  }

  async function answerDailyContext(goesToUniversity: boolean) {
    const current = data?.dailyContext?.goesToUniversity;
    if (data?.briefing && current !== undefined && current !== goesToUniversity) {
      const ok = window.confirm("Tageskontext ändern und heutigen Plan neu erstellen?");
      if (!ok) return;
    }
    setContextModalOpen(false);
    setLoadingText("Dein Tagesplan wird angepasst...");
    setLoading(true);
    const response = await fetch("/api/daily-context", {
      method: "POST",
      body: JSON.stringify({ goesToUniversity }),
    });
    if (response.ok) {
      setContextDismissed(false);
      await fetch("/api/briefing/generate", { method: "POST" });
      await load();
      setToast("Dein Tagesplan wurde an den Tageskontext angepasst.");
      setTimeout(() => setToast(""), 3200);
    }
    setLoading(false);
  }

  async function skipDailyContext() {
    setContextModalOpen(false);
    setContextDismissed(true);
    if (!data?.briefing) {
      await generate(false, "Dein Tagesplan wird neutral erstellt...");
    }
  }

  async function toggleTodo(todoId: string) {
    if (!data?.briefing) return;
    const next = !checked.has(todoId);
    await fetch("/api/routine/check", {
      method: "POST",
      body: JSON.stringify({ briefingId: data.briefing.id, todoId, checked: next }),
    });
    await load();
  }

  async function rate(rating: string) {
    if (!data?.briefing) return;
    await fetch("/api/briefing/rating", {
      method: "POST",
      body: JSON.stringify({ briefingId: data.briefing.id, rating }),
    });
    await load();
  }

  if (!data || !settings) return <LoadingGenerationCard />;

  if (!settings.setupCompleted) {
    return <SetupWizard settings={settings} onDone={load} />;
  }

  const briefing = data.briefing;
  const allPlanItems = briefing
    ? (Object.keys(sectionLabels) as (keyof typeof sectionLabels)[]).flatMap((section) =>
        briefing.dayPlan[section].map((item) => ({ ...item, section })),
      )
    : [];
  const firstCalendar = allPlanItems.find((item) => item.type === "calendar");
  const firstLearning = allPlanItems.find((item) => item.type === "learning");
  const routineCount = allPlanItems.filter((item) => item.type === "routine" || item.type === "sleep").length;
  const planning = briefing?.planning;

  return (
    <div className="dashboard">
      <header className="dashboard-hero">
        <div className="hero-main">
          <span className="eyebrow">
            <span className="dot" />
            {new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
          </span>
          <h1 className="hero-title">Tagesübersicht</h1>
          <p className="lead">{briefing?.greeting ?? "Dein privates Daily-Dashboard wartet auf das erste Briefing."}</p>
          <div className="row" style={{ marginTop: 22, justifyContent: "flex-start" }}>
            <button className="icon-btn" aria-label="Briefing neu generieren" onClick={() => generate(true)}>
              <RefreshCw size={21} />
            </button>
            <span className="muted small">
              Aktualisiert um {briefing ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(briefing.generatedAt)) : settings.generationTime}
            </span>
          </div>
        </div>
        <aside className="hero-side">
          <div className="mini">
            <b>Heute</b>
            <strong>{firstCalendar ? `${firstCalendar.time}-${firstCalendar.endTime} ${firstCalendar.title}` : briefing?.weather.label ?? "Noch offen"}</strong>
            <span className="muted small">{firstCalendar ? "Fixer Termin aus deinem Kalender." : "Wetter und Planung kompakt."}</span>
          </div>
          <div className="mini">
            <b>Lernen</b>
            <strong>{firstLearning?.title ?? "Themen nach Bedarf"}</strong>
            <span className="muted small">Aus deinen Fächern und Sicherheiten geplant.</span>
          </div>
          <div className="mini">
            <b>Routine</b>
            <strong>{routineCount || 0} kleine Schritte</strong>
            <span className="muted small">Abhakbar im Tagesplan.</span>
          </div>
          <div className="mini">
            <b>Tageskontext</b>
            <strong>{data.dailyContext ? (data.dailyContext.goesToUniversity ? "Uni / unterwegs" : "Zuhause") : "Noch offen"}</strong>
            <button className="pill" style={{ marginTop: 10 }} onClick={() => setContextModalOpen(true)}>Ändern</button>
          </div>
        </aside>
      </header>

      {toast ? <div className="card small" style={{ color: "var(--ok)" }}>{toast}</div> : null}
      {loading ? <LoadingGenerationCard message={loadingText} /> : null}
      {contextModalOpen ? <DailyContextModal onAnswer={answerDailyContext} onSkip={skipDailyContext} /> : null}

      {!briefing ? (
        <div className="card stack">
          <h2 className="section-title">Noch kein Briefing</h2>
          <p className="muted">Erstelle dein erstes Tagesbriefing. Fehlende Datenquellen werden als Hinweise berücksichtigt.</p>
          <button className="primary" onClick={() => generate(false)}>Briefing erstellen</button>
        </div>
      ) : (
        <>
          {planning ? <PlanningOverview plan={planning} onRefresh={() => generate(false, "Dein Tagesplan wird mit Check-in aktualisiert...")} /> : null}
          <MorningCheckInCard
            checkIn={data.energyCheckIn}
            onSaved={async () => {
              await fetch("/api/briefing/generate", { method: "POST" });
              await load();
              setToast("Check-in gespeichert. Dein Plan wurde neu gewichtet.");
              setTimeout(() => setToast(""), 3200);
            }}
          />
          <section className="dash-section">
            <div className="section-head">
              <div>
                <h2>Heute kompakt</h2>
                <div className="muted">Wetter, Wochenauslastung und kurzer Blick auf morgen.</div>
              </div>
            </div>
            <div className="grid three">
              <div className="card focusbox">
                <h3 className="section-title">Wetter</h3>
                <p className="quote">{briefing.weather.label}</p>
                <p className="muted small">{briefing.weather.place ?? settings.weatherPlace}</p>
                {briefing.weather.warning ? <p className="muted small">{briefing.weather.warning}</p> : null}
              </div>
              <div className="card week-card">
                <h3 className="section-title">Woche</h3>
                {settings.icalUrl ? (
                  <div className="bars">
                    {briefing.weekLoad.map((day) => (
                      <div className="bar-wrap" key={day.date}>
                        <div className={`bar ${day.isToday ? "today" : ""}`} style={{ height: `${16 + day.load * 13}px` }} />
                        <span>{day.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Verbinde deinen iCal-Link, um deine Woche zu sehen.</p>
                )}
              </div>
              <div className="card">
                <h3 className="section-title">Morgen</h3>
                {briefing.tomorrowPreview.map((item) => <p key={item} className="small">• {item}</p>)}
              </div>
            </div>
          </section>

          <section className="dash-section">
            <div className="section-head">
              <div>
                <h2>Kompakter Tagesplan</h2>
                <div className="muted">Zeitblöcke als Orientierung, ohne den Tag zu überladen.</div>
              </div>
            </div>
            {(Object.keys(sectionLabels) as (keyof typeof sectionLabels)[]).map((section) => (
              <div className="card plan-section" key={section} style={{ marginBottom: 14 }}>
                <h3 className="section-title">{sectionLabels[section]}</h3>
                <div className="timeline">
                  {briefing.dayPlan[section].length ? briefing.dayPlan[section].map((item) => (
                    <div className={`timeline-row ${item.type}`} key={item.id}>
                      <div className="time">{item.endTime ? `${item.time}-${item.endTime}` : item.time}</div>
                      <div>
                        <strong>{icons[item.type]} {item.title}</strong>
                        {item.type === "calendar" ? <p className="muted small">Kalendertermin</p> : null}
                      </div>
                      {item.type === "routine" || item.type === "sleep" ? (
                        <button aria-label="Routine abhaken" className={`checkbox ${checked.has(item.id) ? "checked" : ""}`} onClick={() => toggleTodo(item.id)} />
                      ) : null}
                    </div>
                  )) : <p className="muted small">Keine Einträge geplant.</p>}
                </div>
              </div>
            ))}
          </section>

          <section className="dash-section">
            <div className="section-head">
              <div>
                <h2>News kompakt</h2>
                <div className="muted">Kurzüberblick mit persönlicher Relevanz.</div>
              </div>
              <Link className="pill active" href="/news">Alle öffnen</Link>
            </div>
            <div className="grid news-grid">
              {briefing.news.slice(0, 6).map((item, index) => (
                <Link className="card news-card" href="/news" key={item.id}>
                  <div className="kicker">
                    <span className="tag">{item.category}</span>
                    <span className="level">#{index + 1}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <div className="why"><b>Warum für dich:</b> {item.relevance}</div>
                  <div className="source">Quelle: {item.source}</div>
                </Link>
              ))}
              {!briefing.news.length ? <div className="card muted">Konfiguriere RSS-Quellen, um relevante News zu sehen.</div> : null}
            </div>
          </section>

          <section className="dash-section">
            <div className="section-head">
              <div>
                <h2>7-Tage-Verlauf</h2>
                <div className="muted">Kurze Rückmeldung, damit künftige Pläne realistischer werden.</div>
              </div>
            </div>
            <section className="card stack">
              <div className="pill-grid">
                {["Plan war gut", "Teilweise geschafft", "Nicht geschafft"].map((rating) => (
                  <button key={rating} className={`pill ${briefing.dayRating === rating ? "active" : ""}`} onClick={() => rate(rating)}>{rating}</button>
                ))}
              </div>
              <div className="pill-grid">
                {data.history.map((item) => <span className="pill" key={item.id}>{item.date.slice(5)} · {item.dayRating ?? "offen"}</span>)}
              </div>
            </section>
          </section>

          {briefing.errors.length ? (
            <section className="card">
              {briefing.errors.slice(0, 3).map((error) => <p className="muted small" key={error}>{error}</p>)}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function LoadingGenerationCard({ message = "News werden ausgewählt. Dein Tagesplan wird erstellt." }: { message?: string }) {
  return (
    <div className="card stack">
      <div className="row">
        <strong>Briefing wird vorbereitet</strong>
        <Sparkles size={18} />
      </div>
      <p className="muted loading-dots">Daten werden gesammelt<span>.</span><span>.</span><span>.</span></p>
      <p className="muted small">{message}</p>
    </div>
  );
}

function DailyContextModal({ onAnswer, onSkip }: { onAnswer: (goesToUniversity: boolean) => void; onSkip: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="daily-context-title">
      <div className="modal-card">
        <div className="row">
          <h2 id="daily-context-title">Gehst du heute zur Uni?</h2>
          <button className="icon-btn" aria-label="Schließen" onClick={onSkip}>×</button>
        </div>
        <p className="muted small">Damit DayFrame deinen Tagesplan realistischer aufbauen kann.</p>
        <button className="primary" onClick={() => onAnswer(true)}>Ja, ich gehe zur Uni</button>
        <button className="secondary" onClick={() => onAnswer(false)}>Nein, ich bleibe zuhause</button>
        <button className="pill" onClick={onSkip}>Heute neutral planen</button>
      </div>
    </div>
  );
}

function PlanningOverview({ plan, onRefresh }: { plan: DailyPlanDetails; onRefresh: () => void }) {
  const visibleBlocks = plan.timeBlocks.filter((block) => block.kind !== "meal" && block.kind !== "buffer").slice(0, 9);
  const firstLearning = plan.timeBlocks.find((block) => block.kind === "learning");
  return (
    <section className="dash-section">
      <div className="section-head">
        <div>
          <h2>Tagesplan</h2>
          <div className="muted">Deterministisch geplant: Termine, Pendeln, Deadlines, Schlaf und Energie.</div>
        </div>
        <button className="pill active" onClick={onRefresh}>Neu planen</button>
      </div>
      {plan.mode === "emergency" ? (
        <div className="card emergency-banner">
          <AlertTriangle size={20} />
          <div>
            <strong>Heute reduziert planen</strong>
            <p className="muted small">Fixes bleibt, alles Verschiebbare wird freundlich rausgenommen.</p>
          </div>
        </div>
      ) : null}
      <div className="grid three planning-grid">
        <div className="card focusbox stack">
          <div className="kicker">
            <span className="tag">{plan.dayType}</span>
            <span className="tag">{plan.mode}</span>
          </div>
          <h3 className="section-title">Fokus</h3>
          <p className="quote">{plan.focusHeadline}</p>
          <p className="muted small">
            Erster Block: {plan.firstBlock ? `${plan.firstBlock.start}-${plan.firstBlock.end} ${plan.firstBlock.title}` : "noch offen"}
          </p>
        </div>
        <div className="card stack">
          <h3 className="section-title">Prioritäten</h3>
          <div className="priority-row">
            {(["P1", "P2", "P3", "P4"] as const).map((band) => (
              <span className={`priority-chip ${band.toLowerCase()}`} key={band}>{band} · {plan.priorityCounts[band]}</span>
            ))}
          </div>
          <p className="muted small">{plan.summary}</p>
        </div>
        <div className="card stack">
          <h3 className="section-title">Wind-down</h3>
          <div className="wind-row"><Moon size={18} /> Lernen bis {plan.learningCutoff}</div>
          <div className="wind-row"><Moon size={18} /> Bettziel {plan.bedtimeTarget}</div>
          <p className="muted small">Schlaf: {plan.sleepHours}h · Energie: {plan.energyLevel}/5</p>
        </div>
      </div>

      <div className="grid two planning-lower">
        <div className="card plan-section">
          <h3 className="section-title">Daily Timeline</h3>
          <div className="timeline">
            {visibleBlocks.map((block) => (
              <div className={`timeline-row ${block.kind}`} key={block.id}>
                <div className="time">{block.start}-{block.end}</div>
                <div>
                  <strong>{block.title}</strong>
                  <p className="muted small">
                    {block.priorityBand ? `${block.priorityBand} · ` : ""}{block.movable ? "verschiebbar" : "fix"}{block.notes ? ` · ${block.notes}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card stack">
          <h3 className="section-title">Deadlines & Verschiebbares</h3>
          {plan.activeDeadlines.map((deadline) => (
            <div className="deadline-row" key={deadline.id}>
              <div>
                <strong>{deadline.title}</strong>
                <p className="muted small">intern bis {deadline.internalDueAt} · {deadline.progressPercent}%</p>
              </div>
              <span className="tag">{deadline.kind}</span>
            </div>
          ))}
          <div className="deferred-list">
            {plan.deferredTasks.slice(0, 4).map((task) => (
              <span className="pill" key={task.id}>{task.priorityBand} · {task.title}</span>
            ))}
            {!plan.deferredTasks.length ? <span className="muted small">Nichts Kritisches verschoben.</span> : null}
          </div>
          {firstLearning ? <EveningMiniCheckIn block={firstLearning} onDone={onRefresh} /> : null}
        </div>
      </div>
      {plan.weeklyReview ? (
        <div className="card stack">
          <h3 className="section-title">Weekly Review vorbereitet</h3>
          <p className="muted small">{plan.weeklyReview.nextWeekAdjustments.join(" · ")}</p>
        </div>
      ) : null}
    </section>
  );
}

function MorningCheckInCard({ checkIn, onSaved }: { checkIn: EnergyCheckIn | null; onSaved: () => Promise<void> }) {
  const [sleepHours, setSleepHours] = useState(checkIn?.sleepHours ?? 7);
  const [energy, setEnergy] = useState(checkIn?.energy ?? 3);
  const [stress, setStress] = useState(checkIn?.stress ?? 3);
  const [manualEmergency, setManualEmergency] = useState(checkIn?.manualEmergency ?? false);

  useEffect(() => {
    setSleepHours(checkIn?.sleepHours ?? 7);
    setEnergy(checkIn?.energy ?? 3);
    setStress(checkIn?.stress ?? 3);
    setManualEmergency(checkIn?.manualEmergency ?? false);
  }, [checkIn]);

  async function save() {
    await fetch("/api/check-in/morning", {
      method: "POST",
      body: JSON.stringify({ sleepHours, energy, stress, soreness: 2, manualEmergency }),
    });
    await onSaved();
  }

  return (
    <section className="card checkin-card">
      <div>
        <h3 className="section-title">Morning Check-in</h3>
        <p className="muted small">{checkIn ? "Gespeichert, du kannst jederzeit nachjustieren." : "Kurz genug, damit der Plan trotzdem automatisch funktioniert."}</p>
      </div>
      <label className="field compact">
        Schlaf
        <input className="input" type="number" min="0" max="14" step="0.5" value={sleepHours} onChange={(event) => setSleepHours(Number(event.target.value))} />
      </label>
      <label className="field compact">
        Energie
        <input className="input" type="number" min="1" max="5" value={energy} onChange={(event) => setEnergy(Number(event.target.value))} />
      </label>
      <label className="field compact">
        Stress
        <input className="input" type="number" min="1" max="5" value={stress} onChange={(event) => setStress(Number(event.target.value))} />
      </label>
      <label className="toggle-row">
        <input type="checkbox" checked={manualEmergency} onChange={(event) => setManualEmergency(event.target.checked)} />
        Heute reduziert
      </label>
      <button className="secondary" onClick={save}>Check-in speichern</button>
    </section>
  );
}

function EveningMiniCheckIn({ block, onDone }: { block: DailyPlanDetails["timeBlocks"][number]; onDone: () => void }) {
  async function mark(status: "done" | "open" | "blocked") {
    if (!block.taskId) return;
    await fetch("/api/check-in/evening", {
      method: "POST",
      body: JSON.stringify({
        task: {
          id: block.taskId,
          title: block.title,
          kind: "study",
          estimatedMinutes: 45,
          minChunkMinutes: 20,
          requiresDeepFocus: block.notes?.includes("Kern") ?? false,
          movable: block.movable,
          priorityScore: block.priorityBand === "P1" ? 8 : 5,
          priorityBand: block.priorityBand ?? "P2",
          carryOverCount: 0,
          blocked: status === "blocked",
          nextStep: block.notes,
        },
        status,
      }),
    });
    onDone();
  }
  return (
    <div className="evening-check">
      <strong>Evening Check-in</strong>
      <div className="pill-grid">
        <button className="pill active" onClick={() => mark("done")}>erledigt</button>
        <button className="pill" onClick={() => mark("open")}>Carry-over</button>
        <button className="pill" onClick={() => mark("blocked")}>blockiert</button>
      </div>
    </div>
  );
}
