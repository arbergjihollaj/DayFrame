import OpenAI from "openai";
import { z } from "zod";
import type { DayPlan, NewsItem, WeatherSummary, WeekLoadItem } from "@/lib/types";

export const generatedBriefingSchema = z.object({
  greetingSummary: z.string(),
  weatherSummary: z.object({
    label: z.string(),
    place: z.string().optional(),
    temperature: z.number().optional(),
    warning: z.string().optional(),
  }),
  dayPlan: z.object({
    morning: z.array(zPlanItem()),
    midday: z.array(zPlanItem()),
    afternoon: z.array(zPlanItem()),
    evening: z.array(zPlanItem()),
    night: z.array(zPlanItem()),
  }),
  news: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      source: z.string(),
      summary: z.string(),
      relevance: z.string(),
      category: z.string(),
    }),
  ),
  tomorrowPreview: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
  errors: z.array(z.string()).optional(),
});

function zPlanItem() {
  return z.object({
    id: z.string(),
    type: z.enum(["calendar", "learning", "sport", "routine", "sleep"]),
    time: z.string(),
    endTime: z.string().optional(),
    title: z.string(),
  });
}

export type GeneratedBriefing = z.infer<typeof generatedBriefingSchema>;

const briefingJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["greetingSummary", "weatherSummary", "dayPlan", "news", "tomorrowPreview", "errors"],
  properties: {
    greetingSummary: { type: "string" },
    weatherSummary: {
      type: "object",
      additionalProperties: false,
      required: ["label"],
      properties: {
        label: { type: "string" },
        place: { type: "string" },
        temperature: { type: "number" },
        warning: { type: "string" },
      },
    },
    dayPlan: {
      type: "object",
      additionalProperties: false,
      required: ["morning", "midday", "afternoon", "evening", "night"],
      properties: Object.fromEntries(
        ["morning", "midday", "afternoon", "evening", "night"].map((section) => [
          section,
          {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "type", "time", "title"],
              properties: {
                id: { type: "string" },
                type: { enum: ["calendar", "learning", "sport", "routine", "sleep"] },
                time: { type: "string" },
                endTime: { type: "string" },
                title: { type: "string" },
              },
            },
          },
        ]),
      ),
    },
    news: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "source", "summary", "relevance", "category"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          source: { type: "string" },
          summary: { type: "string" },
          relevance: { type: "string" },
          category: { type: "string" },
        },
      },
    },
    tomorrowPreview: { type: "array", items: { type: "string" } },
    errors: { type: "array", items: { type: "string" } },
  },
};

