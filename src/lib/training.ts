import { z } from "zod";
import type { DailyTrainingPlan, TrainingDifficulty } from "@/lib/types";

export const availableTrainingEquipment = ["Laufband", "Pull-up-Stange", "Liegestützebrett", "Yogamatte", "Körpergewicht"] as const;
export const visualMuscleGroups = ["Brust", "Rücken", "Schultern", "Bizeps", "Trizeps", "Bauch", "Beine", "Gesäß", "Waden", "Unterarme"] as const;

const muscleEnum = z.enum(visualMuscleGroups);

export const dailyTrainingPlanSchema = z.object({
  title: z.string().min(3),
  durationMinutes: z.number().int().min(20).max(60),
  focusMuscles: z.array(muscleEnum).min(1),
  warmup: z.array(
    z.object({
      name: z.string(),
      duration: z.string(),
      instructions: z.string(),
    }),
  ),
  exercises: z.array(
    z.object({
      name: z.string(),
      muscles: z.array(muscleEnum).min(1),
      sets: z.number().int().min(1).max(8),
      reps: z.string().nullable(),
      duration: z.string().nullable(),
      restSeconds: z.number().int().min(0).max(180),
      difficulty: z.enum(["Leicht", "Mittel", "Anspruchsvoll"]),
      instructions: z.string(),
      techniqueTip: z.string().nullable().optional(),
    }),
  ).min(3).max(9),
  cooldown: z.array(
    z.object({
      name: z.string(),
      duration: z.string(),
      instructions: z.string(),
    }),
  ),
});

const trainingJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "durationMinutes", "focusMuscles", "warmup", "exercises", "cooldown"],
  properties: {
    title: { type: "string" },
    durationMinutes: { type: "integer", minimum: 20, maximum: 60 },
    focusMuscles: { type: "array", items: { enum: visualMuscleGroups } },
    warmup: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "duration", "instructions"],
        properties: {
          name: { type: "string" },
          duration: { type: "string" },
          instructions: { type: "string" },
        },
      },
    },
    exercises: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "muscles", "sets", "reps", "duration", "restSeconds", "difficulty", "instructions", "techniqueTip"],
        properties: {
          name: { type: "string" },
          muscles: { type: "array", items: { enum: visualMuscleGroups } },
          sets: { type: "integer", minimum: 1, maximum: 8 },
          reps: { type: ["string", "null"] },
          duration: { type: ["string", "null"] },
          restSeconds: { type: "integer", minimum: 0, maximum: 180 },
          difficulty: { enum: ["Leicht", "Mittel", "Anspruchsvoll"] },
          instructions: { type: "string" },
          techniqueTip: { type: ["string", "null"] },
        },
      },
    },
    cooldown: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "duration", "instructions"],
        properties: {
          name: { type: "string" },
          duration: { type: "string" },
          instructions: { type: "string" },
        },
      },
    },
  },
};

const trainingPrompt = `
Du bist mein persönlicher Fitness-Coach. Erstelle mir für heute einen realistischen Trainingsplan für zu Hause. Verwende ausschließlich folgende Geräte: Laufband, Pull-up-Stange, Liegestützebrett, Yogamatte und Körpergewicht. Erstelle keinen Plan mit Hanteln, Maschinen oder anderen Geräten.

Der Plan soll für einen normalen jungen Erwachsenen geeignet sein und ungefähr 30 bis 45 Minuten dauern. Der Fokus soll ausgewogen sein, aber du darfst je nach Tag bestimmte Muskelgruppen stärker betonen.

Berücksichtige trainingDifficulty:
- "leicht": einsteigerfreundlich, kontrollierte Übungen, moderate Wiederholungen, mehr Pausen, keine maximalen Belastungen.
- "normal": ausgewogen und fordernd, aber realistisch.
- "anspruchsvoll": intensiver, mehr Volumen oder dichtere Blöcke, aber weiterhin sauber ausführbar und ohne Zusatzgeräte.

Gib die Antwort ausschließlich als valides JSON zurück. Keine Markdown-Erklärung, kein Text außerhalb des JSON.

JSON-Struktur:
{
  "title": "Workout-Titel",
  "durationMinutes": 40,
  "focusMuscles": ["Brust", "Trizeps", "Bauch"],
  "warmup": [
    {
      "name": "Lockeres Gehen auf dem Laufband",
      "duration": "5 Minuten",
      "instructions": "Starte langsam und steigere leicht das Tempo."
    }
  ],
  "exercises": [
    {
      "name": "Liegestütze",
      "muscles": ["Brust", "Trizeps", "Schultern"],
      "sets": 3,
      "reps": "10-12",
      "duration": null,
      "restSeconds": 60,
      "difficulty": "Mittel",
      "instructions": "Körper gerade halten und kontrolliert bewegen.",
      "techniqueTip": "Nicht ins Hohlkreuz fallen."
    }
  ],
  "cooldown": [
    {
      "name": "Dehnen auf der Yogamatte",
      "duration": "5 Minuten",
      "instructions": "Brust, Schultern, Rücken und Beine locker dehnen."
    }
  ]
}

Achte darauf, dass focusMuscles nur Muskelgruppen enthält, die auch in der Körperzeichnung hervorgehoben werden können: Brust, Rücken, Schultern, Bizeps, Trizeps, Bauch, Beine, Gesäß, Waden, Unterarme.
`.trim();

