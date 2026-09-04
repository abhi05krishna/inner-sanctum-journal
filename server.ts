import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

// Load Firebase configuration for server-side native Firestore vector search
let firebaseConfig: any = null;
try {
  const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  }
} catch (err) {
  console.warn('[Server] Could not load firebase-applet-config.json:', err);
}

const app = express();
const PORT = 3000;

// Top-level payload deserialization middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// -------------------------------------------------------------
// Startup Secret Validation (Fail-Fast)
// Validates all required secrets at startup and refuses to boot
// if any secret is missing or empty, naming the exact missing secret.
// -------------------------------------------------------------
export function validateStartupSecrets(): void {
  const REQUIRED_SECRETS = ['GEMINI_API_KEY', 'SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'] as const;
  const missingSecrets: string[] = [];

  for (const secretKey of REQUIRED_SECRETS) {
    const val = process.env[secretKey];
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
      missingSecrets.push(secretKey);
    }
  }

  if (missingSecrets.length > 0) {
    const errorMsg = `[FATAL STARTUP ERROR] Missing or empty required server secret(s): ${missingSecrets.join(
      ', '
    )}. The application refuses to start until these required secrets are configured in the environment.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// -------------------------------------------------------------
// Uniform Input Length Limits & Validation Standards
// -------------------------------------------------------------
export const INPUT_LIMITS = {
  MAX_TITLE_LENGTH: 120,
  MAX_MESSAGE_CONTENT_LENGTH: 4000,
  MAX_TURNS_COUNT: 50,
  MAX_SEARCH_QUERY_LENGTH: 300,
  MAX_EMBED_TEXT_LENGTH: 4000,
  MAX_WEEK_LABEL_LENGTH: 100,
  MAX_CITY_LENGTH: 60,
  MAX_SPOTIFY_CODE_LENGTH: 512,
} as const;

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
];

// Embedding Models Fallback Ladder
const EMBEDDING_MODELS = ['gemini-embedding-2-preview', 'text-embedding-004'];

// -------------------------------------------------------------
// Spotify Music Tool Declarations & Curated Zero-Fail Catalog
// -------------------------------------------------------------
const suggestMusicTool: FunctionDeclaration = {
  name: 'suggest_music',
  description:
    'Suggest a Spotify playlist or track to support the user based on their active emotional state or explicit music request. Only call this when music would meaningfully aid reflection, relaxation, grounding, emotional release, celebration, or motivation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      mood: {
        type: Type.STRING,
        description:
          'The user active emotional state: happy, peaceful, energized, thoughtful, anxious, motivated, overwhelmed, or neutral.',
        enum: ['happy', 'peaceful', 'energized', 'thoughtful', 'anxious', 'motivated', 'overwhelmed', 'neutral'],
      },
      musicQuery: {
        type: Type.STRING,
        description:
          'A short search phrase for Spotify (e.g., "happy acoustic upbeat", "calm instrumental focus", "peaceful piano ambient", "deep grounding meditation", "uplifting energetic beats").',
      },
      reasoning: {
        type: Type.STRING,
        description: 'A brief 1-sentence explanation of why music is being recommended to the user right now.',
      },
    },
    required: ['mood', 'musicQuery', 'reasoning'],
  },
};

const CURATED_SPOTIFY_CATALOG: Record<
  string,
  Array<{ name: string; artistOrOwner: string; spotifyUrl: string; imageUrl: string; type: 'playlist' | 'track' }>
> = {
  happy: [
    {
      name: 'Happy Hits & Good Vibes',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
      type: 'playlist',
    },
    {
      name: 'Feel-Good Indie & Acoustic',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX2sUQwD7tbmL',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
      type: 'playlist',
    },
  ],
  peaceful: [
    {
      name: 'Peaceful Piano',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
      imageUrl: 'https://images.unsplash.com/photo-1520523839898-5071282543e1?w=400&q=80',
      type: 'playlist',
    },
    {
      name: 'Calm Vibes & Serenity',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX1s9knjP51Oa',
      imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&q=80',
      type: 'playlist',
    },
  ],
  energized: [
    {
      name: 'Deep Focus & Flow State',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ',
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
      type: 'playlist',
    },
    {
      name: 'Mood Booster Beats',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX3rxVfibe1L0',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
      type: 'playlist',
    },
  ],
  thoughtful: [
    {
      name: 'Lo-Fi Beats for Thinking',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM',
      imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=80',
      type: 'playlist',
    },
    {
      name: 'Brain Food (Electronic Focus)',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWXLeA8Omikj7',
      imageUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&q=80',
      type: 'playlist',
    },
  ],
  anxious: [
    {
      name: 'Night Rain & Gentle Ambient',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXbcPC6alAhqu',
      imageUrl: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=400&q=80',
      type: 'playlist',
    },
    {
      name: 'Anxiety Relief Soundscapes',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWZqd5JICZI0u',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
      type: 'playlist',
    },
  ],
  motivated: [
    {
      name: 'Motivation & Ambition Drive',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXdURbg19p2eC',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80',
      type: 'playlist',
    },
    {
      name: 'Confidence Boost',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4fpCWaHOned',
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
      type: 'playlist',
    },
  ],
  overwhelmed: [
    {
      name: 'Mindful Breathing & Stillness',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWZqd5JICZI0u',
      imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80',
      type: 'playlist',
    },
    {
      name: 'Ambient Chill & Peace',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY',
      imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
      type: 'playlist',
    },
  ],
  neutral: [
    {
      name: 'Acoustic Concentration',
      artistOrOwner: 'Spotify Curated',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS',
      imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80',
      type: 'playlist',
    },
  ],
};

// Spotify Token Storage (Isolated per user UID)
interface UserSpotifyAuth {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  spotifyDisplayName?: string;
  spotifyUserId?: string;
  updatedAt: string;
}
const userSpotifyTokensMap = new Map<string, UserSpotifyAuth>();

// Telemetry & Usage Monitoring for suggest_music tool calls
const spotifyMusicToolStats = {
  invocationsCount: 0,
  lastInvokedAt: null as string | null,
  invocationsByMood: {} as Record<string, number>,
  invocationsBySource: {
    personal_library: 0,
    spotify_search: 0,
    curated_fallback: 0,
  },
  cacheHits: 0,
  cacheMisses: 0,
  cacheSize: 0,
  history: [] as Array<{
    timestamp: string;
    userId?: string;
    mood: string;
    query: string;
    reasoning: string;
    suggestedName: string;
    source: string;
    cached?: boolean;
  }>,
};

// -------------------------------------------------------------
// Server-Side Public Spotify Search Cache
// TTL: 20 minutes. Keyed by normalized query string.
// THREAT MODEL & PRIVACY ENFORCEMENT:
// ONLY public catalog results (source: 'spotify_search' | 'curated_fallback') are cached.
// Personal library results (source: 'personal_library') are strictly user-isolated and NEVER
// stored in or returned from this shared public cache.
// -------------------------------------------------------------
interface SpotifyPublicCacheEntry {
  result: {
    id: string;
    type: 'track' | 'playlist';
    name: string;
    artistOrOwner: string;
    spotifyUrl: string;
    imageUrl?: string;
    source: 'spotify_search' | 'curated_fallback';
  };
  cachedAt: number;
  expiresAt: number;
}

const SPOTIFY_PUBLIC_SEARCH_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const spotifyPublicSearchCache = new Map<string, SpotifyPublicCacheEntry>();

function normalizeSpotifyQueryKey(mood: string, query: string): string {
  const cleanMood = (mood || 'thoughtful').trim().toLowerCase();
  const cleanQuery = (query || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
  return `${cleanMood}::${cleanQuery}`;
}

function pruneExpiredSpotifyCache(): void {
  const now = Date.now();
  for (const [key, entry] of spotifyPublicSearchCache.entries()) {
    if (entry.expiresAt <= now) {
      spotifyPublicSearchCache.delete(key);
    }
  }
  // Hard cap to prevent memory bloat
  if (spotifyPublicSearchCache.size > 250) {
    const oldestKey = spotifyPublicSearchCache.keys().next().value;
    if (oldestKey) spotifyPublicSearchCache.delete(oldestKey);
  }
  spotifyMusicToolStats.cacheSize = spotifyPublicSearchCache.size;
}

// Cooldown tracking per user session: Maximum once every 2.5 minutes
const userLastMusicSuggestionTime = new Map<string, number>();
const MUSIC_SUGGESTION_COOLDOWN_MS = 2.5 * 60 * 1000;

// Cached Spotify Client Credentials App Token
let spotifyAppToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyAppToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (spotifyAppToken && spotifyAppToken.expiresAt > Date.now() + 60000) {
    return spotifyAppToken.token;
  }

  try {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (res.ok) {
      const data = await res.json();
      spotifyAppToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
      return spotifyAppToken.token;
    }
  } catch (err) {
    console.warn('[Spotify API] Failed to obtain client credentials app token:', err);
  }
  return null;
}

async function getValidUserAccessToken(userId: string): Promise<string | null> {
  const userTokenData = userSpotifyTokensMap.get(userId);
  if (!userTokenData) return null;

  // If token is valid for at least 60 more seconds, reuse proactively
  if (userTokenData.expiresAt > Date.now() + 60000) {
    return userTokenData.accessToken;
  }

  // Token is expired or expiring soon; Proactively attempt token refresh
  if (userTokenData.refreshToken && process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    try {
      const creds = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString(
        'base64'
      );
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(userTokenData.refreshToken)}`,
      });

      if (res.ok) {
        const data = await res.json();
        userTokenData.accessToken = data.access_token;
        userTokenData.expiresAt = Date.now() + data.expires_in * 1000;
        if (data.refresh_token) {
          userTokenData.refreshToken = data.refresh_token;
        }
        userSpotifyTokensMap.set(userId, userTokenData);
        console.log(`[Spotify Auth] Successfully refreshed token for user: ${userId}`);
        return userTokenData.accessToken;
      } else {
        const errText = await res.text();
        console.warn(`[Spotify Auth Audit] Token refresh failed for user ${userId} (${res.status}): ${errText}`);
        // If the token was revoked by the user or expired, purge session cleanly
        if (res.status === 400 || res.status === 401) {
          console.warn(`[Spotify Auth Audit] Refresh token invalid or revoked for user ${userId}. Clearing stale session.`);
          userSpotifyTokensMap.delete(userId);
        }
        return null;
      }
    } catch (err) {
      console.warn(`[Spotify Auth] Network exception while refreshing token for user ${userId}:`, err);
      return null;
    }
  }

  // No refresh token available and access token expired
  if (userTokenData.expiresAt <= Date.now()) {
    userSpotifyTokensMap.delete(userId);
    return null;
  }

  return userTokenData.accessToken;
}

