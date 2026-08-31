import { weather } from "@/data/mock";

export interface WeatherAdapter { getCurrentWeather: (latitude: number, longitude: number) => Promise<typeof weather>; }
const demoWeather: WeatherAdapter = { getCurrentWeather: async () => weather };
export const weatherService: WeatherAdapter = {
  async getCurrentWeather(latitude, longitude) {
    try {
      if (!navigator.onLine) return demoWeather.getCurrentWeather(latitude, longitude);
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m`, { signal: AbortSignal.timeout(2200) });
      if (!response.ok) throw new Error("weather unavailable");
      const current = (await response.json()).current;
      return { location: "Detected area (approx.)", temperature: `${Math.round(current.temperature_2m)}°C`, humidity: `${current.relative_humidity_2m}%`, rain: `${current.precipitation} mm`, wind: `${Math.round(current.wind_speed_10m)} km/h`, source: "Live weather", updated: "Just now" };
    } catch { return demoWeather.getCurrentWeather(latitude, longitude); }
  },
};
export const requestLocation = (): Promise<{ latitude: number; longitude: number; label: string }> => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error("unsupported"));
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, label: "Detected area (approx.)" }),
    (error) => reject(new Error(error.code === 1 ? "denied" : error.code === 2 ? "unavailable" : "timeout")),
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
  );
});
export const demoLocation = { latitude: 20.4625, longitude: 85.883, label: "Cuttack district · demo location" };
export const analyzeCropScan = async (crop: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return crop === "Rice" ? { condition: "Rice bacterial leaf blight", confidence: 0.84, severity: "moderate" as const } : { condition: "Early visual signal — expert review advised", confidence: 0.68, severity: "low" as const };
};