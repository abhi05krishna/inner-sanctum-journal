import type { WeatherData } from '../types';

const COORDS_STORAGE_KEY = 'inner_sanctum_geo_coords';

interface CachedCoords {
  lat: number;
  lon: number;
  timestamp: number;
}

/**
 * Resolves browser timezone safely
 */
export function getClientTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Gets cached GPS coordinates if valid (valid for 30 minutes)
 */
function getCachedCoords(): { lat: number; lon: number } | null {
  try {
    const raw = sessionStorage.getItem(COORDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: CachedCoords = JSON.parse(raw);
    // Cache valid for 30 minutes
    if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
      return { lat: parsed.lat, lon: parsed.lon };
    }
  } catch {
    // Ignore storage issues
  }
  return null;
}

/**
 * Stores GPS coordinates in sessionStorage
 */
function setCachedCoords(lat: number, lon: number): void {
  try {
    const item: CachedCoords = { lat, lon, timestamp: Date.now() };
    sessionStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify(item));
  } catch {
    // Ignore storage issues
  }
}

/**
 * Requests client GPS position via navigator.geolocation.
 * Falls back gracefully to null if denied, unsupported, or timed out.
 */
export async function getClientCoordinates(): Promise<{ lat: number; lon: number } | null> {
  const cached = getCachedCoords();
  if (cached) return cached;

  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return null;
  }

  return new Promise<{ lat: number; lon: number } | null>((resolve) => {
    // 5-second timeout ensures UI never hangs if user delays or ignores permission dialog
    const timeoutId = setTimeout(() => {
      resolve(null);
    }, 5000);

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeoutId);
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCachedCoords(lat, lon);
          resolve({ lat, lon });
        },
        (error) => {
          clearTimeout(timeoutId);
          if (error.code !== error.PERMISSION_DENIED) {
            console.info('[LocationService] Geolocation unavailable, using timezone fallback:', error.message);
          }
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 4500,
          maximumAge: 10 * 60 * 1000, // 10 minutes cache
        }
      );
    } catch {
      clearTimeout(timeoutId);
      resolve(null);
    }
  });
}

/**
 * Fetches current weather from backend /api/weather with coordinates and/or timezone
 */
export async function fetchCurrentWeather(): Promise<WeatherData | null> {
  try {
    const tz = getClientTimezone();
    const coords = await getClientCoordinates();

    const params = new URLSearchParams();
    params.set('tz', tz);
    if (coords) {
      params.set('lat', coords.lat.toFixed(4));
      params.set('lon', coords.lon.toFixed(4));
    }

    const res = await fetch(`/api/weather?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Weather API returned status ${res.status}`);
    }

    const data: WeatherData = await res.json();
    return data;
  } catch (err) {
    console.warn('[WeatherService] Error fetching weather:', err);
    return null;
  }
}