async function executeSpotifyMusicSearch(params: {
  mood: string;
  query: string;
  reasoning: string;
  userId?: string;
}) {
  const { mood, query, reasoning, userId } = params;
  const moodKey = ['happy', 'peaceful', 'energized', 'thoughtful', 'anxious', 'motivated', 'overwhelmed', 'neutral'].includes(
    mood
  )
    ? mood
    : 'thoughtful';

  let resultItem: {
    id: string;
    type: 'track' | 'playlist';
    name: string;
    artistOrOwner: string;
    spotifyUrl: string;
    imageUrl?: string;
    source: 'personal_library' | 'spotify_search' | 'curated_fallback';
  } | null = null;

  // 1. If user has connected their Spotify account, search their personal library first (NEVER cached in public cache)
  if (userId) {
    const userAccessToken = await getValidUserAccessToken(userId);
    if (userAccessToken) {
      try {
        const [playlistsRes, topTracksRes] = await Promise.all([
          fetch('https://api.spotify.com/v1/me/playlists?limit=25', {
            headers: { Authorization: `Bearer ${userAccessToken}` },
          }),
          fetch('https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=medium_term', {
            headers: { Authorization: `Bearer ${userAccessToken}` },
          }),
        ]);

        const qLower = query.toLowerCase();
        const moodLower = moodKey.toLowerCase();

        if (playlistsRes.ok) {
          const pData = await playlistsRes.json();
          if (Array.isArray(pData.items) && pData.items.length > 0) {
            const matchedP = pData.items.find(
              (p: any) =>
                p &&
                p.name &&
                (p.name.toLowerCase().includes(qLower) ||
                  (p.description && p.description.toLowerCase().includes(qLower)) ||
                  p.name.toLowerCase().includes(moodLower))
            );
            if (matchedP) {
              resultItem = {
                id: matchedP.id,
                type: 'playlist',
                name: matchedP.name,
                artistOrOwner: matchedP.owner?.display_name
                  ? `Your Playlist (${matchedP.owner.display_name})`
                  : 'Your Spotify Playlist',
                spotifyUrl:
                  matchedP.external_urls?.spotify || `https://open.spotify.com/playlist/${matchedP.id}`,
                imageUrl: matchedP.images?.[0]?.url,
                source: 'personal_library',
              };
            }
          }
        }

        if (!resultItem && topTracksRes.ok) {
          const tData = await topTracksRes.json();
          if (Array.isArray(tData.items) && tData.items.length > 0) {
            const matchedT =
              tData.items.find(
                (t: any) =>
                  t &&
                  t.name &&
                  (t.name.toLowerCase().includes(qLower) ||
                    t.artists?.some((a: any) => a.name.toLowerCase().includes(qLower)))
              ) || tData.items[0];

            if (matchedT) {
              resultItem = {
                id: matchedT.id,
                type: 'track',
                name: matchedT.name,
                artistOrOwner: matchedT.artists?.map((a: any) => a.name).join(', ') || 'Artist',
                spotifyUrl:
                  matchedT.external_urls?.spotify || `https://open.spotify.com/track/${matchedT.id}`,
                imageUrl: matchedT.album?.images?.[0]?.url,
                source: 'personal_library',
              };
            }
          }
        }
      } catch (err) {
        console.warn('[Spotify API] Personal library search error:', err);
      }
    }
  }

  // 2. Check public search cache for non-personal results
  let wasCachedHit = false;
  const cacheKey = normalizeSpotifyQueryKey(moodKey, query);

  if (!resultItem) {
    pruneExpiredSpotifyCache();
    const cached = spotifyPublicSearchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[Spotify Cache] Reusing cached search result for query: "${cacheKey}"`);
      resultItem = cached.result;
      wasCachedHit = true;
      spotifyMusicToolStats.cacheHits++;
    }
  }

  // 3. If cache miss, query Spotify Public Search API
  if (!resultItem) {
    spotifyMusicToolStats.cacheMisses++;
    const appToken = await getSpotifyAppToken();
    if (appToken) {
      try {
        const cleanQuery = encodeURIComponent(query.slice(0, 100));
        const res = await fetch(
          `https://api.spotify.com/v1/search?q=${cleanQuery}&type=playlist,track&limit=5`,
          {
            headers: { Authorization: `Bearer ${appToken}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const playlist = data.playlists?.items?.find((p: any) => p && p.name && p.external_urls?.spotify);
          if (playlist) {
            resultItem = {
              id: playlist.id,
              type: 'playlist',
              name: playlist.name,
              artistOrOwner: playlist.owner?.display_name
                ? `Curated by ${playlist.owner.display_name}`
                : 'Spotify Playlist',
              spotifyUrl: playlist.external_urls.spotify,
              imageUrl: playlist.images?.[0]?.url,
              source: 'spotify_search',
            };
          } else {
            const track = data.tracks?.items?.find((t: any) => t && t.name && t.external_urls?.spotify);
            if (track) {
              resultItem = {
                id: track.id,
                type: 'track',
                name: track.name,
                artistOrOwner: track.artists?.map((a: any) => a.name).join(', ') || 'Spotify Track',
                spotifyUrl: track.external_urls.spotify,
                imageUrl: track.album?.images?.[0]?.url,
                source: 'spotify_search',
              };
            }
          }
        }
      } catch (err) {
        console.warn('[Spotify API] Public search error:', err);
      }
    }
  }

  // 4. Fallback to curated harmonic catalog
  if (!resultItem) {
    const curatedList = CURATED_SPOTIFY_CATALOG[moodKey] || CURATED_SPOTIFY_CATALOG.thoughtful;
    const picked = curatedList[Math.floor(Math.random() * curatedList.length)];
    resultItem = {
      id: picked.spotifyUrl.split('/').pop() || 'curated-spotify',
      type: picked.type,
      name: picked.name,
      artistOrOwner: picked.artistOrOwner,
      spotifyUrl: picked.spotifyUrl,
      imageUrl: picked.imageUrl,
      source: 'curated_fallback',
    };
  }

  // 5. Store in public query cache (ONLY for non-personal results)
  if (!wasCachedHit && resultItem && resultItem.source !== 'personal_library') {
    spotifyPublicSearchCache.set(cacheKey, {
      result: resultItem as SpotifyPublicCacheEntry['result'],
      cachedAt: Date.now(),
      expiresAt: Date.now() + SPOTIFY_PUBLIC_SEARCH_CACHE_TTL_MS,
    });
    spotifyMusicToolStats.cacheSize = spotifyPublicSearchCache.size;
  }

  // Update telemetry stats
  spotifyMusicToolStats.invocationsCount++;
  spotifyMusicToolStats.lastInvokedAt = new Date().toISOString();
  spotifyMusicToolStats.invocationsByMood[moodKey] = (spotifyMusicToolStats.invocationsByMood[moodKey] || 0) + 1;
  spotifyMusicToolStats.invocationsBySource[resultItem.source]++;
  spotifyMusicToolStats.history.unshift({
    timestamp: new Date().toISOString(),
    userId,
    mood: moodKey,
    query,
    reasoning,
    suggestedName: resultItem.name,
    source: resultItem.source,
    cached: wasCachedHit,
  });
  if (spotifyMusicToolStats.history.length > 50) {
    spotifyMusicToolStats.history.pop();
  }

  return {
    ...resultItem,
    mood: moodKey as any,
    reasoning,
  };
}

// -------------------------------------------------------------
// Rate Limiting & Abuse Prevention Middleware
// Caps API calls per client identifier (x-user-uid / IP)
// -------------------------------------------------------------
interface RateLimitBucket {
  timestamps: number[];
}
const geminiRateLimitMap = new Map<string, RateLimitBucket>();
const spotifyRateLimitMap = new Map<string, RateLimitBucket>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute sliding window
const GEMINI_MAX_REQUESTS_PER_WINDOW = 30; // 30 AI requests per minute unified
const SPOTIFY_MAX_REQUESTS_PER_WINDOW = 15; // 15 Spotify auth/search requests per minute

function createRateLimiter(
  map: Map<string, RateLimitBucket>,
  maxRequests: number,
  categoryName: string
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawUid = req.headers['x-user-uid'] as string;
    const clientKey = (rawUid && rawUid.trim() !== '') ? rawUid.trim() : (req.ip || 'anonymous-client');
    const now = Date.now();

    let bucket = map.get(clientKey);
    if (!bucket) {
      bucket = { timestamps: [] };
      map.set(clientKey, bucket);
    }

    // Purge expired timestamps outside the 1-minute window
    bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

    const remaining = Math.max(0, maxRequests - bucket.timestamps.length);
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());

    if (bucket.timestamps.length >= maxRequests) {
      const oldest = bucket.timestamps[0];
      const retryAfter = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000));
      res.setHeader('Retry-After', retryAfter.toString());
      console.warn(`[RateLimit Audit] User/IP ${clientKey} exceeded ${categoryName} rate limit (${bucket.timestamps.length} calls). Retry in ${retryAfter}s`);
      return res.status(429).json({
        error: `Please slow down: You have made multiple ${categoryName} requests in a short time. Please wait a moment.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      });
    }

    bucket.timestamps.push(now);
    next();
  };
}

