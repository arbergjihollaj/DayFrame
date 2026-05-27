import type { RssCandidate } from "@/lib/rss";

const blockedTopicPatterns = [
  /\bgaming\b/i,
  /\bgames?\b/i,
  /\bthe witcher\b/i,
  /\bplaystation\b/i,
  /\bxbox\b/i,
  /\bnintendo\b/i,
  /\bsteam\b/i,
  /\bsocial media\b/i,
  /\bsoziale medien\b/i,
  /\btiktok\b/i,
  /\binstagram\b/i,
  /\bfacebook\b/i,
  /\bwhatsapp\b/i,
  /\binfluencer\b/i,
  /\bdisplay-brille\b/i,
  /\bsmart glasses\b/i,
  /\bsmartphone\b/i,
  /\bsuvs?\b/i,
  /\bapokalyptische\b/i,
  /\bweltbevölkerung\b/i,
  /\bweltbevoelkerung\b/i,
  /\bgerrymandering\b/i,
  /\bmidterms\b/i,
  /\bus-wahl/i,
];

const interestSignals: Record<string, RegExp[]> = {
  AI: [
    /\bki\b/i,
    /\bai\b/i,
    /\bopenai\b/i,
    /\bgemini\b/i,
    /\bchatgpt\b/i,
    /\bllm\b/i,
    /\bsprachmodell\b/i,
    /\bmachine learning\b/i,
    /\bdeep learning\b/i,
    /\bneuronale?\b/i,
    /\bcoding\b/i,
    /\bentwickler\b/i,
    /\bregulierung\b/i,
    /\bmodell\b/i,
  ],
  Deutschland: [
    /\bbundesregierung\b/i,
    /\bbundestag\b/i,
    /\bbundesrat\b/i,
    /\bkanzler/i,
    /\bminister/i,
    /\bwahl/i,
    /\bpartei/i,
    /\bgesetz/i,
    /\bverordnung/i,
    /\binnenpolitik\b/i,
    /\bwirtschaft\b/i,
    /\bkonjunktur\b/i,
    /\bsteuern\b/i,
    /\bhaushalt\b/i,
    /\barbeit\b/i,
    /\brente\b/i,
    /\bsozial/i,
    /\bmigration\b/i,
    /\bsicherheit\b/i,
    /\beu\b/i,
  ],
  "Kosovo / Balkan": [
    /\bkosovo\b/i,
    /\bserbien\b/i,
    /\bserbia\b/i,
    /\bbalkan\b/i,
    /\bpristina\b/i,
    /\bbelgrad\b/i,
    /\beu\b/i,
    /\bnato\b/i,
  ],
  "Studium / Karriere": [
    /\bstudium\b/i,
    /\buni\b/i,
    /\buniversit/i,
    /\bkarriere\b/i,
    /\bausbildung\b/i,
    /\bjob\b/i,
    /\bbewerbung\b/i,
    /\bfachkraefte\b/i,
    /\bfachkräfte\b/i,
  ],
  Wissenschaft: [
    /\bphysik\b/i,
    /\bquant/i,
    /\bteilchen\b/i,
    /\bkosmos\b/i,
    /\bweltraum\b/i,
    /\bbiologie\b/i,
    /\bgen/i,
    /\bzelle\b/i,
    /\bzellen\b/i,
    /\bmedizin\b/i,
    /\bneurowissenschaft\b/i,
    /\bevolution\b/i,
    /\bmikroben\b/i,
    /\bklima\b/i,
  ],
};

const technologySignals = [
  /\bcyber/i,
  /\bsicherheit\b/i,
  /\bchip\b/i,
  /\bhalbleiter\b/i,
  /\bprozessor\b/i,
  /\bserver\b/i,
  /\bcloud\b/i,
  /\bsoftware\b/i,
  /\bentwickler\b/i,
  /\bprogrammi/i,
  /\bdaten\b/i,
  /\bprivacy\b/i,
  /\bdatenschutz\b/i,
];

export function filterRelevantNewsCandidates(candidates: RssCandidate[]) {
  return candidates
    .map((candidate) => ({ candidate, score: scoreNewsCandidate(candidate) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || publishedTime(b.candidate) - publishedTime(a.candidate))
    .map((entry) => entry.candidate);
}

export function scoreNewsCandidate(candidate: Pick<RssCandidate, "title" | "category" | "source" | "contentSnippet" | "isoDate">) {
  const haystack = `${candidate.title} ${candidate.source} ${candidate.contentSnippet ?? ""}`;
  if (blockedTopicPatterns.some((pattern) => pattern.test(haystack))) return 0;

  const categorySignals = interestSignals[candidate.category] ?? [];
  const categoryScore = categorySignals.reduce((score, pattern) => score + (pattern.test(haystack) ? 2 : 0), 0);
  const techScore = technologySignals.reduce((score, pattern) => score + (pattern.test(haystack) ? 1 : 0), 0);

  if (candidate.category === "AI") return categoryScore || techScore >= 2 ? 30 + categoryScore + techScore : 0;
  if (candidate.category === "Deutschland") return categoryScore ? 28 + categoryScore : 0;
  if (candidate.category === "Wissenschaft") return categoryScore ? 24 + categoryScore : 0;
  if (candidate.category === "Kosovo / Balkan") return 0;
  if (candidate.category === "Studium / Karriere") return categoryScore ? 14 + categoryScore : 0;

  return categoryScore + techScore;
}

function publishedTime(candidate: Pick<RssCandidate, "isoDate">) {
  return new Date(candidate.isoDate ?? 0).getTime();
}
