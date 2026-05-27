"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Briefing, DailyContext, DailyPlanDetails, EnergyCheckIn, PlanItem, Settings, WeatherSummary } from "@/lib/types";
import { SetupWizard } from "@/components/SetupWizard";

type StatusRow = { todoId: string; checked: number };
type TodayPayload = {
  briefing: Briefing | null;
  statuses: StatusRow[];
  history: { id: number; date: string; dayRating: string | null }[];
  dailyContext: DailyContext | null;
  energyCheckIn: EnergyCheckIn | null;
};
type ContextCheckIn = { sleepHours: number; energy: number };

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

const ratingShapes = [
  { label: "Plan war gut", tone: "good" },
  { label: "Teilweise geschafft", tone: "partial" },
  { label: "Nicht geschafft", tone: "missed" },
];

function ratingTone(rating: string | null) {
  return ratingShapes.find((shape) => shape.label === rating)?.tone ?? "open";
}

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

  async function answerDailyContext(goesToUniversity: boolean, checkIn: ContextCheckIn) {
    const current = data?.dailyContext?.goesToUniversity;
    if (data?.briefing && current !== undefined && current !== goesToUniversity) {
      const ok = window.confirm("Tageskontext ändern und heutigen Plan neu erstellen?");
      if (!ok) return;
    }
    setContextModalOpen(false);
    setLoadingText("Dein Tagesplan wird angepasst...");
    setLoading(true);
    await fetch("/api/check-in/morning", {
      method: "POST",
      body: JSON.stringify({ sleepHours: checkIn.sleepHours, energy: checkIn.energy, stress: data?.energyCheckIn?.stress ?? 3, soreness: data?.energyCheckIn?.soreness ?? 2, manualEmergency: data?.energyCheckIn?.manualEmergency ?? false }),
    });
    const response = await fetch("/api/daily-context", {
      method: "POST",
      body: JSON.stringify({ goesToUniversity }),
    });
    if (response.ok) {
      setContextDismissed(false);
      await fetch("/api/briefing/generate", { method: "POST" });
      await load();
      setToast("Tageskontext und Check-in gespeichert. Dein Plan wurde angepasst.");
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
  const planning = briefing?.planning;
  const todoSections = briefing
    ? (Object.keys(sectionLabels) as (keyof typeof sectionLabels)[])
        .map((section) => ({
          section,
          items: briefing.dayPlan[section].filter((item) => item.type === "routine" || item.type === "sleep"),
        }))
        .filter((section) => section.items.length)
    : [];

  return (
    <div className="dashboard">
      {briefing ? <WeatherOverview weather={briefing.weather} fallbackPlace={settings.weatherPlace} /> : null}
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
                <div className="muted">Wochenauslastung und kurzer Blick auf morgen.</div>
              </div>
            </div>
            <div className="grid two">
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

          {todoSections.length ? (
            <section className="dash-section">
              <div className="section-head">
                <div>
                  <h2>To-dos</h2>
                </div>
              </div>
              {todoSections.map(({ section, items }) => (
                <div className="card plan-section" key={section} style={{ marginBottom: 14 }}>
                  <h3 className="section-title">{sectionLabels[section]}</h3>
                  <div className="timeline">
                    {items.map((item) => (
                      <div className={`timeline-row ${item.type}`} key={item.id}>
                        <div className="time">{item.endTime ? `${item.time}-${item.endTime}` : item.time}</div>
                        <div>
                          <strong>{icons[item.type]} {item.title}</strong>
                        </div>
                        <button aria-label="To-do abhaken" className={`checkbox ${checked.has(item.id) ? "checked" : ""}`} onClick={() => toggleTodo(item.id)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          <section className="dash-section">
            <div className="section-head">
              <div>
                <h2>News kompakt</h2>
              </div>
              <Link className="pill active" href="/news">Alle öffnen</Link>
            </div>
            <div className="grid news-grid">
              {briefing.news.slice(0, 5).map((item, index) => (
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
            <section className="card progress-card">
              <div className="rating-shapes" aria-label="Tagesbewertung">
                {ratingShapes.map((rating) => (
                  <button
                    key={rating.label}
                    className={`rating-shape ${rating.tone} ${briefing.dayRating === rating.label ? "active" : ""}`}
                    onClick={() => rate(rating.label)}
                    title={rating.label}
                    aria-label={rating.label}
                  >
                    <span className="shape-mark" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className="week-shapes" aria-label="Letzte sieben Tage">
                {data.history.map((item) => {
                  const tone = ratingTone(item.dayRating);
                  const label = `${item.date.slice(5)}: ${item.dayRating ?? "offen"}`;
                  return (
                    <div className={`week-dot ${tone}`} key={item.id} title={label} aria-label={label}>
                      <span className="shape-mark" aria-hidden="true" />
                      <time dateTime={item.date}>{item.date.slice(5)}</time>
                    </div>
                  );
                })}
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

function DailyContextModal({ onAnswer, onSkip }: { onAnswer: (goesToUniversity: boolean, checkIn: ContextCheckIn) => void; onSkip: () => void }) {
  const [goesToUniversity, setGoesToUniversity] = useState<boolean | null>(null);
  const [step, setStep] = useState<"context" | "sleep" | "energy">("context");
  const [sleepHours, setSleepHours] = useState(7);
  const [energy, setEnergy] = useState<number | null>(null);
  const sleepEstimate = estimateEnergyFromSleep(sleepHours);
  const chooseContext = (value: boolean) => {
    setGoesToUniversity(value);
    setStep("sleep");
  };
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="daily-context-title">
      <div className="modal-card">
        <div className="row">
          <h2 id="daily-context-title">{step === "context" ? "Gehst du heute zur Uni?" : step === "sleep" ? "Wie viele Stunden hast du geschlafen?" : "Wie viel Energie hast du?"}</h2>
          <button className="icon-btn" aria-label="Schließen" onClick={onSkip}>×</button>
        </div>
        {step === "context" ? (
          <>
            <p className="muted small">Damit DayFrame deinen Tagesplan realistischer aufbauen kann.</p>
            <button className="primary" onClick={() => chooseContext(true)}>Uni</button>
            <button className="secondary" onClick={() => chooseContext(false)}>Zuhause</button>
            <button className="pill" onClick={onSkip}>Heute neutral planen</button>
          </>
        ) : null}
        {step === "sleep" ? (
          <>
            <input className="input sleep-input" type="number" min="0" max="14" step="0.5" value={sleepHours} onChange={(event) => setSleepHours(Number(event.target.value))} autoFocus />
            <p className="muted small">DayFrame schätzt daraus grob: {sleepEstimate}/10 Erholung.</p>
            <button className="primary" onClick={() => setStep("energy")}>Weiter</button>
          </>
        ) : null}
        {step === "energy" ? (
          <>
            <div className="energy-buttons" role="radiogroup" aria-label="Energie von 1 bis 10">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  className={`energy-button ${energy === value ? "active" : ""}`}
                  role="radio"
                  aria-checked={energy === value}
                  onClick={() => setEnergy(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <button className="primary" disabled={energy === null || goesToUniversity === null} onClick={() => onAnswer(goesToUniversity!, { sleepHours, energy: energy! })}>Speichern</button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function estimateEnergyFromSleep(hours: number) {
  if (hours >= 7.5 && hours <= 9) return 9;
  if (hours >= 7 && hours < 7.5) return 8;
  if (hours >= 6.5 && hours < 7) return 7;
  if (hours >= 6 && hours < 6.5) return 6;
  if (hours >= 5 && hours < 6) return 4;
  if (hours > 9.5) return 6;
  return 3;
}

function sleepTimesFromHours(hours: number) {
  const wakeMinutes = 7 * 60;
  return {
    sleepStart: minutesToTime(wakeMinutes - Math.round(hours * 60)),
    wakeTime: minutesToTime(wakeMinutes),
  };
}

function sleepHoursFromTimes(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  const duration = endMinutes >= startMinutes ? endMinutes - startMinutes : endMinutes + 24 * 60 - startMinutes;
  return Math.round((duration / 60) * 10) / 10;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const minutes = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function todayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTimelineNowPosition(blocks: DailyPlanDetails["timeBlocks"], now: Date, planDate: string) {
  if (!blocks.length || planDate !== todayKey(now)) return null;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const firstStart = timeToMinutes(blocks[0].start);
  const lastIndex = blocks.length - 1;
  const lastEnd = timeToMinutes(blocks[lastIndex].end);

  if (currentMinutes <= firstStart) return { index: 0, progress: 0 };
  if (currentMinutes >= lastEnd) return { index: lastIndex, progress: 1 };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const start = timeToMinutes(block.start);
    const end = timeToMinutes(block.end);

    if (currentMinutes >= start && currentMinutes <= end) {
      return {
        index,
        progress: end === start ? 0 : Math.min(1, Math.max(0, (currentMinutes - start) / (end - start))),
      };
    }

    const nextStart = blocks[index + 1] ? timeToMinutes(blocks[index + 1].start) : null;
    if (nextStart !== null && currentMinutes > end && currentMinutes < nextStart) {
      return { index, progress: 1 };
    }
  }

  return null;
}

function WeatherOverview({ weather, fallbackPlace }: { weather: WeatherSummary; fallbackPlace: string }) {
  return (
    <section className="weather-top card">
      <div className="weather-current">
        <div>
          <h2>Wetter</h2>
          <p className="weather-main">{weather.label}</p>
          <p className="muted small">{weather.place ?? fallbackPlace}</p>
        </div>
        {typeof weather.temperature === "number" ? <strong>{weather.temperature}°</strong> : null}
      </div>
      {weather.warning ? <p className="muted small">{weather.warning}</p> : null}
      {weather.hourly?.length ? (
        <div className="weather-forecast" aria-label="Wettervorhersage in 2-Stunden-Schritten">
          {weather.hourly.map((item) => (
            <div className="forecast-item" key={item.time}>
              <span>{item.time}</span>
              <strong>{item.temperature}°</strong>
              {typeof item.precipitationProbability === "number" ? <small>{item.precipitationProbability}%</small> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PlanningOverview({ plan, onRefresh }: { plan: DailyPlanDetails; onRefresh: () => void }) {
  const [now, setNow] = useState(() => new Date());
  const visibleBlocks = plan.timeBlocks.filter((block) => block.kind !== "meal" && block.kind !== "buffer").slice(0, 9);
  const currentPosition = getTimelineNowPosition(visibleBlocks, now, plan.date);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="dash-section">
      <div className="section-head">
        <div>
          <h2>Tagesplan</h2>
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
      <div className="grid two planning-lower">
        <div className="card plan-section">
          <h3 className="section-title">Daily Timeline</h3>
          <div className="timeline vertical-timeline">
            {visibleBlocks.map((block, index) => (
              <div className={`timeline-row ${block.kind}`} key={block.id}>
                <span className="timeline-marker" aria-hidden="true" />
                {currentPosition?.index === index ? (
                  <span
                    className="timeline-now-marker"
                    style={{ top: `${15 + currentPosition.progress * 70}%` }}
                    aria-label="Aktuelle Position im Tagesplan"
                  />
                ) : null}
                <div className="time">{block.start}-{block.end}</div>
                <div>
                  <strong>{block.title}</strong>
                  <p className="muted small">
                    {block.movable ? "verschiebbar" : "fix"}{block.notes ? ` · ${block.notes}` : ""}
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
  const initialSleepTimes = sleepTimesFromHours(checkIn?.sleepHours ?? 7);
  const [sleepStart, setSleepStart] = useState(initialSleepTimes.sleepStart);
  const [wakeTime, setWakeTime] = useState(initialSleepTimes.wakeTime);
  const [energy, setEnergy] = useState(checkIn?.energy ?? 6);
  const [stress, setStress] = useState(checkIn?.stress ?? 3);
  const [manualEmergency, setManualEmergency] = useState(checkIn?.manualEmergency ?? false);
  const sleepScore = estimateEnergyFromSleep(sleepHours);

  useEffect(() => {
    const nextSleepHours = checkIn?.sleepHours ?? 7;
    const nextSleepTimes = sleepTimesFromHours(nextSleepHours);
    setSleepHours(nextSleepHours);
    setSleepStart(nextSleepTimes.sleepStart);
    setWakeTime(nextSleepTimes.wakeTime);
    setEnergy(checkIn?.energy ?? 6);
    setStress(checkIn?.stress ?? 3);
    setManualEmergency(checkIn?.manualEmergency ?? false);
  }, [checkIn]);

  function updateSleepTimes(nextStart: string, nextEnd: string) {
    setSleepStart(nextStart);
    setWakeTime(nextEnd);
    setSleepHours(sleepHoursFromTimes(nextStart, nextEnd));
  }

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
      <div className="field compact sleep-time-field">
        <span>Schlafzeit</span>
        <div className="sleep-time-grid">
          <label>
            Einschlafen
            <input className="input" type="time" value={sleepStart} onChange={(event) => updateSleepTimes(event.target.value, wakeTime)} />
          </label>
          <label>
            Aufgewacht
            <input className="input" type="time" value={wakeTime} onChange={(event) => updateSleepTimes(sleepStart, event.target.value)} />
          </label>
        </div>
        <p className="muted small">ca. {sleepHours.toFixed(1)}h · Schlafscore {sleepScore}/10</p>
      </div>
      <label className="field compact">
        Energie
        <div className="energy-buttons compact" role="radiogroup" aria-label="Energie von 1 bis 10">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              className={`energy-button ${energy === value ? "active" : ""}`}
              type="button"
              role="radio"
              aria-checked={energy === value}
              onClick={() => setEnergy(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </label>
      <label className="field compact">
        Stress
        <div className="energy-buttons compact" role="radiogroup" aria-label="Stress von 1 bis 10">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              className={`energy-button ${stress === value ? "active" : ""}`}
              type="button"
              role="radio"
              aria-checked={stress === value}
              onClick={() => setStress(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </label>
      <label className="toggle-row">
        <input type="checkbox" checked={manualEmergency} onChange={(event) => setManualEmergency(event.target.checked)} />
        Heute reduziert
      </label>
      <button className="secondary" onClick={save}>Check-in speichern</button>
    </section>
  );
}