const geminiRateLimiter = createRateLimiter(geminiRateLimitMap, GEMINI_MAX_REQUESTS_PER_WINDOW, 'AI');
const spotifyRateLimiter = createRateLimiter(spotifyRateLimitMap, SPOTIFY_MAX_REQUESTS_PER_WINDOW, 'Spotify');

// Apply unified rate limiter to all Gemini API endpoints
app.use('/api/gemini', geminiRateLimiter);
// Apply rate limiter to Spotify auth & search endpoints
app.use('/api/spotify', spotifyRateLimiter);

// Lazy-safe GoogleGenAI client accessor
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Standard Resilient Helper with Fallback Ladder supporting function calling tools
 */
async function generateContentWithFallback(
  promptConfig: {
    systemInstruction?: string;
    contents: Array<{ role?: string; parts: Array<any> } | string>;
    config?: {
      temperature?: number;
      topP?: number;
      maxOutputTokens?: number;
      responseMimeType?: string;
      tools?: any[];
    };
  }
): Promise<{ text: string; modelUsed: string; functionCalls?: any[]; candidateParts?: any[] }> {
  const ai = getGeminiClient();
  let lastError: Error | unknown = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini API] Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: promptConfig.contents as any,
        config: {
          systemInstruction: promptConfig.systemInstruction,
          temperature: promptConfig.config?.temperature ?? 0.7,
          topP: promptConfig.config?.topP ?? 0.95,
          maxOutputTokens: promptConfig.config?.maxOutputTokens ?? 2048,
          responseMimeType: promptConfig.config?.responseMimeType,
          tools: promptConfig.config?.tools,
        },
      });

      const functionCalls = (response as any).functionCalls || [];
      const candidateParts = response.candidates?.[0]?.content?.parts || [];
      const text = response.text || '';

      if (functionCalls.length > 0 || text.trim().length > 0) {
        return {
          text,
          modelUsed: model,
          functionCalls,
          candidateParts,
        };
      }
    } catch (err: any) {
      console.warn(`[Gemini API] Model ${model} failed:`, err?.message || err);
      lastError = err;
      // Recoverable error conditions: sequentially attempt the next model in the fallback chain
      continue;
    }
  }

  throw new Error(
    `All models in fallback chain failed. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Resilient Embedding Helper with Fallback Ladder
 */
async function generateEmbeddingWithFallback(
  text: string
): Promise<{ embedding: number[]; modelUsed: string }> {
  const ai = getGeminiClient();
  let lastError: Error | unknown = null;
  const sanitizedText = (text || '').trim().slice(0, 8000);

  if (!sanitizedText) {
    throw new Error('Cannot generate embedding for empty text.');
  }

  for (const model of EMBEDDING_MODELS) {
    try {
      console.log(`[Gemini Embedding] Attempting embedding with model: ${model}`);
      const response = await ai.models.embedContent({
        model,
        contents: sanitizedText,
      });

      let values: number[] | undefined;
      const resAny = response as any;
      if (Array.isArray(resAny.embeddings) && Array.isArray(resAny.embeddings[0]?.values)) {
        values = resAny.embeddings[0].values;
      } else if (resAny.embedding?.values && Array.isArray(resAny.embedding.values)) {
        values = resAny.embedding.values;
      }

      if (values && values.length > 0) {
        return { embedding: values, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini Embedding] Model ${model} failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw new Error(
    `All embedding models in fallback chain failed. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Top-level vector cosine similarity computation helper
 */
function computeCosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check endpoints (uptime monitoring)
const handleHealthCheck = (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/health', handleHealthCheck);
app.get('/health', handleHealthCheck);

/**
 * Weather Proxy Endpoint (Secure Server-Side Retrieval)
 * Resolves current weather via keyless Open-Meteo API
 */
app.get('/api/weather', async (req, res) => {
  try {
    const lat = typeof req.query.lat === 'string' ? parseFloat(req.query.lat) : 37.7749;
    const lon = typeof req.query.lon === 'string' ? parseFloat(req.query.lon) : -122.4194;
    const rawCity = typeof req.query.city === 'string' ? req.query.city : 'Local Area';
    const city = rawCity.slice(0, INPUT_LIMITS.MAX_CITY_LENGTH);

    // Safe bounds check
    const safeLat = isNaN(lat) || lat < -90 || lat > 90 ? 37.7749 : lat;
    const safeLon = isNaN(lon) || lon < -180 || lon > 180 ? -122.4194 : lon;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${safeLat}&longitude=${safeLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`;

    const weatherResponse = await fetch(weatherUrl, {
      headers: { 'User-Agent': 'GeminiReflectionsApp/1.0' },
      signal: AbortSignal.timeout(4000),
    });

    if (!weatherResponse.ok) {
      throw new Error(`Weather upstream status ${weatherResponse.status}`);
    }

    const data = await weatherResponse.json();
    const current = data.current || {};
    const code = Number(current.weather_code ?? 0);
    const tempC = Math.round(Number(current.temperature_2m ?? 20));
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const isDay = current.is_day !== 0;

    // Map WMO weather codes to ambient themes
    let condition: 'clear' | 'clouds' | 'rain' | 'drizzle' | 'snow' | 'thunderstorm' | 'fog' | 'windy' = 'clear';
    let label = 'Clear Sky';
    let icon = isDay ? '☀️' : '🌙';

    if (code === 0) {
      condition = 'clear';
      label = isDay ? 'Sunny & Clear' : 'Clear Starlit Night';
      icon = isDay ? '☀️' : '🌙';
    } else if (code >= 1 && code <= 3) {
      condition = 'clouds';
      label = code === 1 ? 'Mainly Clear' : code === 2 ? 'Partly Cloudy' : 'Overcast';
      icon = isDay ? '⛅' : '☁️';
    } else if (code === 45 || code === 48) {
      condition = 'fog';
      label = 'Gentle Fog & Mist';
      icon = '🌫️';
    } else if (code >= 51 && code <= 55) {
      condition = 'drizzle';
      label = 'Light Drizzle';
      icon = '🌦️';
    } else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
      condition = 'rain';
      label = code >= 65 ? 'Heavy Rain' : 'Gentle Rain';
      icon = '🌧️';
    } else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
      condition = 'snow';
      label = 'Snow Flurries';
      icon = '❄️';
    } else if (code >= 95 && code <= 99) {
      condition = 'thunderstorm';
      label = 'Thunderstorm';
      icon = '⛈️';
    }

    return res.json({
      success: true,
      condition,
      label,
      icon,
      temperatureC: tempC,
      temperatureF: tempF,
      isDay,
      city,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.warn('[Weather API Proxy] Graceful fallback to default weather:', error?.message || error);
    return res.json({
      success: true,
      condition: 'clear',
      label: 'Peaceful Skies',
      icon: '🌤️',
      temperatureC: 21,
      temperatureF: 70,
      isDay: true,
      city: 'Local Area',
      timestamp: new Date().toISOString(),
      fallback: true,
    });
  }
});

/**
 * Sentiment & Emotional Theme Analysis Endpoint
 * Analyzes journal content in real-time to detect active mood state
 */
app.post('/api/gemini/sentiment', async (req, res) => {
  try {
    const { turns = [], title = '' } = req.body || {};

    if (title && (typeof title !== 'string' || title.length > INPUT_LIMITS.MAX_TITLE_LENGTH)) {
      return res.status(400).json({
        error: `Invalid input: "title" exceeds maximum allowed length of ${INPUT_LIMITS.MAX_TITLE_LENGTH} characters.`,
      });
    }

    if (!Array.isArray(turns) || turns.length === 0) {
      return res.json({
        mood: 'neutral',
        theme: 'Quiet Reflection',
        reason: 'No conversation text provided yet',
        keywords: ['mindful', 'centering'],
        valence: 'neutral',
        modelUsed: 'default',
      });
    }

    if (turns.length > INPUT_LIMITS.MAX_TURNS_COUNT) {
      return res.status(400).json({
        error: `Invalid input: "turns" array exceeds maximum allowed count of ${INPUT_LIMITS.MAX_TURNS_COUNT} items.`,
      });
    }

    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      if (t && typeof t.content === 'string' && t.content.length > INPUT_LIMITS.MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({
          error: `Invalid input: Message turn at index ${i} exceeds maximum allowed length of ${INPUT_LIMITS.MAX_MESSAGE_CONTENT_LENGTH} characters.`,
        });
      }
    }

    const excerpt = turns
      .map((t: any) => `${t.role === 'gemini' ? 'AI' : 'User'}: ${t.content}`)
      .join('\n')
      .slice(0, 2000);

    const systemInstruction = `You are an expert psychological sentiment analyzer and emotional tone classifier for a mindful journaling app.
Analyze the conversation excerpt, placing the heaviest diagnostic weight on the user's latest inputs to detect active emotional shifts.

Classify the user's active emotional state strictly into ONE of the following valid moods:
- "happy": Signs of happiness, joy, cheerfulness, warmth, delight, gratitude, playful celebration, contentment, or lighthearted mood.
- "anxious": Signs of anxiety, worry, tension, nervousness, racing mind, dread, panic, stress about outcomes or time.
- "overwhelmed": Signs of feeling inundated, exhausted, burnout, too many tasks/demands, cognitive overload, inability to cope.
- "peaceful": Signs of calm, tranquility, serenity, acceptance, gratitude, steady breathing, stillness, quiet contentment.
- "energized": Signs of high excitement, passion, enthusiasm, vitality, creative burst, vibrant joy.
- "thoughtful": Signs of introspection, contemplation, curiosity, philosophical pondering, self-discovery, exploring ideas.
- "motivated": Signs of determination, resolve, clarity of goal, ambition, readiness to execute, constructive momentum.
- "neutral": Objective, balanced, baseline logging without heavy emotional valence.

You MUST respond strictly with a valid JSON object matching:
{
  "mood": "happy" | "peaceful" | "energized" | "thoughtful" | "anxious" | "motivated" | "overwhelmed" | "neutral",
  "theme": "2-5 word concise theme name",
  "reason": "1-sentence specific reason highlighting the user's emotional cues",
  "keywords": ["keyword1", "keyword2"],
  "valence": "positive" | "reflective" | "neutral" | "heavy"
}`;

    const prompt = `Analyze this user's journal session for active mood:\n\n${excerpt}`;

    const result = await generateContentWithFallback({
      systemInstruction,
      contents: [{ parts: [{ text: prompt }] }],
      config: { temperature: 0.1, maxOutputTokens: 400, responseMimeType: 'application/json' },
    });

    let cleaned = result.text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(cleaned);
      const validMoods = ['happy', 'peaceful', 'energized', 'thoughtful', 'anxious', 'motivated', 'overwhelmed', 'neutral'];
      const finalMood = validMoods.includes(parsed.mood) ? parsed.mood : 'thoughtful';

      return res.json({
        mood: finalMood,
        theme: parsed.theme || 'Mindful Reflection',
        reason: parsed.reason || `Detected ${finalMood} emotional state`,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [finalMood],
        valence: parsed.valence || 'reflective',
        modelUsed: result.modelUsed,
      });
    } catch {
      return res.json({
        mood: 'thoughtful',
        theme: 'Mindful Reflection',
        reason: 'Reflecting on thoughts and ideas',
        keywords: ['clarity'],
        valence: 'reflective',
        modelUsed: result.modelUsed,
      });
    }
  } catch (error: any) {
    console.error('Error analyzing sentiment:', error);
    return res.json({
      mood: 'neutral',
      theme: 'Quiet Reflection',
      reason: 'Default mindful state',
      keywords: ['mindful'],
      valence: 'neutral',
      modelUsed: 'fallback',
    });
  }
});

/**
 * Multi-Turn Reflection & Real-Time Mood Classification Endpoint
 * Generates AI companion response, classifies conversation mood atomically,
 * and autonomously invokes suggest_music tool via Gemini native function calling.
 */
app.post('/api/gemini/reflect', async (req, res) => {
  try {
    const { mode = 'reflect', turns = [], context = {}, entryId, pastEntries = [] } = req.body || {};

    if (!Array.isArray(turns) || turns.length === 0) {
      return res.status(400).json({
        error: 'Invalid input: "turns" array must not be empty.',
      });
    }

    if (turns.length > INPUT_LIMITS.MAX_TURNS_COUNT) {
      return res.status(400).json({
        error: `Invalid input: "turns" array exceeds maximum allowed count of ${INPUT_LIMITS.MAX_TURNS_COUNT} items.`,
      });
    }

    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      if (t && typeof t.content === 'string' && t.content.length > INPUT_LIMITS.MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({
          error: `Invalid input: Message turn at index ${i} exceeds maximum allowed length of ${INPUT_LIMITS.MAX_MESSAGE_CONTENT_LENGTH} characters.`,
        });
      }
    }

    if (context?.title && (typeof context.title !== 'string' || context.title.length > INPUT_LIMITS.MAX_TITLE_LENGTH)) {
      return res.status(400).json({
        error: `Invalid input: Context title exceeds maximum allowed length of ${INPUT_LIMITS.MAX_TITLE_LENGTH} characters.`,
      });
    }

    const clientKey = (req.headers['x-user-uid'] as string) || req.body.userId || req.ip || 'anonymous-client';
    const authenticatedUserId = (req.headers['x-user-uid'] as string) || req.body.userId || '';

    // Rate-limiting check for music suggestions:
    // Suggest music at most once every 2.5 minutes per user session unless explicitly requested
    const lastMusicTime = userLastMusicSuggestionTime.get(clientKey) || 0;
    const isMusicThrottled = (Date.now() - lastMusicTime) < MUSIC_SUGGESTION_COOLDOWN_MS;

    // Check if user recently had a music suggestion in the current conversation
    const hasRecentMusicSuggestion = turns
      .slice(-3)
      .some((t: any) => t && t.musicSuggestion);

    const allowMusicTool = !isMusicThrottled && !hasRecentMusicSuggestion;

    // -------------------------------------------------------------
    // Semantic RAG Retrieval: Identify top 3-5 relevant past entries
    // -------------------------------------------------------------
    let retrievedPastEntries: Array<{
      id: string;
      date: string;
      title: string;
      mood?: string;
      score: number;
      summarySnippet?: string;
    }> = [];

    const userTurns = turns.filter((t: any) => t && t.role === 'user' && typeof t.content === 'string');
    const latestUserTurn = userTurns[userTurns.length - 1];
    const latestUserText = (latestUserTurn?.content || '').trim();

    // Retrieval triggers only when user input has meaningful substance (>= 10 characters)
    // and skip for brand new / empty reflections
    if (latestUserText.length >= 10 && authenticatedUserId) {
      try {
        const queryEmbeddingResult = await generateEmbeddingWithFallback(latestUserText.slice(0, 500));
        const queryVector = queryEmbeddingResult.embedding;

        // 1. Attempt native Firestore vector search if configured
        let rawCandidates: Array<{ id: string; date: string; score: number; entryData?: any }> | null = null;
        if (firebaseConfig?.projectId) {
          rawCandidates = await executeFirestoreVectorSearch(authenticatedUserId, queryVector);
        }

        // 2. Fallback to candidate entries cosine similarity if native search returns null or empty
        if (!rawCandidates && Array.isArray(pastEntries) && pastEntries.length > 0) {
          rawCandidates = pastEntries.map((pe: any) => {
            let score = 0;
            if (Array.isArray(pe.embedding) && pe.embedding.length > 0) {
              score = computeCosineSimilarity(queryVector, pe.embedding);
            }
            return {
              id: pe.id,
              date: pe.date || pe.id,
              score: Number(score.toFixed(4)),
              entryData: pe,
            };
          });
        }

        if (Array.isArray(rawCandidates)) {
          // Filter out current active entry, filter out soft-deleted entries, and filter by relevance threshold
          const filtered = rawCandidates
            .filter((item) => {
              if (entryId && (item.id === entryId || item.date === entryId)) return false;
              if (item.entryData?.isDeleted === true) return false;
              // Cosine similarity threshold for semantic relevance
              return item.score >= 0.42;
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 3); // Strict limit to top 3 (max 5) entries to control token cost

          retrievedPastEntries = filtered.map((item) => {
            const data = item.entryData || {};
            const title = data.title || 'Past Reflection';
            const mood = data.mood || undefined;
            const summarySnippet =
              data.summary ||
              (data.turns?.[0]?.content ? String(data.turns[0].content).slice(0, 140) : undefined);
            return {
              id: item.id,
              date: item.date,
              title,
              mood,
              score: item.score,
              summarySnippet: summarySnippet ? summarySnippet.slice(0, 140) : undefined,
            };
          });

          if (retrievedPastEntries.length > 0) {
            console.log(
              `[RAG Reflection] Successfully retrieved ${retrievedPastEntries.length} relevant past entries for user ${authenticatedUserId}`
            );
          }
        }
      } catch (ragErr: any) {
        console.warn('[RAG Reflection] Non-blocking retrieval error:', ragErr?.message || ragErr);
      }
    }

    // System instruction combining empathetic companion dialogue with structured mood classification and tool use
    let systemInstruction = `You are a warm, wise, and deeply empathetic AI journaling and reflection companion.
Your mission:
1. Provide a compassionate, insightful response in Markdown (using warm prose, gentle questions, or bullet points).
2. Classify the user's CURRENT active emotional state/mood based on their latest thoughts and language.
3. MUSIC RECOMMENDATION TOOL: You have access to the tool "suggest_music". You should call "suggest_music" AUTONOMOUSLY ONLY when you judge that music would meaningfully support the user's emotional processing (e.g. they are anxious, overwhelmed, seeking focus, celebrating, needing grounding, or asking for music). Do NOT call this tool on every turn—use discernment.

Active Mood Taxonomy (choose STRICTLY one of these exact keys):
- "happy": User expresses happiness, joy, cheerfulness, gratitude for good news, playful celebration, contentment, or lighthearted warmth.
- "anxious": User expresses worry, nervousness, stress, racing thoughts, fear, panic, or uncertainty.
- "overwhelmed": User expresses exhaustion, burnout, feeling buried under responsibilities, cognitive overload, or defeat.
- "peaceful": User expresses calm, relaxation, serenity, gratitude, groundedness, or inner harmony.
- "energized": User expresses excitement, optimism, high energy, enthusiasm, passion, or delight.
- "thoughtful": User expresses introspection, philosophical musing, self-reflection, curiosity, or gentle pondering.
- "motivated": User expresses drive, determination, purpose, action-oriented resolve, or ambition.
- "neutral": User expresses objective logging, factual observations, or balanced baseline state.

Mode focus:`;

    if (mode === 'brainstorm') {
      systemInstruction += ` [BRAINSTORMING] Expand creative possibilities, propose innovative angles, and spark ideas.`;
    } else if (mode === 'deep_inquiry') {
      systemInstruction += ` [DEEP INQUIRY] Ask 2-3 deep, probing questions to uncover root motives and assumptions.`;
    } else if (mode === 'gratitude') {
      systemInstruction += ` [GRATITUDE] Help the user savor small joys and cultivate grounded appreciation.`;
    } else if (mode === 'problem_solving') {
      systemInstruction += ` [PROBLEM SOLVING] Break down complex challenges into clear, actionable steps.`;
    } else if (mode === 'summarize') {
      systemInstruction += ` [SYNTHESIS] Distill key takeaways and recurring themes cleanly.`;
    } else {
      systemInstruction += ` [MINDFUL REFLECTION] Provide deep active listening and empathetic perspective.`;
    }

    if (context.mood) {
      systemInstruction += `\nPrevious Recorded Mood: ${context.mood}.`;
    }
    if (context.title) {
      systemInstruction += `\nSession Title: "${context.title}".`;
    }

    if (retrievedPastEntries.length > 0) {
      const pastEntriesContext = retrievedPastEntries
        .map((pe) => {
          const detail = pe.summarySnippet || pe.title;
          return `- [${pe.date}] Title: "${pe.title}" | Mood: ${pe.mood || 'unspecified'} (Relevance: ${Math.round(pe.score * 100)}%) | Summary: ${detail}`;
        })
        .join('\n');

      systemInstruction += `\n\nRELEVANT PAST REFLECTIONS (RETRIEVED FOR CONTEXT):
The user has previously written about similar themes in their journal:
${pastEntriesContext}

RAG CONTEXT GUIDELINES:
- When genuinely relevant, naturally and empathetically reference these past entries in your response (e.g., "This reminds me of what you shared back on ${retrievedPastEntries[0].date}...", "You navigated something similar when...", or noting how their feelings have shifted over time).
- ONLY reference past entries when they genuinely deepen, connect, or support the current reflection. DO NOT force past references into every response if it feels unnatural.
- Speak with the warm familiarity of a trusted companion who remembers their journey, while honoring their present moment.`;
    }

    systemInstruction += `\n\nWhen replying directly to the user (or after function calling), return a single JSON object with EXACTLY this schema:
{
  "reply": "Your full compassionate companion response formatted in clean Markdown",
  "detectedMood": "happy" | "peaceful" | "energized" | "thoughtful" | "anxious" | "motivated" | "overwhelmed" | "neutral",
  "moodReason": "A concise 1-sentence explanation of the specific words or emotional cues indicating this mood",
  "suggestedPrompts": ["Question 1", "Question 2", "Question 3"]
}`;

    // Format conversational contents for Gemini
    const contents: Array<{ role: string; parts: Array<any> }> = turns.map((turn: { role: string; content: string }) => ({
      role: turn.role === 'gemini' ? 'model' : 'user',
      parts: [{ text: String(turn.content || '') }],
    }));

    // First generation pass with function calling tool enabled if not throttled
    let result = await generateContentWithFallback({
      systemInstruction,
      contents,
      config: {
        temperature: 0.6,
        maxOutputTokens: 2048,
        tools: allowMusicTool ? [{ functionDeclarations: [suggestMusicTool] }] : undefined,
      },
    });

    let musicSuggestion: any = null;

    // Check if Gemini invoked suggest_music tool
    if (Array.isArray(result.functionCalls) && result.functionCalls.length > 0) {
      const musicCall = result.functionCalls.find((fc: any) => fc.name === 'suggest_music');
      if (musicCall && musicCall.args) {
        const { mood = 'thoughtful', musicQuery = 'calm reflection', reasoning = 'Supporting your current reflection' } =
          musicCall.args;

        console.log(`[Spotify Agentic Tool] Executing suggest_music for mood: "${mood}", query: "${musicQuery}"`);

        // Execute server-side search (user library -> public search -> curated catalog)
        musicSuggestion = await executeSpotifyMusicSearch({
          mood: String(mood),
          query: String(musicQuery),
          reasoning: String(reasoning),
          userId: clientKey !== 'anonymous-client' ? clientKey : undefined,
        });

        // Set cooldown timestamp
        userLastMusicSuggestionTime.set(clientKey, Date.now());

        // Perform second-pass generation providing the tool execution response back to Gemini
        const followUpContents = [
          ...contents,
          {
            role: 'model',
            parts: result.candidateParts || [{ functionCall: musicCall }],
          },
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: 'suggest_music',
                  response: {
                    success: true,
                    trackOrPlaylistName: musicSuggestion.name,
                    artistOrOwner: musicSuggestion.artistOrOwner,
                    spotifyUrl: musicSuggestion.spotifyUrl,
                    type: musicSuggestion.type,
                    source: musicSuggestion.source,
                    reasoning: musicSuggestion.reasoning,
                    mood: musicSuggestion.mood,
                  },
                },
              },
            ],
          },
        ];

        try {
          result = await generateContentWithFallback({
            systemInstruction: `${systemInstruction}\nYou just received the music recommendation from Spotify. Integrate a warm mention or context-appropriate invitation to listen if suitable, and provide the final JSON output.`,
            contents: followUpContents,
            config: {
              temperature: 0.6,
              maxOutputTokens: 2048,
            },
          });
        } catch (followUpErr) {
          console.warn('[Gemini API] Follow-up generation after tool call error:', followUpErr);
        }
      }
    }

    let cleaned = (result.text || '').trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }

    let reply = '';
    let detectedMood: 'peaceful' | 'energized' | 'thoughtful' | 'anxious' | 'motivated' | 'overwhelmed' | 'neutral' =
      musicSuggestion?.mood || 'thoughtful';
    let moodReason = musicSuggestion ? `Sentiment aligned with music selection (${musicSuggestion.mood})` : 'Dynamic sentiment evaluation';
    let suggestedPrompts: string[] = [];

    const validMoods = ['peaceful', 'energized', 'thoughtful', 'anxious', 'motivated', 'overwhelmed', 'neutral'];

    try {
      const parsed = JSON.parse(cleaned);
      reply = parsed.reply || '';
      if (validMoods.includes(parsed.detectedMood)) {
        detectedMood = parsed.detectedMood;
      }
      if (parsed.moodReason) {
        moodReason = parsed.reason || parsed.moodReason;
      }
      if (Array.isArray(parsed.suggestedPrompts)) {
        suggestedPrompts = parsed.suggestedPrompts;
      }
    } catch {
      // In case JSON parse failed, extract reply as cleaned text and run heuristic sentiment check
      reply = cleaned;
      const recentUserText = turns
        .filter((t: any) => t.role === 'user')
        .slice(-2)
        .map((t: any) => t.content.toLowerCase())
        .join(' ');

      if (/(anxious|anxiety|nervous|worry|worried|stress|stressed|panic|scared|dread|fear)/i.test(recentUserText)) {
        detectedMood = 'anxious';
        moodReason = 'Detected anxiety and stress from recent words';
      } else if (/(overwhelm|overwhelmed|too much|exhausted|burnout|drowning|can't keep up)/i.test(recentUserText)) {
        detectedMood = 'overwhelmed';
        moodReason = 'Detected feeling overwhelmed and cognitive fatigue';
      } else if (/(excited|energized|pumped|thrilled|passionate|can't wait|happy|joy)/i.test(recentUserText)) {
        detectedMood = 'energized';
        moodReason = 'Detected excitement and vibrant energy';
      } else if (/(calm|peace|serene|grateful|thankful|relaxed|stillness|grounded)/i.test(recentUserText)) {
        detectedMood = 'peaceful';
        moodReason = 'Detected peaceful calm and gratitude';
      } else if (/(motivated|ready|determined|focus|goal|achieve|execute|action)/i.test(recentUserText)) {
        detectedMood = 'motivated';
        moodReason = 'Detected determination and goal focus';
      }
    }

    if (suggestedPrompts.length === 0) {
      if (detectedMood === 'anxious' || detectedMood === 'overwhelmed') {
        suggestedPrompts = [
          'What is one small thing within my control right now?',
          'What would bring 5% more ease to this moment?',
          'Can I take three deep breaths before deciding next steps?',
        ];
      } else if (mode === 'brainstorm') {
        suggestedPrompts = [
          'What is a wild, unconventional alternative?',
          'What are the potential obstacles and workarounds?',
          'Which idea gives me the most energy?',
        ];
      } else {
        suggestedPrompts = [
          'What would it look like if this was easier?',
          'How does this align with my core values?',
          'What is one small step I can take today?',
        ];
      }
    }

    return res.json({
      reply: reply || 'I am here with you. Let us explore this deeper.',
      modelUsed: result.modelUsed,
      suggestedPrompts,
      detectedMood,
      moodReason: moodReason || `Detected ${detectedMood} emotional state`,
      musicSuggestion: musicSuggestion || undefined,
      retrievedPastEntries: retrievedPastEntries.length > 0 ? retrievedPastEntries : undefined,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/reflect:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate AI reflection response.',
    });
  }
});