const systemPrompt = `
Du bist DayFrame, Arbers privater Daily-Briefing-Assistent. Erzeuge ein persoenliches, realistisches Tagesbriefing auf Deutsch.

Antworte ausschliesslich mit validem JSON passend zum vorgegebenen Schema. Kein Markdown, kein Freitext ausserhalb des JSON.

Grundton:
- locker in der Begruessung, aber nicht uebertrieben
- sachlich-neutral bei News
- konkret, kurz, alltagstauglich
- keine Motivationstexte aufblasen

Tagesplan-Regeln:
- Plane einen realistischen Tag, nicht den perfekten Tag.
- Beruecksichtige dailyContext:
  - dailyContext.goesToUniversity true bedeutet Uni-/Unterwegs-Tag.
  - dailyContext.goesToUniversity false bedeutet Zuhause-Tag.
  - dailyContext.goesToUniversity null bedeutet neutral planen.
- Bei Uni-/Unterwegs-Tag: morgens mehr Luft lassen, Vorbereitungs-To-dos wie Tasche packen, Laptop laden, Wasserflasche mitnehmen oder Unterlagen pruefen nutzen, Lernbloecke um Uni-Termine herum planen.
- Bei Zuhause-Tag: Tagesplan als Zuhause-Lern-/Arbeits-Tag strukturieren, Lernbloecke flexibler verteilen, Routine eher auf Lernplatz, Schreibtisch, Zimmer, Haushalt oder Bewegung zuhause ausrichten.
- Nutze Kalendertermine als feste Anker und veraendere deren Zeiten nicht.
- Kalendertermine muessen als type "calendar" erscheinen.
- Kalenderdaten wurden bereits auf Arber/Familie gefiltert. Zeige keine Familienmarker wie [Ab], [Ad], [V], [M] oder [F] im Titel.
- Lern-, Sport-, Routine- und Schlafbloecke sollen sich um Kalendertermine herum einfuegen.
- Keine Essenszeiten einplanen.
- Keine sichtbaren Freizeitbloecke benennen.
- Keine sichtbaren Pufferzeiten benennen, aber intern genug Luft lassen.
- Tagesabschnitte muessen sinnvoll gefuellt sein: morning, midday, afternoon, evening, night.
- Jeder Eintrag braucht eine stabile, sprechende id.
- Jeder Eintrag zeigt nur Uhrzeit, Typ und Titel. Keine Beschreibungen im Titel verstecken.

Lernen:
- Nutze konkrete Faecher und Themen aus learningTopics.
- Priorisiere niedrige confidence, baldige examDate/deadlineDate und lange nicht gelernte Themen.
- Plane an vollen Tagen maximal 1 Lernblock, an normalen Tagen maximal 2, an freien Tagen maximal 3.
- Lernblock-Titel im Stil: "Mathe 2: Integrale".
- Keine Lernmethoden nennen wie Karteikarten, Zusammenfassung, Altklausur oder Pomodoro.

Routine:
- Routine-To-dos muessen type "routine" oder im Nachtblock type "sleep" haben.
- Sie sollen konkret, klein und direkt formuliert sein.
- Nur Routine- und Schlaf-To-dos werden spaeter abhakbar.
- Bei routineLevel "leicht" sehr vorsichtig planen.
- Wenn der Tag voll ist: 2-3 kleine To-dos. Normal: 4-5. Frei: 6-7.

Sport / Bewegung:
- Wetter beruecksichtigen.
- Bei Regen eher indoor oder frueher planen.
- Voller Tag: kurze Bewegung. Normaler Tag: maximal 1 Sportblock. Freier Tag: maximal 1 Sportblock plus optional kleine Bewegung.

Schlaf:
- Wunsch-Schlafenszeit und Wunsch-Aufstehzeit aus settings beruecksichtigen.
- Night-Block soll kurze Schlafvorbereitung enthalten.
- Wenn morgen frueh Termine sind, Abend/Nacht leichter planen.

News:
- Waehle aus newsCandidates nur wirklich relevante Artikel.
- Ruhiger Tag ca. 3 News, normal 4-6, wichtige Lage bis 8.
- Bevorzuge aktuelle Artikel.
- Deutschland-News sollen bevorzugt Politik sein: Bundesregierung, Bundestag, Parteien, Wahlen, Gesetzgebung, Sozialstaat, Wirtschaftspolitik, Sicherheit und EU-Bezug.
- Jede News braucht summary und relevance. Relevance erklaert, warum es fuer Arber relevant ist.
- Keine Original-Links ausgeben.

Fehler / fehlende Daten:
- Wenn Kalender, Wetter oder News fehlen, erstelle trotzdem ein Briefing.
- Fuege freundliche Hinweise in errors ein.
- Keine technischen Fehlermeldungen ausgeben.
`.trim();

export async function generateWithAI(input: unknown): Promise<GeneratedBriefing | null> {
  if (process.env.AI_PROVIDER === "gemini") {
    return generateWithGemini(input);
  }
  return generateWithOpenAI(input);
}

async function generateWithOpenAI(input: unknown): Promise<GeneratedBriefing | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "dayframe_briefing",
        strict: true,
        schema: briefingJsonSchema,
      },
    },
  });
  return generatedBriefingSchema.parse(JSON.parse(response.output_text));
}

async function generateWithGemini(input: unknown): Promise<GeneratedBriefing | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(input) }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: briefingJsonSchema,
      },
    }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text) return null;
  return generatedBriefingSchema.parse(JSON.parse(text));
}

