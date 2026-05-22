"use client";

import { useEffect, useState } from "react";
import { Bot, Clock3, Palette, Plus, RotateCcw, Rss, Trash2 } from "lucide-react";
import { newsCategories } from "@/lib/defaults";
import type { Settings } from "@/lib/types";

type NewsSource = { id: number; name: string; url: string; category: string; enabled: number };
type NewsSourceDraft = { id?: number; name: string; url: string; category: string; enabled: boolean };
type SettingsPanel = "appearance" | "ai" | "sources" | "routine";
type AiSecrets = {
  provider: "openai" | "gemini";
  openaiKeyMasked: string;
  geminiKeyMasked: string;
  openaiModel: string;
  geminiModel: string;
};

const accentColors = ["#78a6ff", "#19a974", "#f97316", "#e0528d", "#8b5cf6", "#14b8a6"];

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [activePanel, setActivePanel] = useState<SettingsPanel>("appearance");
  const [ai, setAi] = useState<AiSecrets | null>(null);
  const [aiDraft, setAiDraft] = useState({
    provider: "openai" as "openai" | "gemini",
    openaiKey: "",
    geminiKey: "",
    openaiModel: "gpt-5-mini",
    geminiModel: "gemini-2.5-flash",
  });
  const [newSource, setNewSource] = useState({ name: "", url: "", category: newsCategories[0], enabled: true });
  const [saved, setSaved] = useState("");

  async function load() {
    const [data, secretData] = await Promise.all([
      fetch("/api/settings").then((res) => res.json()),
      fetch("/api/secrets").then((res) => res.json()),
    ]);
    setSettings(data.settings);
    setSources(data.newsSources);
    setAi(secretData.ai);
    setAiDraft((current) => ({
      ...current,
      provider: secretData.ai.provider,
      openaiModel: secretData.ai.openaiModel,
      geminiModel: secretData.ai.geminiModel,
    }));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(next = settings, message = "Gespeichert.") {
    if (!next) return;
    await fetch("/api/settings", { method: "POST", body: JSON.stringify({ settings: next }) });
    document.documentElement.dataset.theme = next.theme;
    document.documentElement.style.setProperty("--accent", next.accentColor);
    setSaved(message);
    setTimeout(() => setSaved(""), 2200);
    await load();
  }

  async function saveSource(source: NewsSourceDraft) {
    await fetch("/api/settings", { method: "POST", body: JSON.stringify({ newsSource: source }) });
    setNewSource({ name: "", url: "", category: newsCategories[0], enabled: true });
    await load();
  }

  async function saveSecrets() {
    const response = await fetch("/api/secrets", {
      method: "POST",
      body: JSON.stringify(aiDraft),
    });
    const data = await response.json();
    setAi(data.ai);
    setAiDraft((current) => ({ ...current, openaiKey: "", geminiKey: "" }));
    setSaved("KI-Zugang wurde in .env gespeichert.");
    setTimeout(() => setSaved(""), 2600);
  }

  async function deleteSource(id: number) {
    await fetch("/api/settings", { method: "POST", body: JSON.stringify({ deleteNewsSourceId: id }) });
    await load();
  }

  async function resetDailyContextQuestion() {
    if (!window.confirm("Heute wieder nach Uni/Zuhause fragen? Dein bestehender Plan bleibt bis zur neuen Antwort erhalten.")) return;
    await fetch("/api/daily-context", { method: "POST", body: JSON.stringify({ resetToday: true }) });
    setSaved("Die heutige Uni-Frage wird auf Home wieder angezeigt.");
    setTimeout(() => setSaved(""), 2600);
  }

  if (!settings) return <p className="muted">Einstellungen werden geladen.</p>;

  const panels = [
    { id: "appearance" as const, title: "Darstellung", detail: "Theme und Farbe", icon: Palette },
    { id: "ai" as const, title: "KI", detail: "OpenAI oder Gemini", icon: Bot },
    { id: "sources" as const, title: "Quellen", detail: "iCal, Wetter, RSS", icon: Rss },
    { id: "routine" as const, title: "Planung", detail: "Routine und Zeiten", icon: Clock3 },
  ];

  return (
    <div className="stack">
      <h1 className="page-title">Einstellungen</h1>
      {saved ? <div className="card small" style={{ color: "var(--ok)" }}>{saved}</div> : null}

      <div className="settings-grid">
        {panels.map((panel) => {
          const Icon = panel.icon;
          return (
            <button className={`settings-tile ${activePanel === panel.id ? "pill active" : ""}`} key={panel.id} onClick={() => setActivePanel(panel.id)}>
              <Icon size={22} />
              <span>
                <strong>{panel.title}</strong>
                <p className="muted small">{panel.detail}</p>
              </span>
            </button>
          );
        })}
      </div>

      {activePanel === "appearance" ? (
        <section className="card settings-panel">
          <h2 className="section-title">Darstellung</h2>
          <div className="pill-grid">
            {(["dark", "light"] as const).map((theme) => (
              <button
                className={`pill ${settings.theme === theme ? "active" : ""}`}
                key={theme}
                onClick={() => {
                  const next = { ...settings, theme };
                  setSettings(next);
                  document.documentElement.dataset.theme = theme;
                }}
              >
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </button>
            ))}
          </div>
          <div className="field">
            <label>Akzentfarbe</label>
            <div className="color-grid">
              {accentColors.map((color) => (
                <button
                  aria-label={`Akzentfarbe ${color}`}
                  className={`color-swatch ${settings.accentColor === color ? "active" : ""}`}
                  key={color}
                  style={{ background: color }}
                  onClick={() => {
                    const next = { ...settings, accentColor: color };
                    setSettings(next);
                    document.documentElement.style.setProperty("--accent", color);
                  }}
                />
              ))}
            </div>
          </div>
          <button className="primary" onClick={() => save(settings, "Darstellung gespeichert.")}>Darstellung speichern</button>
        </section>
      ) : null}

      {activePanel === "ai" ? (
        <section className="card settings-panel">
          <h2 className="section-title">KI-Anbieter</h2>
          <div className="pill-grid">
            {(["openai", "gemini"] as const).map((provider) => (
              <button className={`pill ${aiDraft.provider === provider ? "active" : ""}`} key={provider} onClick={() => setAiDraft({ ...aiDraft, provider })}>
                {provider === "openai" ? "OpenAI" : "Gemini"}
              </button>
            ))}
          </div>
          {aiDraft.provider === "openai" ? (
            <>
              <div className="field">
                <label>OpenAI API-Key {ai?.openaiKeyMasked ? `(gespeichert: ${ai.openaiKeyMasked})` : ""}</label>
                <input className="input" type="password" value={aiDraft.openaiKey} onChange={(event) => setAiDraft({ ...aiDraft, openaiKey: event.target.value })} placeholder="sk-..." />
              </div>
              <div className="field">
                <label>OpenAI Modell</label>
                <input className="input" value={aiDraft.openaiModel} onChange={(event) => setAiDraft({ ...aiDraft, openaiModel: event.target.value })} placeholder="gpt-5-mini" />
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label>Gemini API-Key {ai?.geminiKeyMasked ? `(gespeichert: ${ai.geminiKeyMasked})` : ""}</label>
                <input className="input" type="password" value={aiDraft.geminiKey} onChange={(event) => setAiDraft({ ...aiDraft, geminiKey: event.target.value })} placeholder="AIza..." />
              </div>
              <div className="field">
                <label>Gemini Modell</label>
                <input className="input" value={aiDraft.geminiModel} onChange={(event) => setAiDraft({ ...aiDraft, geminiModel: event.target.value })} placeholder="gemini-2.5-flash" />
              </div>
            </>
          )}
          <button className="primary" onClick={saveSecrets}>KI-Zugang speichern</button>
          <p className="muted small">Leere Key-Felder behalten den vorhandenen Key.</p>
        </section>
      ) : null}

      {activePanel === "sources" ? (
        <section className="card settings-panel">
          <h2 className="section-title">Quellen</h2>
          <div className="field">
            <label>iCal-Link</label>
            <input className="input" value={settings.icalUrl} onChange={(event) => setSettings({ ...settings, icalUrl: event.target.value })} />
          </div>
          <div className="field">
            <label>Wetter-Ort</label>
            <input className="input" value={settings.weatherPlace} onChange={(event) => setSettings({ ...settings, weatherPlace: event.target.value })} />
          </div>
          <div className="field">
            <label>News-Kategorien</label>
            <div className="pill-grid">
              {newsCategories.map((category) => (
                <button
                  className={`pill ${settings.newsCategories.includes(category) ? "active" : ""}`}
                  key={category}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      newsCategories: settings.newsCategories.includes(category)
                        ? settings.newsCategories.filter((item) => item !== category)
                        : [...settings.newsCategories, category],
                    })
                  }
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <button className="primary" onClick={() => save(settings, "Quellen gespeichert.")}>Quellen speichern</button>

          <div className="stack">
            <h3 className="section-title">RSS-Quellen</h3>
            {sources.map((source) => (
              <div className="row" key={source.id}>
                <div>
                  <strong>{source.name}</strong>
                  <p className="muted small">{source.category}</p>
                </div>
                <button className="icon-btn" onClick={() => deleteSource(source.id)} aria-label="RSS-Quelle entfernen"><Trash2 size={17} /></button>
              </div>
            ))}
            <div className="field">
              <label>Neue Quelle</label>
              <input className="input" placeholder="Name" value={newSource.name} onChange={(event) => setNewSource({ ...newSource, name: event.target.value })} />
              <input className="input" placeholder="RSS URL" value={newSource.url} onChange={(event) => setNewSource({ ...newSource, url: event.target.value })} />
              <select className="select" value={newSource.category} onChange={(event) => setNewSource({ ...newSource, category: event.target.value })}>
                {newsCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
            <button className="secondary" onClick={() => saveSource(newSource)}><Plus size={16} /> Quelle hinzufügen</button>
          </div>
        </section>
      ) : null}

      {activePanel === "routine" ? (
        <section className="card settings-panel">
          <h2 className="section-title">Planung</h2>
          <div className="field">
            <label>Routine-Level</label>
            <select className="select" value={settings.routineLevel} onChange={(event) => setSettings({ ...settings, routineLevel: event.target.value as Settings["routineLevel"] })}>
              <option value="leicht">Leicht</option>
              <option value="normal">Normal</option>
              <option value="ambitioniert">Ambitioniert</option>
            </select>
          </div>
          <div className="field">
            <label>Training-Schwierigkeit</label>
            <div className="pill-grid">
              {([
                { value: "leicht", label: "Leicht" },
                { value: "normal", label: "Normal" },
                { value: "anspruchsvoll", label: "Anspruchsvoll" },
              ] as const).map((option) => (
                <button
                  className={`pill ${settings.trainingDifficulty === option.value ? "active" : ""}`}
                  key={option.value}
                  onClick={() => setSettings({ ...settings, trainingDifficulty: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Generierung</label>
              <input className="input" type="time" value={settings.generationTime} onChange={(event) => setSettings({ ...settings, generationTime: event.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Aufstehen</label>
              <input className="input" type="time" value={settings.wakeTime} onChange={(event) => setSettings({ ...settings, wakeTime: event.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Schlafenszeit</label>
            <input className="input" type="time" value={settings.sleepTime} onChange={(event) => setSettings({ ...settings, sleepTime: event.target.value })} />
          </div>
          <button className="primary" onClick={() => save(settings, "Planung gespeichert.")}>Planung speichern</button>
          <button className="secondary" onClick={resetDailyContextQuestion}><RotateCcw size={16} /> Uni-Frage erneut anzeigen</button>
        </section>
      ) : null}
    </div>
  );
}
