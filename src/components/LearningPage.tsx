"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Subject, Topic } from "@/lib/types";

export function LearningPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [topic, setTopic] = useState({ subjectId: 0, name: "", confidence: 3, examDate: "", deadlineDate: "" });

  async function load() {
    const [subjectData, topicData] = await Promise.all([
      fetch("/api/learning/subjects").then((res) => res.json()),
      fetch("/api/learning/topics").then((res) => res.json()),
    ]);
    setSubjects(subjectData.subjects);
    setTopics(topicData.topics);
    if (!topic.subjectId && subjectData.subjects[0]) setTopic((current) => ({ ...current, subjectId: subjectData.subjects[0].id }));
  }

  useEffect(() => {
    load();
    // Daten werden beim ersten Oeffnen geladen; spaetere Updates laufen ueber die Aktionen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addSubject() {
    if (!subjectName.trim()) return;
    await fetch("/api/learning/subjects", { method: "POST", body: JSON.stringify({ name: subjectName.trim() }) });
    setSubjectName("");
    await load();
  }

  async function addTopic() {
    if (!topic.name.trim() || !topic.subjectId) return;
    await fetch("/api/learning/topics", {
      method: "POST",
      body: JSON.stringify({
        topic: {
          subjectId: topic.subjectId,
          name: topic.name.trim(),
          confidence: topic.confidence,
          examDate: topic.examDate || null,
          deadlineDate: topic.deadlineDate || null,
        },
      }),
    });
    setTopic({ ...topic, name: "", confidence: 3, examDate: "", deadlineDate: "" });
    await load();
  }

  async function confidence(id: number, value: number) {
    await fetch("/api/learning/topics", { method: "POST", body: JSON.stringify({ confidenceId: id, confidence: value }) });
    await load();
  }

  async function removeTopic(id: number) {
    await fetch("/api/learning/topics", { method: "POST", body: JSON.stringify({ deleteId: id }) });
    await load();
  }

  return (
    <div className="stack">
      <h1 className="page-title">Lernen</h1>
      <section className="card stack">
        <h2 className="section-title">Fach anlegen</h2>
        <div className="row">
          <input className="input" value={subjectName} onChange={(event) => setSubjectName(event.target.value)} placeholder="z. B. Mathe 2" />
          <button className="icon-btn" onClick={addSubject} aria-label="Fach hinzufügen"><Plus size={18} /></button>
        </div>
      </section>

      <section className="card stack">
        <h2 className="section-title">Thema hinzufügen</h2>
        <select className="select" value={topic.subjectId} onChange={(event) => setTopic({ ...topic, subjectId: Number(event.target.value) })}>
          <option value={0}>Fach wählen</option>
          {subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}
        </select>
        <input className="input" value={topic.name} onChange={(event) => setTopic({ ...topic, name: event.target.value })} placeholder="Thema" />
        <div className="field">
          <label>Sicherheit: {topic.confidence}</label>
          <input type="range" min={1} max={5} value={topic.confidence} onChange={(event) => setTopic({ ...topic, confidence: Number(event.target.value) })} />
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Prüfung</label>
            <input className="input" type="date" value={topic.examDate} onChange={(event) => setTopic({ ...topic, examDate: event.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Deadline</label>
            <input className="input" type="date" value={topic.deadlineDate} onChange={(event) => setTopic({ ...topic, deadlineDate: event.target.value })} />
          </div>
        </div>
        <button className="primary" onClick={addTopic}>Thema speichern</button>
      </section>

      <section className="stack">
        {subjects.map((subject) => (
          <div className="card stack" key={subject.id}>
            <h2 className="section-title">{subject.name}</h2>
            {topics.filter((item) => item.subjectId === subject.id).map((item) => (
              <div className="plan-item" key={item.id}>
                <span>📘</span>
                <span>
                  <strong>{item.name}</strong>
                  <p className="muted small">zuletzt gelernt: {item.lastStudiedAt ?? "offen"}</p>
                </span>
                <div className="row">
                  <select className="select" style={{ width: 70 }} value={item.confidence} onChange={(event) => confidence(item.id, Number(event.target.value))}>
                    {[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}
                  </select>
                  <button className="icon-btn" onClick={() => removeTopic(item.id)} aria-label="Thema löschen"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {!topics.some((item) => item.subjectId === subject.id) ? <p className="muted small">Noch keine Themen.</p> : null}
          </div>
        ))}
      </section>
    </div>
  );
}
