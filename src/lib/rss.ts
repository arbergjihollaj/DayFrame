import Parser from "rss-parser";
import crypto from "node:crypto";
import { getNewsSources } from "@/lib/db";
import { filterRelevantNewsCandidates } from "@/lib/newsRelevance";

const parser = new Parser();

export type RssCandidate = {
  id: string;
  title: string;
  source: string;
  category: string;
  link?: string;
  isoDate?: string;
  contentSnippet?: string;
};

function newsCandidateId(source: string, title: string, link?: string) {
  return `news-${crypto.createHash("sha1").update(`${source}|${title}|${link ?? ""}`).digest("hex").slice(0, 12)}`;
}

export async function fetchRssCandidates(enabledCategories: string[]) {
  const normalizedCategories = enabledCategories.map(normalizeCategory);
  const sources = (getNewsSources() as {
    name: string;
    url: string;
    category: string;
    enabled: number;
  }[]).filter((source) => source.enabled && normalizedCategories.includes(normalizeCategory(source.category)));

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
              id: newsCandidateId(source.name, item.title ?? "Ohne Titel", item.link),
              title: item.title ?? "Ohne Titel",
              source: source.name,
              category: normalizeCategory(source.category),
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
    candidates: filterRelevantNewsCandidates(candidates)
      .slice(0, 40),
    errors,
  };
}

function normalizeCategory(category: string) {
  return category === "KI / OpenAI / Tech" ? "AI" : category;
}
