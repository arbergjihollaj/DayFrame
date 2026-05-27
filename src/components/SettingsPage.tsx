"use client";

import { useEffect, useState } from "react";
import { Bot, Clock3, Palette, Plus, RotateCcw, Rss, Trash2 } from "lucide-react";
import { newsCategories } from "@/lib/defaults";
import type { Settings } from "@/lib/types";

type NewsSource = { id: number; name: string; url: string; category: string; enabled: number };
type NewsSourceDraft = { id?: number; name: string; url: string; category: string; enabled: boolean };
type SettingsPanel = "appearance" | "ai" | "sources" | "routine";
type TrainingSettings = {
  trainingAIEnabled: boolean;
  equipment: string[];
  defaultEffort: number;
};
type AiSecrets = {
  geminiKeyMasked: string;
  geminiModel: string;
  geminiKeys: {
    id: string;
    nickname: string;
    masked: string;
    active: boolean;
  }[];
};

const accentColors = ["#6063ee", "#35b3a6", "#19a974", "#e95878", "#ffb95f", "#7c5cff"];

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [trainingSettings, setTrainingSettings] = useState<TrainingSettings | null>(null);
  const [activePanel, setActivePanel] = useState<SettingsPanel | null>(null);
  const [ai, setAi] = useState<AiSecrets | null>(null);
  const [aiDraft, setAiDraft] = useState({
    geminiNickname: "",
    geminiKey: "",
    geminiModel: "gemini-2.5-flash",
  });
  const [newSource, setNewSource] = useState({ name: "", url: "", category: newsCategories[0], enabled: true });
  const [saved, setSaved] = useState("");

  async function load() {
    const [data, secretData, trainingData] = await Promise.all([
      fetch("/api/settings").then((res) => res.json()),
      fetch("/api/secrets").then((res) => res.json()),
      fetch("/api/training/settings").then((res) => res.json()),
    ]);
    setSettings(data.settings);
    setSources(data.newsSources);
    setTrainingSettings(trainingData.settings);
    setAi(secretData.ai);
    setAiDraft((current) => ({
      ...current,
      geminiModel: secretData.ai.geminiModel,
    }));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty("--accent", settings.accentColor);
  }, [settings]);

  async function save(next = settings, message = "Gespeichert.") {
    if (!next) return;
    await fetch("/api/settings", { method: "POST", body: JSON.stringify({ settings: next }) });
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
    setAiDraft((current) => ({ ...current, geminiNickname: "", geminiKey: "" }));
    setSaved("Gemini-Zugang wurde in .env gespeichert.");
    setTimeout(() => setSaved(""), 2600);
  }

  async function deleteGeminiKey(id: string) {
    await fetch("/api/secrets", {
      method: "POST",
      body: JSON.stringify({ deleteGeminiKeyId: id }),
    });
    setSaved("Gemini-Key wurde entfernt.");
    setTimeout(() => setSaved(""), 2200);
    await load();
  }

  async function toggleTrainingApi() {
    if (!trainingSettings) return;
    const next = { ...trainingSettings, trainingAIEnabled: !trainingSettings.trainingAIEnabled };
    setTrainingSettings(next);
    const response = await fetch("/api/training/settings", {
      method: "POST",
      body: JSON.stringify({ trainingAIEnabled: next.trainingAIEnabled }),
    });
    const data = await response.json();
    setTrainingSettings(data.settings);
    setSaved(next.trainingAIEnabled ? "Training nutzt jetzt die Gemini API." : "Training nutzt jetzt den lokalen Algorithmus.");
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

  const currentSettings = settings;

  const panels = [
    { id: "appearance" as const, title: "Darstellung", detail: "Theme und Farbe", icon: Palette },
    { id: "ai" as const, title: "Gemini", detail: "API-Key und Modell", icon: Bot },
    { id: "sources" as const, title: "Quellen", detail: "iCal, Wetter, RSS", icon: Rss },
    { id: "routine" as const, title: "Planung", detail: "Routine und Zeiten", icon: Clock3 },
  ];

  function panelContent(panel: SettingsPanel) {
    if (panel === "appearance") {
      return (
        <section className="settings-panel">
          <h2 className="section-title">Darstellung</h2>
          <div className="pill-grid">
            {(["dark", "light"] as const).map((theme) => (
              <button
                className={`pill ${currentSettings.theme === theme ? "active" : ""}`}
                key={theme}
                onClick={() => {
                  const next = { ...currentSettings, theme };
                  setSettings(next);
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
                  className={`color-swatch ${currentSettings.accentColor === color ? "active" : ""}`}
                  key={color}
                  style={{ background: color }}
                  onClick={() => {
                    const next = { ...currentSettings, accentColor: color };
                    setSettings(next);
                  }}
                />
              ))}
            </div>
          </div>
          <button className="primary" onClick={() => save(currentSettings, "Darstellung gespeichert.")}>Darstellung speichern</button>
        </section>
      );
    }

    if (panel === "ai") {
      return (
        <section className="settings-panel">
          <h2 className="section-title">Gemini API</h2>
          <div className="settings-status-row">
            <span className="tag">Gemini</span>
            <span className="muted small">{ai?.geminiKeyMasked ? `Key gespeichert: ${ai.geminiKeyMasked}` : "Kein Key gespeichert"}</span>
          </div>
          <div className="settings-status-row training-api-toggle-row">
            <button
              className={`api-toggle-button ${trainingSettings?.trainingAIEnabled ? "active" : ""}`}
              onClick={toggleTrainingApi}
              type="button"
              aria-label={trainingSettings?.trainingAIEnabled ? "Training API ausschalten" : "Training API einschalten"}
              aria-pressed={Boolean(trainingSettings?.trainingAIEnabled)}
            />
          </div>
          <div className="field">
            <label>Spitzname</label>
            <input className="input" value={aiDraft.geminiNickname} onChange={(event) => setAiDraft({ ...aiDraft, geminiNickname: event.target.value })} placeholder="Privat, Uni, Backup..." />
          </div>
          <div className="field">
            <label>Gemini API-Key</label>
            <input className="input" type="password" value={aiDraft.geminiKey} onChange={(event) => setAiDraft({ ...aiDraft, geminiKey: event.target.value })} placeholder="AIza..." />
          </div>
          <div className="field">
            <label>Gemini Modell</label>
            <input className="input" value={aiDraft.geminiModel} onChange={(event) => setAiDraft({ ...aiDraft, geminiModel: event.target.value })} placeholder="gemini-2.5-flash" />
          </div>
          <button className="primary" onClick={saveSecrets}>Gemini-Zugang speichern</button>
          <div className="stack">
            <h3 className="section-title">Gespeicherte API-Keys</h3>
            {ai?.geminiKeys.length ? (
              ai.geminiKeys.map((key) => (
                <div className="row" key={key.id}>
                  <div>
                    <strong>{key.nickname}</strong>
                    <p className="muted small">{key.active ? "Aktiv" : "Gespeichert"} · {key.masked}</p>
                  </div>
                  <button className="icon-btn" onClick={() => deleteGeminiKey(key.id)} aria-label={`Gemini-Key ${key.nickname} entfernen`}><Trash2 size={17} /></button>
                </div>
              ))
            ) : (
              <p className="muted small">Noch keine Gemini-Keys gespeichert.</p>
            )}
          </div>
          <div className="quota-card">
            <strong>Kontingent</strong>
            <p className="muted small">Google stellt das freie Restkontingent nicht direkt über die Gemini-API bereit. Die offizielle Nutzung siehst du im AI Studio.</p>
            <a className="secondary" href="https://aistudio.google.com/usage" target="_blank" rel="noreferrer">Usage öffnen</a>
          </div>
          <p className="muted small">Leeres Key-Feld behält den vorhandenen Key.</p>
        </section>
      );
    }

    if (panel === "sources") {
      return (
        <section className="settings-panel">
          <h2 className="section-title">Quellen</h2>
          <div className="field">
            <label>iCal-Link</label>
            <input className="input" value={currentSettings.icalUrl} onChange={(event) => setSettings({ ...currentSettings, icalUrl: event.target.value })} />
          </div>
          <div className="field">
            <label>Wetter-Ort</label>
            <input className="input" value={currentSettings.weatherPlace} onChange={(event) => setSettings({ ...currentSettings, weatherPlace: event.target.value })} />
          </div>
          <div className="field">
            <label>News-Kategorien</label>
            <div className="pill-grid">
              {newsCategories.map((category) => (
                <button
                  className={`pill ${currentSettings.newsCategories.includes(category) ? "active" : ""}`}
                  key={category}
                  onClick={() =>
                    setSettings({
                      ...currentSettings,
                      newsCategories: currentSettings.newsCategories.includes(category)
                        ? currentSettings.newsCategories.filter((item) => item !== category)
                        : [...currentSettings.newsCategories, category],
                    })
                  }
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <button className="primary" onClick={() => save(currentSettings, "Quellen gespeichert.")}>Quellen speichern</button>

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
      );
    }

    return (
      <section className="settings-panel">
        <h2 className="section-title">Planung</h2>
        <div className="field">
          <label>Routine-Level</label>
          <select className="select" value={currentSettings.routineLevel} onChange={(event) => setSettings({ ...currentSettings, routineLevel: event.target.value as Settings["routineLevel"] })}>
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
                className={`pill ${currentSettings.trainingDifficulty === option.value ? "active" : ""}`}
                key={option.value}
                onClick={() => setSettings({ ...currentSettings, trainingDifficulty: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Generierung</label>
            <input className="input" type="time" value={currentSettings.generationTime} onChange={(event) => setSettings({ ...currentSettings, generationTime: event.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Aufstehen</label>
            <input className="input" type="time" value={currentSettings.wakeTime} onChange={(event) => setSettings({ ...currentSettings, wakeTime: event.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Schlafenszeit</label>
          <input className="input" type="time" value={currentSettings.sleepTime} onChange={(event) => setSettings({ ...currentSettings, sleepTime: event.target.value })} />
        </div>
        <button className="primary" onClick={() => save(currentSettings, "Planung gespeichert.")}>Planung speichern</button>
        <button className="secondary" onClick={resetDailyContextQuestion}><RotateCcw size={16} /> Uni-Frage erneut anzeigen</button>
      </section>
    );
  }

  return (
    <div className="stack">
      <h1 className="page-title">Einstellungen</h1>
      {saved ? <div className="card small" style={{ color: "var(--ok)" }}>{saved}</div> : null}

      <div className="settings-accordion">
        {panels.map((panel) => {
          const Icon = panel.icon;
          const active = activePanel === panel.id;
          return (
            <article className={`settings-accordion-item ${active ? "open" : ""}`} key={panel.id}>
              <button className="settings-tile" aria-expanded={active} onClick={() => setActivePanel(active ? null : panel.id)}>
                <Icon size={22} />
                <span>
                  <strong>{panel.title}</strong>
                  <p className="muted small">{panel.detail}</p>
                </span>
              </button>
              <div className="settings-panel-shell" aria-hidden={!active}>
                <div className="settings-panel-inner">{active ? panelContent(panel.id) : null}</div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
