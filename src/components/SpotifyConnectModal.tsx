import React, { useState, useEffect } from 'react';
import { 
  X, 
  Music, 
  CheckCircle2, 
  ExternalLink, 
  LogOut, 
  Sparkles, 
  BarChart3, 
  ShieldCheck, 
  Radio, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import type { SpotifyConnectionStatus } from '../types';

interface SpotifyConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const SpotifyConnectModal: React.FC<SpotifyConnectModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [status, setStatus] = useState<SpotifyConnectionStatus>({
    connected: false,
    hasClientCredentials: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{
    totalToolCalls: number;
    personalLibraryQueries: number;
    publicSearchQueries: number;
    curatedFallbackCount: number;
    lastSuggestedQuery: string | null;
    lastSuggestedMood: string | null;
  } | null>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const [statusRes, statsRes] = await Promise.all([
        fetch('/api/spotify/status', {
          headers: { 'x-user-uid': userId || '' },
        }),
        fetch('/api/spotify/stats'),
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.warn('Error fetching Spotify status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const queryParam = window.location.origin.includes('localhost')
        ? `?redirectUri=${encodeURIComponent(`${window.location.origin}/spotify-callback`)}`
        : '';
      const res = await fetch(`/api/spotify/auth-url${queryParam}`);
      const data = await res.json();

      if (data.authUrl) {
        if (userId) {
          sessionStorage.setItem('spotify_auth_userId', userId);
        }
        if (data.redirectUri) {
          sessionStorage.setItem('spotify_auth_redirectUri', data.redirectUri);
        }
        // Open Spotify auth in popup window
        const width = 500;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          data.authUrl,
          'spotify_auth',
          `width=${width},height=${height},top=${top},left=${left}`
        );

        // Listen for message from popup
        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === 'SPOTIFY_AUTH_SUCCESS') {
            window.removeEventListener('message', handleMessage);
            if (popup) popup.close();
            await fetchStatus();
          }
        };
        window.addEventListener('message', handleMessage);
      }
    } catch (err) {
      console.error('Error starting Spotify connection:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/spotify/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': userId || '',
        },
        body: JSON.stringify({ userId }),
      });
      await fetchStatus();
    } catch (err) {
      console.error('Error disconnecting Spotify:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-[#DCD7C5] bg-[#FDFCF9] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBE7D8] bg-[#F9F7F0]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1DB954] text-white shadow-2xs">
              <Music className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-[#1A1A1A] text-sm sm:text-base">
                Mood Music Companion
              </h3>
              <p className="text-[11px] text-[#7C786A]">
                Gemini Agentic Tool & Spotify Integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#7C786A] hover:bg-[#EBE7D8] hover:text-[#1A1A1A] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Connection Status Card */}
          <div className="rounded-xl border border-[#DCD7C5] bg-white p-4 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#7C786A]">
                  Spotify Connection State
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      status.connected ? 'bg-[#1DB954]' : 'bg-[#DCD7C5]'
                    }`}
                  />
                  <span className="font-serif font-semibold text-[#1A1A1A] text-sm">
                    {status.connected
                      ? `Connected as ${status.spotifyDisplayName || 'Spotify User'}`
                      : 'Not Connected (Public Search & Curated Mode Active)'}
                  </span>
                </div>
                <p className="text-xs text-[#7C786A] mt-1 leading-relaxed">
                  {status.connected
                    ? 'Gemini can prioritize searching your personal playlists and saved library for reflections.'
                    : 'Gemini still autonomously recommends tracks using Spotify Public Search and Curated Fallbacks.'}
                </p>
              </div>

              {status.connected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E2D3] bg-[#F9F7F0] px-3 py-1.5 text-xs font-medium text-[#8A381E] hover:bg-[#FDF0EB] transition-colors cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Disconnect</span>
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1DB954] hover:bg-[#1AA34A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Music className="h-3.5 w-3.5" />}
                  <span>Connect Spotify</span>
                </button>
              )}
            </div>
          </div>

          {/* How Agentic Function Calling Works */}
          <div className="rounded-xl border border-[#DCD7C5] bg-[#F9F7F0] p-4 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-serif font-semibold text-[#4A5D4E]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>How Gemini Native Function Calling Works</span>
            </div>
            <p className="text-[#666255] leading-relaxed">
              1. <strong>Autonomous Decision:</strong> Gemini evaluates the emotional tone of your reflection. It only calls <code className="bg-[#EBE7D8] px-1 py-0.5 rounded text-[11px] font-mono">suggest_music</code> when it senses stress, anxiety, excitement, or deep focus.
            </p>
            <p className="text-[#666255] leading-relaxed">
              2. <strong>Tool Execution:</strong> The backend searches your personal library or Spotify Web catalog, executing the tool and feeding results back to Gemini.
            </p>
            <p className="text-[#666255] leading-relaxed">
              3. <strong>Rate Limiting & Safety:</strong> Music suggestions are throttled to once per conversation session (minimum 2.5 min cooldown) to avoid interruption.
            </p>
          </div>

          {/* Telemetry Metrics */}
          {stats && (
            <div className="rounded-xl border border-[#DCD7C5] bg-white p-4">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#EBE7D8]">
                <div className="flex items-center gap-1.5 text-xs font-serif font-semibold text-[#1A1A1A]">
                  <BarChart3 className="h-3.5 w-3.5 text-[#4A5D4E]" />
                  <span>Agentic Tool Telemetry</span>
                </div>
                <button
                  onClick={fetchStatus}
                  className="text-[11px] text-[#7C786A] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="rounded-lg bg-[#F9F7F0] p-2.5 border border-[#EBE7D8]">
                  <span className="text-[10px] text-[#7C786A] uppercase font-medium">Tool Invocations</span>
                  <p className="text-lg font-serif font-bold text-[#1A1A1A] mt-0.5">{stats.totalToolCalls}</p>
                </div>
                <div className="rounded-lg bg-[#F9F7F0] p-2.5 border border-[#EBE7D8]">
                  <span className="text-[10px] text-[#7C786A] uppercase font-medium">Personal Library</span>
                  <p className="text-lg font-serif font-bold text-[#4A5D4E] mt-0.5">{stats.personalLibraryQueries}</p>
                </div>
                <div className="rounded-lg bg-[#F9F7F0] p-2.5 border border-[#EBE7D8]">
                  <span className="text-[10px] text-[#7C786A] uppercase font-medium">Spotify Search</span>
                  <p className="text-lg font-serif font-bold text-[#1DB954] mt-0.5">{stats.publicSearchQueries}</p>
                </div>
                <div className="rounded-lg bg-[#F9F7F0] p-2.5 border border-[#EBE7D8]">
                  <span className="text-[10px] text-[#7C786A] uppercase font-medium">Curated Ambiance</span>
                  <p className="text-lg font-serif font-bold text-[#666255] mt-0.5">{stats.curatedFallbackCount}</p>
                </div>
              </div>

              {stats.lastSuggestedQuery && (
                <div className="mt-3 text-[11px] text-[#7C786A] bg-[#F9F7F0] p-2 rounded-lg border border-[#EBE7D8]">
                  <span>Last agent query: </span>
                  <strong className="text-[#1A1A1A]">"{stats.lastSuggestedQuery}"</strong>
                  {stats.lastSuggestedMood && (
                    <span className="ml-1 text-[#4A5D4E]">({stats.lastSuggestedMood})</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Privacy & Scope Hygiene */}
          <div className="flex items-center gap-2 text-[11px] text-[#7C786A] px-1">
            <ShieldCheck className="h-4 w-4 text-[#4A5D4E] shrink-0" />
            <span>Read-only scopes requested. Tokens are isolated server-side per user. No playback SDK or browser audio modification.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#EBE7D8] bg-[#F9F7F0] flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#DCD7C5] bg-white px-4 py-1.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#F0ECE1] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
