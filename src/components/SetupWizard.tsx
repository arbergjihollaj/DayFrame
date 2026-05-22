"use client";

import { useState } from "react";
import { newsCategories } from "@/lib/defaults";
import type { Settings } from "@/lib/types";

export function SetupWizard({ settings, onDone }: { settings: Settings; onDone: () => void }) {
  const [draft, setDraft] = useState(settings);

  async function save(skip = false) {
    await fetch("/api/settings", {
      method: "POST",
      body: JSON.stringify({ settings: { ...draft, setupCompleted: true, ...(skip ? { icalUrl: "", weatherPlace: "" } : {}) } }),
    });
    onDone();
  }

  return (
    <div className="stack">
      <h1 className="page-title">DayFrame einrichten</h1>
      <p className="muted">Kurz die wichtigsten Quellen setzen. Du kannst alles spaeter in den Einstellungen aendern.</p>
      <div className="card stack">
        <div className="field">
          <label>iCal-Link</label>
          <input className="input" value={draft.icalUrl} onChange={(event) => setDraft({ ...draft, icalUrl: event.target.value })} placeholder="https://..." />
        </div>
        <div className="field">
          <label>Wetter-Ort</label>
          <input className="input" value={draft.weatherPlace} onChange={(event) => setDraft({ ...draft, weatherPlace: event.target.value })} placeholder="Berlin" />
        </div>
        <div className="field">
          <label>Theme</label>
          <select className="select" value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value as Settings["theme"] })}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        <div className="field">
          <label>Routine-Level</label>
          <select className="select" value={draft.routineLevel} onChange={(event) => setDraft({ ...draft, routineLevel: event.target.value as Settings["routineLevel"] })}>
            <option value="leicht">Leicht</option>
            <option value="normal">Normal</option>
            <option value="ambitioniert">Ambitioniert</option>
          </select>
        </div>
        <div className="field">
          <label>News-Kategorien</label>
          <div className="pill-grid">
            {newsCategories.map((category) => (
              <button
                className={`pill ${draft.newsCategories.includes(category) ? "active" : ""}`}
                key={category}
                onClick={() =>
                  setDraft({
                    ...draft,
                    newsCategories: draft.newsCategories.includes(category)
                      ? draft.newsCategories.filter((item) => item !== category)
                      : [...draft.newsCategories, category],
                  })
                }
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <button className="primary" onClick={() => save(false)}>Setup speichern</button>
        <button className="secondary" onClick={() => save(true)}>Ueberspringen</button>
      </div>
    </div>
  );
}
