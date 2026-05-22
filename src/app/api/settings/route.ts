import { NextResponse } from "next/server";
import { getNewsSources, getSettings, saveSettings, upsertNewsSource, deleteNewsSource } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ settings: getSettings(), newsSources: getNewsSources() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (body.newsSource) upsertNewsSource(body.newsSource);
  if (body.deleteNewsSourceId) deleteNewsSource(Number(body.deleteNewsSourceId));
  const settings = body.settings ? saveSettings(body.settings) : getSettings();
  return NextResponse.json({ settings, newsSources: getNewsSources() });
}
