import { NextResponse } from "next/server";
import { getAiEnvironment, updateEnvFile } from "@/lib/envFile";

export async function GET() {
  return NextResponse.json({ ai: getAiEnvironment() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const updates: Record<string, string> = {};

  if (body.provider === "openai" || body.provider === "gemini") {
    updates.AI_PROVIDER = body.provider;
  }
  if (typeof body.openaiModel === "string") updates.OPENAI_MODEL = body.openaiModel.trim() || "gpt-5-mini";
  if (typeof body.geminiModel === "string") updates.GEMINI_MODEL = body.geminiModel.trim() || "gemini-2.5-flash";
  if (typeof body.openaiKey === "string" && body.openaiKey.trim()) updates.OPENAI_API_KEY = body.openaiKey.trim();
  if (typeof body.geminiKey === "string" && body.geminiKey.trim()) updates.GEMINI_API_KEY = body.geminiKey.trim();
  if (!process.env.APP_BASE_URL) updates.APP_BASE_URL = "http://localhost:3000";
  if (!process.env.TZ) updates.TZ = "Europe/Berlin";

  updateEnvFile(updates);
  return NextResponse.json({ ai: getAiEnvironment() });
}