// -------------------------------------------------------------
// Spotify Integration Endpoints (OAuth, Status, Manual Search, Telemetry)
// -------------------------------------------------------------

/**
 * Spotify OAuth URL Generator
 */
app.get('/api/spotify/auth-url', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = (req.query.redirectUri as string) || `${process.env.APP_URL || 'http://localhost:3000'}/spotify-callback`;

  if (!clientId) {
    return res.json({
      configured: false,
      authUrl: null,
      message: 'Spotify Client ID is not configured. Public search and curated catalog will be used seamlessly.',
    });
  }

  const scopes = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-top-read',
    'user-library-read',
  ].join(' ');

  const state = crypto.randomBytes(16).toString('hex');
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${encodeURIComponent(
    clientId
  )}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&show_dialog=true`;

  return res.json({
    configured: true,
    authUrl,
    state,
  });
});

/**
 * Spotify OAuth Token Exchange & Profile Ingestion
 */
app.post('/api/spotify/exchange-token', async (req, res) => {
  try {
    const { code, redirectUri, userId } = req.body || {};
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!code || typeof code !== 'string' || !redirectUri || !userId) {
      return res.status(400).json({
        error: 'Missing required parameters (code, redirectUri, userId).',
      });
    }

    if (code.length > INPUT_LIMITS.MAX_SPOTIFY_CODE_LENGTH) {
      return res.status(400).json({
        error: `Authorization code exceeds maximum length of ${INPUT_LIMITS.MAX_SPOTIFY_CODE_LENGTH} characters.`,
      });
    }

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        error: 'Spotify credentials are not configured on the server.',
      });
    }

    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}`,
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.warn('[Spotify OAuth] Token exchange failed:', errorText);
      return res.status(400).json({
        error: 'Failed to exchange authorization code with Spotify.',
        details: errorText,
      });
    }

    const tokenData = await tokenRes.json();

    // Fetch user profile from Spotify
    let displayName = 'Spotify User';
    let spotifyUserId = 'spotify-user';
    try {
      const profileRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        displayName = profile.display_name || profile.id || displayName;
        spotifyUserId = profile.id || spotifyUserId;
      }
    } catch (err) {
      console.warn('[Spotify OAuth] Profile fetch error:', err);
    }

    // Save tokens in server-side memory map scoped by userId
    userSpotifyTokensMap.set(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      spotifyDisplayName: displayName,
      spotifyUserId,
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      spotifyDisplayName: displayName,
      spotifyUserId,
      connectedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error exchanging Spotify token:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to complete Spotify authorization.',
    });
  }
});

