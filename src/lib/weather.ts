import type { WeatherSummary } from "@/lib/types";

type GeoResponse = { results?: { latitude: number; longitude: number; name: string }[] };
type ForecastResponse = {
  current?: { temperature_2m?: number };
  daily?: { precipitation_probability_max?: number[] };
  hourly?: { time?: string[]; temperature_2m?: number[]; precipitation_probability?: number[] };
};

export async function fetchWeather(place: string): Promise<{ weather: WeatherSummary; error: string | null }> {
  if (!place) {
    return {
      weather: { label: "Wetter-Ort fehlt", warning: "Trage einen Wetter-Ort in den Einstellungen ein." },
      error: "Wetter-Ort fehlt. Dein Tagesplan wurde trotzdem erstellt.",
    };
  }
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=de&format=json`;
    const geo = (await fetch(geoUrl, { next: { revalidate: 3600 } }).then((res) => res.json())) as GeoResponse;
    const found = geo.results?.[0];
    if (!found) throw new Error("place not found");
    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", String(found.latitude));
    weatherUrl.searchParams.set("longitude", String(found.longitude));
    weatherUrl.searchParams.set("current", "temperature_2m");
    weatherUrl.searchParams.set("hourly", "temperature_2m,precipitation_probability");
    weatherUrl.searchParams.set("daily", "precipitation_probability_max");
    weatherUrl.searchParams.set("timezone", "Europe/Berlin");
    const forecast = (await fetch(weatherUrl).then((res) => res.json())) as ForecastResponse;
    const temperature = Math.round(forecast.current?.temperature_2m ?? 0);
    const rain = forecast.daily?.precipitation_probability_max?.[0] ?? 0;
    const rainText = rain >= 45 ? "später Regen möglich" : "trocken";
    const now = Date.now();
    const hourly =
      forecast.hourly?.time
        ?.map((time, index) => ({
          time,
          temperature: Math.round(forecast.hourly?.temperature_2m?.[index] ?? temperature),
          precipitationProbability: forecast.hourly?.precipitation_probability?.[index],
        }))
        .filter((item) => new Date(item.time).getTime() >= now)
        .filter((_, index) => index % 2 === 0)
        .slice(0, 6)
        .map((item) => ({
          time: item.time.slice(11, 16),
          temperature: item.temperature,
          precipitationProbability: item.precipitationProbability,
        })) ?? [];
    return { weather: { place: found.name, temperature, label: `${temperature}°C · ${rainText}`, hourly }, error: null };
  } catch {
    return {
      weather: { place, label: "Wetter nicht verfügbar", warning: "Wetter konnte gerade nicht geladen werden." },
      error: "Wetter konnte gerade nicht geladen werden. Dein Tagesplan wurde trotzdem ohne Wetterdaten erstellt.",
    };
  }
}
