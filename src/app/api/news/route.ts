import { NextResponse } from "next/server";
import { getBriefingByDate, getSettings } from "@/lib/db";
import { todayKey } from "@/lib/date";
import { attachNewsLinks } from "@/lib/newsLinks";
import { fetchRssCandidates } from "@/lib/rss";

export async function GET() {
  const news = getBriefingByDate(todayKey())?.news ?? [];
  if (!news.length || news.every((item) => item.url)) {
    return NextResponse.json({ news });
  }

  const rss = await fetchRssCandidates(getSettings().newsCategories);
  return NextResponse.json({ news: attachNewsLinks(news, rss.candidates) });
}
