import Parser from "rss-parser";
import { getNewsSources } from "@/lib/db";

const parser = new Parser();

export type RssCandidate = {
  title: string;
  source: string;
  category: string;
  link?: string;
  isoDate?: string;
  contentSnippet?: string;
};

export async function fetchRssCandidates(enabledCategories: string[]) {
  const sources = (getNewsSources() as {
    name: string;
    url: string;
    category: string;
    enabled: number;
  }[]).filter((source) => source.enabled && enabledCategories.includes(source.category));

  const errors: string[] = [];
  const candidates: RssCandidate[] = [];
  const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
  await Promise.all(
    sources.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        feed.items.slice(0, 8).forEach((item) => {
          const published = item.isoDate ? new Date(item.isoDate).getTime() : Date.now();
          if (published >= cutoff) {
            candidates.push({
              title: item.title ?? "Ohne Titel",
              source: source.name,
              category: source.category,
              link: item.link,
              isoDate: item.isoDate,
              contentSnippet: item.contentSnippet?.slice(0, 500),
            });
          }
        });
      } catch {
        errors.push(`${source.name} konnte nicht geladen werden.`);
      }
    }),
  );

  return {
    candidates: candidates
      .sort((a, b) => new Date(b.isoDate ?? 0).getTime() - new Date(a.isoDate ?? 0).getTime())
      .slice(0, 40),
    errors,
  };
}
