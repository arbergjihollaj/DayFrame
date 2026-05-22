import type { NewsItem } from "@/lib/types";

type NewsCandidateForLinks = {
  id: string;
  title: string;
  source: string;
  category: string;
  link?: string;
};

function normalizeNewsKey(value: string) {
  return value.trim().toLocaleLowerCase("de-DE").replace(/\s+/g, " ");
}

export function attachNewsLinks(news: NewsItem[], candidates: NewsCandidateForLinks[]) {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const byStructuredKey = new Map(
    candidates.map((candidate) => [
      `${normalizeNewsKey(candidate.source)}|${normalizeNewsKey(candidate.category)}|${normalizeNewsKey(candidate.title)}`,
      candidate,
    ]),
  );

  return news.map((item) => {
    const structuredKey = `${normalizeNewsKey(item.source)}|${normalizeNewsKey(item.category)}|${normalizeNewsKey(item.title)}`;
    const candidate = byId.get(item.id) ?? byStructuredKey.get(structuredKey);
    return candidate?.link ? { ...item, id: candidate.id, url: candidate.link } : item;
  });
}
