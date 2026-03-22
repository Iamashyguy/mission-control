import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Use wttr.in API (no key needed) — Bhubaneswar, India (Ashish's location)
const CITY = "Bhubaneswar";
const WTTR_URL = `https://wttr.in/${CITY}?format=j1`;

const WEATHER_EMOJIS: Record<string, string> = {
  "Sunny": "☀️", "Clear": "🌙", "Partly cloudy": "⛅", "Cloudy": "☁️",
  "Overcast": "☁️", "Mist": "🌫️", "Fog": "🌫️", "Light rain": "🌦️",
  "Moderate rain": "🌧️", "Heavy rain": "🌧️", "Light drizzle": "🌦️",
  "Patchy rain possible": "🌦️", "Thundery outbreaks possible": "⛈️",
  "Light snow": "🌨️", "Heavy snow": "❄️", "Haze": "🌫️",
};

function getEmoji(condition: string): string {
  for (const [key, emoji] of Object.entries(WEATHER_EMOJIS)) {
    if (condition.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return "🌤️";
}

export async function GET() {
  try {
    const res = await fetch(WTTR_URL, { next: { revalidate: 1800 } }); // Cache 30 min
    if (!res.ok) throw new Error("Weather API failed");
    const data = await res.json();

    const current = data.current_condition?.[0];
    const forecast = data.weather?.slice(0, 3) || [];

    if (!current) throw new Error("No weather data");

    const condition = current.weatherDesc?.[0]?.value || "Unknown";

    return NextResponse.json({
      city: CITY,
      temp: parseInt(current.temp_C) || 0,
      feels_like: parseInt(current.FeelsLikeC) || 0,
      humidity: parseInt(current.humidity) || 0,
      wind: parseInt(current.windspeedKmph) || 0,
      precipitation: parseFloat(current.precipMM) || 0,
      condition,
      emoji: getEmoji(condition),
      forecast: forecast.map((day: { date: string; maxtempC: string; mintempC: string; hourly?: Array<{ weatherDesc?: Array<{ value: string }> }> }) => ({
        day: day.date,
        max: parseInt(day.maxtempC) || 0,
        min: parseInt(day.mintempC) || 0,
        emoji: getEmoji(day.hourly?.[4]?.weatherDesc?.[0]?.value || "Sunny"),
      })),
      updated: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: "Weather unavailable", city: CITY }, { status: 500 });
  }
}
