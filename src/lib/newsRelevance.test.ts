import assert from "node:assert/strict";
import test from "node:test";
import { filterRelevantNewsCandidates, scoreNewsCandidate } from "@/lib/newsRelevance";
import type { RssCandidate } from "@/lib/rss";

test("Gaming und Social-Media-Meldungen werden ausgefiltert", () => {
  assert.equal(scoreNewsCandidate(candidate("The Witcher 3: Neue Erweiterung angekündigt", "AI")), 0);
  assert.equal(scoreNewsCandidate(candidate("Social Media: Neue TikTok-Funktion startet", "AI")), 0);
  assert.equal(scoreNewsCandidate(candidate("Smart Glasses fuer Polizisten vorgestellt", "AI")), 0);
  assert.equal(scoreNewsCandidate(candidate("Apokalyptische Modellierung: Laut Mathematik bricht die Weltbevoelkerung zusammen", "Wissenschaft")), 0);
  assert.equal(scoreNewsCandidate(candidate("Gerrymandering vor den Midterms: Kampf um US-Wahlkreise", "Deutschland")), 0);
});

test("wichtige AI-, Innenpolitik- und Wissenschaftsmeldungen bleiben relevant", () => {
  assert.ok(scoreNewsCandidate(candidate("OpenAI stellt neues LLM fuer Coding und Forschung vor", "AI")) > 0);
  assert.ok(scoreNewsCandidate(candidate("Bundestag beschliesst neues Gesetz zur Wirtschaftspolitik", "Deutschland")) > 0);
  assert.ok(scoreNewsCandidate(candidate("Quantenphysik: Neue Messung erklaert Teilchen-Verhalten", "Wissenschaft")) > 0);
  assert.ok(scoreNewsCandidate(candidate("Biologie: Forschende entdecken neuen Mechanismus in Zellen", "Wissenschaft")) > 0);
});

test("Filter sortiert irrelevante Artikel aus und behaelt passende Kandidaten", () => {
  const filtered = filterRelevantNewsCandidates([
    candidate("The Witcher 3: Neue Erweiterung angekuendigt", "AI"),
    candidate("Gemini verbessert Coding-Agenten fuer Entwickler", "AI"),
    candidate("Smartphone-Hersteller zeigt neues Display", "AI"),
    candidate("Sole Bidder: SUVs in Kosovo Attack Lead to String of Suspect Serbian Tenders", "Kosovo / Balkan"),
  ]);

  assert.deepEqual(filtered.map((item) => item.title), ["Gemini verbessert Coding-Agenten fuer Entwickler"]);
});

function candidate(title: string, category: string): RssCandidate {
  return {
    id: `news-${title}`,
    title,
    source: "Test",
    category,
    isoDate: "2026-05-27T12:00:00.000Z",
    contentSnippet: "",
  };
}