export function fallbackBriefing(input: {
  greeting: string;
  weather: WeatherSummary;
  todayEvents: { title: string; startTime: string; endTime: string }[];
  topics: { subjectName?: string; name: string; confidence: number }[];
  newsCandidates: { title: string; source: string; category: string; contentSnippet?: string }[];
  weekLoad: WeekLoadItem[];
  errors: string[];
  routineLevel: string;
  wakeTime: string;
  sleepTime: string;
  dailyContext?: { goesToUniversity: boolean | null; source: "daily-modal" };
}): GeneratedBriefing {
  const learning = input.topics.sort((a, b) => a.confidence - b.confidence).slice(0, input.todayEvents.length > 3 ? 1 : 2);
  const calendarItems = input.todayEvents.map((event, index) => ({
    id: `cal-${index}-${event.startTime}`,
    type: "calendar" as const,
    time: event.startTime,
    endTime: event.endTime,
    title: event.title,
  }));
  const dayPlan: DayPlan = {
    morning: [
      ...(input.dailyContext?.goesToUniversity
        ? [
            { id: "routine-pack-bag", type: "routine" as const, time: "06:50", title: "Tasche und Unterlagen prüfen" },
            { id: "routine-bottle", type: "routine" as const, time: "07:05", title: "Wasserflasche mitnehmen" },
          ]
        : [{ id: "routine-desk-ready", type: "routine" as const, time: input.wakeTime, title: "Lernplatz vorbereiten" }]),
      { id: "routine-water", type: "routine", time: input.wakeTime, title: "Wasserflasche auffüllen" },
      ...calendarItems.filter((item) => Number(item.time.slice(0, 2)) < 12),
      ...(learning[0]
        ? [{ id: "learn-1", type: "learning" as const, time: "10:30", title: `${learning[0].subjectName}: ${learning[0].name}` }]
        : []),
    ],
    midday: [
      ...calendarItems.filter((item) => Number(item.time.slice(0, 2)) >= 12 && Number(item.time.slice(0, 2)) < 15),
      { id: "routine-reset", type: "routine", time: "13:30", title: "Schreibtisch kurz resetten" },
    ],
    afternoon: [
      ...calendarItems.filter((item) => Number(item.time.slice(0, 2)) >= 15 && Number(item.time.slice(0, 2)) < 18),
      ...(learning[1]
        ? [{ id: "learn-2", type: "learning" as const, time: "16:00", title: `${learning[1].subjectName}: ${learning[1].name}` }]
        : []),
      {
        id: "move-1",
        type: "sport",
        time: "17:30",
        title: input.dailyContext?.goesToUniversity
          ? "Kurze Bewegung nach dem Heimkommen"
          : input.weather.label.includes("Regen")
            ? "Home-Workout"
            : "Kurzer Spaziergang",
      },
    ],
    evening: [
      ...calendarItems.filter((item) => Number(item.time.slice(0, 2)) >= 18),
      { id: "routine-reflect", type: "routine", time: "20:30", title: "3 Sätze Tagesreflexion schreiben" },
    ],
    night: [
      { id: "sleep-phone", type: "sleep", time: "22:45", title: "Handy weglegen" },
      { id: "sleep-target", type: "sleep", time: input.sleepTime, title: "Schlafenszeit anpeilen" },
    ],
  };

  const news: NewsItem[] = input.newsCandidates.slice(0, 5).map((item, index) => ({
    id: `news-${index}`,
    title: item.title,
    source: item.source,
    summary: item.contentSnippet?.slice(0, 160) || "Kurzer Artikel aus deiner RSS-Auswahl.",
    relevance: "Passt zu deinen aktivierten Nachrichtenkategorien.",
    category: item.category,
  }));

  return {
    greetingSummary: `${input.greeting}. Dein Plan wurde mit der lokalen Fallback-Logik erstellt.`,
    weatherSummary: input.weather,
    dayPlan,
    news,
    tomorrowPreview: [
      input.weekLoad[1]?.load ? "morgen etwas Kalenderlast einplanen" : "morgen eher ruhiger Tag",
      "Nachtblock heute leicht halten",
      "kurze Bewegung einplanen",
    ],
    errors: [...input.errors, "KI-Anbieter ist nicht konfiguriert oder nicht erreichbar. Lokaler Basisplan wurde erstellt."],
  };
}
