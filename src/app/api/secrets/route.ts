import { NextResponse } from "next/server";
import { getAiEnvironment, updateEnvFile } from "@/lib/envFile";

export async function GET() {
  return NextResponse.json({ ai: getAiEnvironment() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const updates: Record<string, string> = {};

  if (typeof body.geminiModel === "string") updates.GEMINI_MODEL = body.geminiModel.trim() || "gemini-2.5-flash";
  if (typeof body.geminiKey === "string" && body.geminiKey.trim()) updates.GEMINI_API_KEY = body.geminiKey.trim();
  if (!process.env.APP_BASE_URL) updates.APP_BASE_URL = "http://localhost:3000";
  if (!process.env.TZ) updates.TZ = "Europe/Berlin";

  updateEnvFile(updates);
  return NextResponse.json({ ai: getAiEnvironment() });
}
