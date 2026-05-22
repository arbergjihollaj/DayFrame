import type { Settings } from "@/lib/types";

export const newsCategories = [
  "KI / OpenAI / Tech",
  "Deutschland",
  "Kosovo / Balkan",
  "Studium / Karriere",
  "Wissenschaft",
];

export const defaultSettings: Settings = {
  icalUrl: "",
  weatherPlace: "",
  theme: "dark",
  accentColor: "#78a6ff",
  routineLevel: "leicht",
  newsCategories,
  generationTime: "06:30",
  sleepTime: "23:30",
  wakeTime: "07:00",
  setupCompleted: false,
};

export const defaultNewsSources = [
  { name: "OpenAI Blog", url: "https://openai.com/news/rss.xml", category: "KI / OpenAI / Tech" },
  { name: "Heise", url: "https://www.heise.de/rss/heise-atom.xml", category: "KI / OpenAI / Tech" },
  { name: "t3n", url: "https://t3n.de/rss.xml", category: "KI / OpenAI / Tech" },
  { name: "Tagesschau Innenpolitik", url: "https://www.tagesschau.de/inland/innenpolitik/index~rss2.xml", category: "Deutschland" },
  { name: "Deutschlandfunk Politik", url: "https://www.deutschlandfunk.de/politikportal-100.rss", category: "Deutschland" },
  { name: "ZEIT Politik", url: "https://newsfeed.zeit.de/politik/index", category: "Deutschland" },
  { name: "Balkan Insight", url: "https://balkaninsight.com/feed/", category: "Kosovo / Balkan" },
  { name: "Kosovo 2.0", url: "https://kosovotwopointzero.com/en/feed/", category: "Kosovo / Balkan" },
  { name: "Make it in Germany", url: "https://www.make-it-in-germany.com/en/service/newsletter/rss", category: "Studium / Karriere" },
  { name: "Spektrum", url: "https://www.spektrum.de/alias/rss/spektrum-de-rss-feed/996406", category: "Wissenschaft" },
  { name: "Max-Planck-Gesellschaft", url: "https://www.mpg.de/rss/news", category: "Wissenschaft" },
  { name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/top/science.xml", category: "Wissenschaft" },
];