/**
 * Check Spotify Connection Status
 */
app.get('/api/spotify/status', (req, res) => {
  const userId = (req.headers['x-user-uid'] as string) || (req.query.userId as string);
  const userTokenData = userId ? userSpotifyTokensMap.get(userId) : null;

  return res.json({
    connected: Boolean(userTokenData),
    spotifyDisplayName: userTokenData?.spotifyDisplayName,
    spotifyUserId: userTokenData?.spotifyUserId,
    hasClientCredentials: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
  });
});

/**
 * Disconnect Spotify Account
 */
app.post('/api/spotify/disconnect', (req, res) => {
  const { userId } = req.body || {};
  const effectiveUserId = userId || (req.headers['x-user-uid'] as string);

  if (effectiveUserId && userSpotifyTokensMap.has(effectiveUserId)) {
    userSpotifyTokensMap.delete(effectiveUserId);
  }

  return res.json({ success: true });
});

/**
 * Music Suggestion Tool Telemetry & Usage Monitoring
 */
app.get('/api/spotify/stats', (req, res) => {
  return res.json({
    ...spotifyMusicToolStats,
    cooldownMs: MUSIC_SUGGESTION_COOLDOWN_MS,
    hasClientCredentials: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
  });
});

/**
 * Spotify Refresh Token Endpoint
 */
