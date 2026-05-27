import { getCarryOverTasks, getDailyContext, getEnergyCheckIn, getSettings, getTopics, saveBriefing } from "@/lib/db";
import { buildWeekLoad, fetchCalendarEvents } from "@/lib/ical";
import { fetchRssCandidates } from "@/lib/rss";
import { fetchWeather } from "@/lib/weather";
import { displayDate, greetingForNow, todayKey } from "@/lib/date";
import { fallbackBriefing, generateWithAI } from "@/lib/ai";
import { dailyPlanToSections, generateDailyPlan } from "@/lib/planning";
import { attachNewsLinks } from "@/lib/newsLinks";

export async function generateBriefing() {
  const settings = getSettings();
  const date = todayKey();
  const [calendar, weatherResult, rss] = await Promise.all([
    fetchCalendarEvents(settings.icalUrl),
    fetchWeather(settings.weatherPlace),
    fetchRssCandidates(settings.newsCategories),
  ]);
  const weekLoad = buildWeekLoad(calendar.events);
  const todayEvents = calendar.events.filter((event) => event.date === date);
  const dailyContextRow = getDailyContext(date);
  const planning = generateDailyPlan({
    date,
    calendarEvents: calendar.events,
    checkIn: getEnergyCheckIn(date),
    carryOvers: getCarryOverTasks(date),
    goesToUniversity: dailyContextRow?.goesToUniversity ?? null,
  });
  const dailyContext = {
    goesToUniversity: dailyContextRow?.goesToUniversity ?? null,
    source: "daily-modal" as const,
  };
  const topics = getTopics();
  const baseErrors = [calendar.error, weatherResult.error, ...rss.errors].filter(Boolean) as string[];

  const input = {
    date,
    displayDate: displayDate(),
    newsPreferences: {
      AI:
        "Nur wichtige AI-News nehmen: LLMs, OpenAI/Gemini, KI-Forschung, Coding-Tools, KI-Regulierung, KI-Infrastruktur oder gesellschaftlich relevante KI-Entwicklungen. Gaming, Social Media, normale Gadget- und App-News vermeiden.",
      Deutschland:
        "Deutschland-News sollen bevorzugt deutsche Innenpolitik, Bundesregierung, Bundestag, Parteien, Wahlen, Gesetzgebung, Wirtschaftspolitik, Sozialstaat, Sicherheit, Migration und politische Entscheidungen abdecken. Allgemeine Vermischtes-Meldungen nur nehmen, wenn sie politisch oder wirtschaftlich relevant sind.",
      Wissenschaft:
        "Wissenschaft-News bevorzugt zu Physik, Quanten, Weltraum, Biologie, Genetik, Zellen, Medizin und Neurowissenschaften. Kuriose Vermischtes-Wissenschaft nur nehmen, wenn sie wirklich wichtig ist.",
      Technik:
        "Technik-News nur nehmen, wenn sie Entwickler, IT-Sicherheit, Chips, Software, Daten, Infrastruktur, Regulierung oder groessere wirtschaftliche Folgen betrifft. Reine Produktlaunches und Consumer-Gadgets vermeiden.",
      "Kosovo / Balkan":
        "Aktuell nicht priorisieren, ausser Arber aktiviert spaeter ausdruecklich wieder Balkan-News als Kerninteresse.",
    },
    settings,
    dailyContext,
    weather: weatherResult.weather,
    todayEvents,
    weekLoad,
    learningTopics: topics,
    newsCandidates: rss.candidates,
    recentSignals: [],
  };

  let generated = null;
  try {
    generated = await generateWithAI(input);
  } catch {
    generated = null;
  }

  const briefing =
    generated ??
    fallbackBriefing({
      greeting: greetingForNow(),
      weather: weatherResult.weather,
      todayEvents,
      topics,
      newsCandidates: rss.candidates,
      weekLoad,
      errors: baseErrors,
      routineLevel: settings.routineLevel,
      wakeTime: settings.wakeTime,
      sleepTime: settings.sleepTime,
      dailyContext,
    });

  return saveBriefing({
    date,
    generatedAt: new Date().toISOString(),
    greeting: briefing.greetingSummary || greetingForNow(),
    weather: briefing.weatherSummary,
    dayPlan: dailyPlanToSections(planning),
    planning,
    news: attachNewsLinks(briefing.news, rss.candidates),
    tomorrowPreview: [
      planning.emergencyPlan ? "Notfallplan ist vorbereitet und kann sofort übernommen werden." : "Plan ist bereits reduziert.",
      `Lern-Cut-off: ${planning.learningCutoff}, Bettziel: ${planning.bedtimeTarget}.`,
      ...(briefing.tomorrowPreview ?? []),
    ].slice(0, 4),
    weekLoad,
    errors: [...baseErrors, ...(briefing.errors ?? [])].filter((value, index, array) => array.indexOf(value) === index),
  });
}
