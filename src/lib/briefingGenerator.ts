import { getCarryOverTasks, getDailyContext, getEnergyCheckIn, getSettings, getTopics, saveBriefing } from "@/lib/db";
import { buildWeekLoad, fetchCalendarEvents } from "@/lib/ical";
import { fetchRssCandidates } from "@/lib/rss";
import { fetchWeather } from "@/lib/weather";
import { displayDate, greetingForNow, todayKey } from "@/lib/date";
import { fallbackBriefing, generateWithAI } from "@/lib/openai";
import { dailyPlanToSections, generateDailyPlan } from "@/lib/planning";

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
      Deutschland:
        "Deutschland-News sollen bevorzugt deutsche Innenpolitik, Bundesregierung, Bundestag, Parteien, Wahlen, Gesetzgebung und politische Entscheidungen abdecken. Allgemeine Vermischtes-Meldungen nur nehmen, wenn sie politisch relevant sind.",
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
    news: briefing.news,
    tomorrowPreview: [
      planning.emergencyPlan ? "Notfallplan ist vorbereitet und kann sofort übernommen werden." : "Plan ist bereits reduziert.",
      `Lern-Cut-off: ${planning.learningCutoff}, Bettziel: ${planning.bedtimeTarget}.`,
      ...(briefing.tomorrowPreview ?? []),
    ].slice(0, 4),
    weekLoad,
    errors: [...baseErrors, ...(briefing.errors ?? [])].filter((value, index, array) => array.indexOf(value) === index),
  });
}