app.post('/api/spotify/refresh-token', async (req, res) => {
  try {
    const userId = (req.headers['x-user-uid'] as string) || req.body?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Missing required parameter: userId', message: 'Missing required parameter: userId' });
    }
    const token = await getValidUserAccessToken(userId);
    if (!token) {
      return res.status(401).json({ error: 'Failed to refresh Spotify token or no token stored.', message: 'Failed to refresh Spotify token or no token stored.' });
    }
    return res.json({ success: true, connected: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error refreshing Spotify token.', message: err?.message || 'Error refreshing Spotify token.' });
  }
});

/**
 * Spotify Search Proxy Endpoints (GET and POST)
 * Ensures all Spotify API queries are proxied server-side without exposing credentials
 */
app.get('/api/spotify/search', async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : (typeof req.query.query === 'string' ? req.query.query : '');
    const mood = typeof req.query.mood === 'string' ? req.query.mood : 'peaceful';
    const userId = (req.headers['x-user-uid'] as string) || (req.query.userId as string) || undefined;
    const result = await executeSpotifyMusicSearch({
      query,
      mood,
      reasoning: 'User search query',
      userId,
    });
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to search Spotify.', message: err?.message || 'Failed to search Spotify.' });
  }
});

app.post('/api/spotify/search', async (req, res) => {
  try {
    const body = req.body || {};
    const query = typeof body.query === 'string' ? body.query : (typeof body.q === 'string' ? body.q : '');
    const mood = typeof body.mood === 'string' ? body.mood : 'peaceful';
    const userId = (req.headers['x-user-uid'] as string) || body.userId || undefined;
    const result = await executeSpotifyMusicSearch({
      query,
      mood,
      reasoning: body.reasoning || 'User search query',
      userId,
    });
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to search Spotify.', message: err?.message || 'Failed to search Spotify.' });
  }
});

