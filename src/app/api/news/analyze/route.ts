import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  title: z.string().min(1),
  source: z.string().min(1),
  summary: z.string().min(1),
  relevance: z.string().optional(),
  category: z.string().optional(),
});

export async function POST(request: Request) {
  const item = requestSchema.parse(await request.json());
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ insight: fallbackInsight(item), source: "fallback" });
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: "Du bist DayFrames News-Analyst. Schreibe auf Deutsch maximal 4 kurze Bulletpoints: Kernaussage, warum es relevant ist, mögliche Folge, was Arber beobachten sollte. Kein Markdown-Titel.",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(item) }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
      },
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ insight: fallbackInsight(item), source: "fallback" });
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const insight = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  return NextResponse.json({ insight: insight || fallbackInsight(item), source: insight ? "gemini" : "fallback" });
}

function fallbackInsight(item: z.infer<typeof requestSchema>) {
  return [
    `Kernaussage: ${item.summary}`,
    item.relevance ? `Relevanz: ${item.relevance}` : `Relevanz: Das Thema liegt in der Kategorie ${item.category ?? "News"}.`,
    "Beobachten: Folgeupdates und konkrete politische, technische oder wirtschaftliche Auswirkungen.",
  ].join("\n");
}