export async function generateTrainingWithGemini(date: string, difficulty: TrainingDifficulty): Promise<DailyTrainingPlan | null> {
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
        parts: [{ text: trainingPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify({
                date,
                equipment: availableTrainingEquipment,
                visualMuscleGroups,
                trainingDifficulty: difficulty,
                durationTargetMinutes: "30-45",
                language: "de-DE",
              }),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: trainingJsonSchema,
      },
    }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text) return null;
  return dailyTrainingPlanSchema.parse(JSON.parse(text));
}

export function fallbackTrainingPlan(difficulty: TrainingDifficulty = "normal"): DailyTrainingPlan {
  const plan: DailyTrainingPlan = {
    title: "Home Push & Core",
    durationMinutes: 38,
    focusMuscles: ["Brust", "Trizeps", "Schultern", "Bauch", "Beine"],
    warmup: [
      {
        name: "Lockeres Gehen auf dem Laufband",
        duration: "5 Minuten",
        instructions: "Starte ruhig und steigere das Tempo leicht, bis du warm wirst.",
      },
      {
        name: "Mobilisation auf der Yogamatte",
        duration: "3 Minuten",
        instructions: "Kreise Schultern, Hüfte und Sprunggelenke kontrolliert durch.",
      },
    ],
    exercises: [
      {
        name: "Liegestütze auf dem Liegestützebrett",
        muscles: ["Brust", "Trizeps", "Schultern"],
        sets: 3,
        reps: "8-12",
        duration: null,
        restSeconds: 60,
        difficulty: "Mittel",
        instructions: "Greife stabil, halte den Körper gerade und senke dich kontrolliert ab.",
        techniqueTip: "Ellbogen nicht komplett nach außen kippen lassen.",
      },
      {
        name: "Kniebeugen mit Körpergewicht",
        muscles: ["Beine", "Gesäß"],
        sets: 3,
        reps: "14-18",
        duration: null,
        restSeconds: 60,
        difficulty: "Mittel",
        instructions: "Setze die Hüfte zurück, bleibe auf dem ganzen Fuß und richte dich kraftvoll auf.",
        techniqueTip: "Knie folgen der Fußrichtung.",
      },
      {
        name: "Negative Pull-ups",
        muscles: ["Rücken", "Bizeps", "Unterarme"],
        sets: 3,
        reps: "3-5",
        duration: null,
        restSeconds: 90,
        difficulty: "Anspruchsvoll",
        instructions: "Springe kontrolliert in die obere Position und lasse dich langsam ab.",
        techniqueTip: "Schultern aktiv halten und nicht in den Nacken ziehen.",
      },
      {
        name: "Plank auf der Yogamatte",
        muscles: ["Bauch", "Schultern"],
        sets: 3,
        reps: null,
        duration: "35-45 Sekunden",
        restSeconds: 45,
        difficulty: "Mittel",
        instructions: "Spanne Bauch und Gesäß an und halte eine lange Linie von Kopf bis Ferse.",
        techniqueTip: "Atme ruhig weiter.",
      },
      {
        name: "Wadenheben stehend",
        muscles: ["Waden"],
        sets: 3,
        reps: "15-20",
        duration: null,
        restSeconds: 40,
        difficulty: "Leicht",
        instructions: "Drücke dich langsam auf die Fußballen und senke kontrolliert ab.",
        techniqueTip: "Oben kurz halten, nicht federn.",
      },
    ],
    cooldown: [
      {
        name: "Ruhiges Gehen auf dem Laufband",
        duration: "3 Minuten",
        instructions: "Gehe locker aus und lasse den Puls sinken.",
      },
      {
        name: "Dehnen auf der Yogamatte",
        duration: "5 Minuten",
        instructions: "Dehne Brust, Schultern, Rücken, Beine und Waden ohne Druck.",
      },
    ],
  };
  if (difficulty === "leicht") {
    return {
      ...plan,
      title: "Leichtes Home-Workout",
      durationMinutes: 32,
      focusMuscles: ["Brust", "Schultern", "Bauch", "Beine"],
      exercises: plan.exercises
        .filter((exercise) => exercise.name !== "Negative Pull-ups")
        .map((exercise) => ({
          ...exercise,
          sets: Math.min(exercise.sets, 2),
          reps: exercise.reps?.replace("14-18", "10-12").replace("15-20", "12-15").replace("8-12", "6-10") ?? exercise.reps,
          restSeconds: Math.max(exercise.restSeconds, 60),
          difficulty: exercise.difficulty === "Anspruchsvoll" ? "Mittel" : exercise.difficulty,
        })),
    };
  }
  if (difficulty === "anspruchsvoll") {
    return {
      ...plan,
      title: "Intensives Home Strength Workout",
      durationMinutes: 45,
      exercises: [
        ...plan.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.difficulty === "Leicht" ? exercise.sets : Math.min(exercise.sets + 1, 5),
          restSeconds: Math.max(exercise.restSeconds - 10, 35),
        })),
        {
          name: "Mountain Climbers auf der Yogamatte",
          muscles: ["Bauch", "Schultern", "Beine"],
          sets: 3,
          reps: null,
          duration: "35 Sekunden",
          restSeconds: 40,
          difficulty: "Anspruchsvoll",
          instructions: "Halte die Stützposition stabil und ziehe die Knie rhythmisch nach vorne.",
          techniqueTip: "Hüfte ruhig halten und nicht durchhängen.",
        },
      ],
    };
  }
  return plan;
}