/**
 * Session Summarization & Actionable Takeaways Endpoint
 */
app.post('/api/gemini/summarize', async (req, res) => {
  try {
    const { title = '', mode = 'reflect', turns = [] } = req.body || {};

    if (title && (typeof title !== 'string' || title.length > INPUT_LIMITS.MAX_TITLE_LENGTH)) {
      return res.status(400).json({
        error: `Invalid input: "title" exceeds maximum allowed length of ${INPUT_LIMITS.MAX_TITLE_LENGTH} characters.`,
      });
    }

    if (!Array.isArray(turns) || turns.length === 0) {
      return res.status(400).json({
        error: 'Invalid input: "turns" array must contain conversation entries to summarize.',
      });
    }

    if (turns.length > INPUT_LIMITS.MAX_TURNS_COUNT) {
      return res.status(400).json({
        error: `Invalid input: "turns" array exceeds maximum allowed count of ${INPUT_LIMITS.MAX_TURNS_COUNT} items.`,
      });
    }

    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      if (t && typeof t.content === 'string' && t.content.length > INPUT_LIMITS.MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({
          error: `Invalid input: Message turn at index ${i} exceeds maximum allowed length of ${INPUT_LIMITS.MAX_MESSAGE_CONTENT_LENGTH} characters.`,
        });
      }
    }

    const conversationTranscript = turns
      .map(
        (t: { role: string; content: string }) =>
          `[${t.role === 'gemini' ? 'AI Reflection Companion' : 'User Journal'}]\n${t.content}`
      )
      .join('\n\n');

    const prompt = `Please review this user's journal reflection session and provide an executive synthesis in clean JSON format.

TITLE: "${title || 'Untitled Session'}"
MODE: "${mode}"

CONVERSATION TRANSCRIPT:
${conversationTranscript}

Respond with ONLY valid JSON strictly adhering to this schema:
{
  "titleSummary": "A concise, evocative 4-8 word title capturing the essence",
  "executiveSummary": "A warm, high-level 2-3 sentence overview of what the user explored and concluded",
  "keyTakeaways": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "actionItems": ["Actionable step 1", "Actionable step 2"],
  "emotionalTone": "e.g. Grounded & Focused, Reflective & Hopeful, Resilient"
}`;

    const result = await generateContentWithFallback({
      systemInstruction:
        'You are an expert executive coach and mindfulness synthesizer. Output raw JSON only.',
      contents: [{ parts: [{ text: prompt }] }],
      config: { temperature: 0.3, maxOutputTokens: 1500 },
    });

    let cleanedJson = result.text.trim();
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(cleanedJson);
      return res.json({
        titleSummary: parsed.titleSummary || title || 'Reflection Summary',
        executiveSummary: parsed.executiveSummary || 'Session summarized.',
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        emotionalTone: parsed.emotionalTone || 'Reflective',
        modelUsed: result.modelUsed,
      });
    } catch (parseErr) {
      // Fallback if JSON was loosely formatted
      return res.json({
        titleSummary: title || 'Session Reflection',
        executiveSummary: result.text.slice(0, 300),
        keyTakeaways: ['Deepened clarity on core thoughts', 'Identified primary priorities'],
        actionItems: ['Review notes during next weekly reflection'],
        emotionalTone: 'Reflective',
        modelUsed: result.modelUsed,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini/summarize:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to synthesize journal session.',
    });
  }
});

/**
 * Weekly Reflection Flashcards Synthesis Endpoint
 * Generates 7 daily flashcard summaries + 1 closing emotional arc synthesis
 */
app.post('/api/gemini/weekly-review', async (req, res) => {
  try {
    const { weekLabel = '', days = [] } = req.body || {};

    if (weekLabel && (typeof weekLabel !== 'string' || weekLabel.length > INPUT_LIMITS.MAX_WEEK_LABEL_LENGTH)) {
      return res.status(400).json({
        error: `Invalid input: "weekLabel" exceeds maximum allowed length of ${INPUT_LIMITS.MAX_WEEK_LABEL_LENGTH} characters.`,
      });
    }

    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({
        error: 'Invalid input: "days" array must contain the 7 days of the week.',
      });
    }

    if (days.length > 7) {
      return res.status(400).json({
        error: 'Invalid input: "days" array cannot exceed 7 days.',
      });
    }

    const daysPromptSnippet = days
      .map((d: any, idx: number) => {
        if (!d.hasEntry) {
          return `Day ${idx + 1}: ${d.dayName} (${d.date}) - [NO ENTRY RECORDED]`;
        }
        return `Day ${idx + 1}: ${d.dayName} (${d.date})
Title: "${d.title || 'Untitled'}"
Mood: "${d.mood || 'peaceful'}"
Mode: "${d.mode || 'reflect'}"
Summary: "${d.summary || 'None'}"
Transcript/Content Excerpt: "${(d.contentSnippet || '').slice(0, 800)}"`;
      })
      .join('\n\n---\n\n');

    const prompt = `You are a thoughtful, poetic, and insightful personal reflection coach.
Analyze the user's journal entries for this week (${weekLabel}).

DAILY DATA:
${daysPromptSnippet}

INSTRUCTIONS:
1. For each of the 7 days (in exact chronological order from Day 1 to Day 7):
   - If the day has an entry: Summarize the day's core essence, realization, or victory in a single concise, digestible, evocative phrase or sentence (12-25 words max). Also provide a one-line key insight, the detected emotional mood key ("happy", "peaceful", "energized", "thoughtful", "anxious", "motivated", "overwhelmed", "neutral"), an appropriate emoji, and a gentle follow-up question for deeper reflection.
   - If the day has [NO ENTRY RECORDED]: Return hasEntry=false, a short mindful message (e.g., "No reflection recorded — a quiet day of stillness and unlogged moments"), a gentle mood emoji like "🌱", and a thoughtful invitation prompt.
2. For the 8th CLOSING CARD (Weekly Synthesis):
   - Provide an emotional arc summary (2-3 sentences) tracing how the user's mindset and feelings evolved across the week.
   - List 3-4 key overarching themes/milestones.
   - Write an encouraging, grounded closing message for the week ahead.

Respond ONLY with valid JSON strictly conforming to this schema:
{
  "weekLabel": "${weekLabel}",
  "dailyCards": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "Monday",
      "hasEntry": true,
      "phrase": "Short, digestible summary phrase of the day's reflection",
      "keyInsight": "One concise sentence insight",
      "mood": "motivated",
      "moodEmoji": "🎯",
      "promptQuestion": "A thought-provoking question related to this day"
    }
  ],
  "closingCard": {
    "title": "Weekly Emotional Arc & Synthesis",
    "arcSummary": "2-3 sentence overview of the emotional journey and shifts across the 7 days",
    "keyThemes": ["Theme 1", "Theme 2", "Theme 3"],
    "closingMessage": "Inspiring closing message for carrying clarity into next week"
  }
}`;

    const result = await generateContentWithFallback({
      systemInstruction: 'You are an executive coach and mindful reflection synthesizer. Output raw JSON only.',
      contents: [{ parts: [{ text: prompt }] }],
      config: { temperature: 0.4, maxOutputTokens: 2500 },
    });

    let cleaned = result.text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(cleaned);
      return res.json({
        ...parsed,
        modelUsed: result.modelUsed,
      });
    } catch (parseErr) {
      console.warn('Fallback JSON parsing for weekly review:', parseErr);
      const fallbackCards = days.map((d: any) => ({
        date: d.date,
        dayName: d.dayName,
        hasEntry: d.hasEntry,
        phrase: d.hasEntry
          ? (d.title || d.summary || 'Reflected on daily thoughts and priorities.')
          : 'No reflection recorded for this day.',
        keyInsight: d.hasEntry
          ? 'Captured valuable personal insights.'
          : 'Rest and stillness are equally important parts of your journey.',
        mood: d.mood || 'peaceful',
        moodEmoji: d.mood === 'happy' ? '🌸' : d.mood === 'energized' ? '⚡' : '🌿',
        promptQuestion: d.hasEntry
          ? 'What feeling stood out most today?'
          : 'What was a quiet moment worth remembering?',
      }));

      return res.json({
        weekLabel,
        dailyCards: fallbackCards,
        closingCard: {
          title: 'Weekly Emotional Arc & Synthesis',
          arcSummary: 'Your week demonstrated dedication to mindful self-inquiry and reflection.',
          keyThemes: ['Mindful pauses', 'Personal clarity', 'Ongoing growth'],
          closingMessage: 'Carry this week’s self-awareness forward into the coming days.',
        },
        modelUsed: result.modelUsed,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini/weekly-review:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate weekly reflection review.',
    });
  }
});

/**
 * Semantic Vector Embedding Generation Endpoint
 * Generates embeddings for journal entries and search queries
 */
app.post('/api/gemini/embed', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid input: "text" string is required for vector embedding generation.',
      });
    }

    if (text.length > INPUT_LIMITS.MAX_EMBED_TEXT_LENGTH) {
      return res.status(400).json({
        error: `Invalid input: "text" exceeds maximum allowed length of ${INPUT_LIMITS.MAX_EMBED_TEXT_LENGTH} characters for vector embedding.`,
      });
    }

    const result = await generateEmbeddingWithFallback(text);
    return res.json({
      embedding: result.embedding,
      modelUsed: result.modelUsed,
      dimensions: result.embedding.length,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/embed:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate vector embedding.',
    });
  }
});

/**
 * Native Firestore Vector Search Helper
 * Executes vector search against the authenticated user's isolated subcollection:
 * /users/{userId}/entries
 */
async function executeFirestoreVectorSearch(
  userId: string,
  queryVector: number[]
): Promise<Array<{ id: string; date: string; score: number; hasEmbedding: boolean; isSemanticMatch: boolean }> | null> {
  if (!firebaseConfig || !firebaseConfig.projectId || !userId) {
    return null;
  }

  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const apiKey = firebaseConfig.apiKey;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(
    userId
  )}:runQuery?key=${apiKey}`;

  const requestPayload = {
    structuredQuery: {
      from: [{ collectionId: 'entries' }],
      findNearest: {
        vectorField: { fieldPath: 'embedding' },
        queryVector: {
          values: queryVector.map((v) => ({ doubleValue: v })),
        },
        distanceMeasure: 'COSINE',
        limit: 30,
        distanceResultField: 'vectorDistance',
      },
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Firestore Vector Search] Query returned status ${res.status}:`, errText);
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return null;

    const results: Array<{ 
      id: string; 
      date: string; 
      score: number; 
      hasEmbedding: boolean; 
      isSemanticMatch: boolean;
      entryData?: any;
    }> = [];

    for (const item of data) {
      if (!item.document) continue;
      const doc = item.document;
      const docPath = doc.name || '';
      const docId = docPath.split('/').pop() || '';
      const fields = doc.fields || {};
      const dateKey = fields.date?.stringValue || docId;

      // Extract cosine distance
      let distance = 0;
      if (fields.vectorDistance?.doubleValue !== undefined) {
        distance = fields.vectorDistance.doubleValue;
      } else if (fields.vectorDistance?.integerValue !== undefined) {
        distance = Number(fields.vectorDistance.integerValue);
      }

      // In Firestore, cosine similarity = 1 - cosine distance
      const score = Math.max(0, Math.min(1, Number((1 - distance).toFixed(4))));

      // Skip soft-deleted entries in vector search results
      const isDeleted = fields.isDeleted?.booleanValue === true;
      if (isDeleted) continue;

      const title = fields.title?.stringValue || 'Untitled Reflection';
      const summary = fields.summary?.stringValue;
      const mode = fields.mode?.stringValue || 'reflect';
      const mood = fields.mood?.stringValue;
      const tags = Array.isArray(fields.tags?.arrayValue?.values)
        ? fields.tags.arrayValue.values.map((v: any) => v.stringValue).filter(Boolean)
        : [];
      const turnsCount = Array.isArray(fields.turns?.arrayValue?.values)
        ? fields.turns.arrayValue.values.length
        : 0;
      const createdAt = fields.createdAt?.stringValue || fields.createdAt?.timestampValue || '';
      const updatedAt = fields.updatedAt?.stringValue || fields.updatedAt?.timestampValue || '';

      results.push({
        id: docId,
        date: dateKey,
        score,
        hasEmbedding: true,
        isSemanticMatch: score >= 0.52,
        entryData: {
          id: docId,
          date: dateKey,
          userId,
          title,
          summary,
          mode: mode as any,
          mood: mood as any,
          tags,
          turnsCount,
          turns: [],
          createdAt,
          updatedAt,
          isDeleted: false,
        },
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  } catch (err) {
    console.warn('[Firestore Vector Search] Native query failed, falling back to candidate scoring:', err);
    return null;
  }
}

/**
 * Semantic Similarity Search Endpoint
 * Generates search query embedding and ranks entries using native Firestore vector search
 * (with automatic fallback to candidate cosine similarity ranking)
 */
app.post('/api/gemini/search', async (req, res) => {
  try {
    const { query, entries = [], userId: bodyUserId } = req.body || {};
    const userId = (req.headers['x-user-uid'] as string) || bodyUserId;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid input: "query" string is required for semantic search.',
      });
    }

    if (query.length > INPUT_LIMITS.MAX_SEARCH_QUERY_LENGTH) {
      return res.status(400).json({
        error: `Invalid input: "query" exceeds maximum allowed length of ${INPUT_LIMITS.MAX_SEARCH_QUERY_LENGTH} characters.`,
      });
    }

    // 1. Generate embedding for user query
    const queryEmbeddingResult = await generateEmbeddingWithFallback(query);
    const queryVector = queryEmbeddingResult.embedding;

    // 2. Attempt native Firestore vector search if userId is available
    let results: Array<{ id: string; date: string; score: number; hasEmbedding: boolean; isSemanticMatch: boolean }> | null = null;
    let engineUsed = 'manual_cosine';

    if (userId) {
      const nativeResults = await executeFirestoreVectorSearch(userId, queryVector);
      if (nativeResults && nativeResults.length > 0) {
        results = nativeResults;
        engineUsed = 'firestore_native_vector_search';
        console.log(`[Semantic Search] Native Firestore vector search returned ${results.length} ranked entries for user: ${userId}`);
      }
    }

    // 3. Fallback to candidate entries cosine similarity if native search is not available or returned null
    if (!results) {
      results = (Array.isArray(entries) ? entries : []).map((entry: any) => {
        let score = 0;
        let hasEmbedding = false;

        if (Array.isArray(entry.embedding) && entry.embedding.length > 0) {
          score = computeCosineSimilarity(queryVector, entry.embedding);
          hasEmbedding = true;
        }

        return {
          id: entry.id,
          date: entry.date || entry.id,
          score: Number(score.toFixed(4)),
          hasEmbedding,
          isSemanticMatch: score >= 0.52,
        };
      });

      results.sort((a, b) => b.score - a.score);
    }

    return res.json({
      queryEmbedding: queryVector,
      results,
      engineUsed,
      modelUsed: queryEmbeddingResult.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/search:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to execute semantic search.',
      message: error?.message || 'Failed to execute semantic search.',
    });
  }
});

// -------------------------------------------------------------
// API Fallback & Global Error Handlers
// -------------------------------------------------------------

// Explicit 404 handler for any unmatched API endpoints
app.all('/api/*', (req, res) => {
  return res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.path}`,
    message: `API endpoint not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
});

// Global Express error handler middleware
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Express Global Error Handler]', err);
  if (res.headersSent) {
    return next(err);
  }
  const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  const msg = err?.message || 'An unexpected internal error occurred.';
  return res.status(status).json({
    error: msg,
    message: msg,
    code: err?.code || 'INTERNAL_ERROR',
  });
});

// -------------------------------------------------------------
// Vite Middleware & Static Serving Setup
// -------------------------------------------------------------
async function bootstrapServer() {
  // Fail-fast startup secret validation: Refuses to boot if required secrets are missing or empty
  validateStartupSecrets();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Journal & Reflections App running on http://0.0.0.0:${PORT}`);
  });
}

bootstrapServer().catch((err) => {
  console.error('[Server Bootstrap Error]', err);
  process.exit(1);
});
