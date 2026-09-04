import React, { useState } from 'react';
import { ExternalLink, Music, Copy, Check, Sparkles, Disc3 } from 'lucide-react';
import type { MusicSuggestion } from '../types';

interface SpotifyMusicCardProps {
  suggestion: MusicSuggestion;
}

const MOOD_THEMES: Record<string, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  peaceful: { label: 'Peaceful', emoji: '🌿', bg: 'bg-[#EBF1ED]', text: 'text-[#2D4A3E]', border: 'border-[#CAD8CE]' },
  energized: { label: 'Energized', emoji: '⚡', bg: 'bg-[#FEF5E7]', text: 'text-[#8A5B15]', border: 'border-[#F6DCB6]' },
  thoughtful: { label: 'Thoughtful', emoji: '💡', bg: 'bg-[#EFF3F6]', text: 'text-[#2C485E]', border: 'border-[#D0DFE9]' },
  anxious: { label: 'Calming Relief', emoji: '🌪️', bg: 'bg-[#F2EDF3]', text: 'text-[#583960]', border: 'border-[#D9CCD9]' },
  motivated: { label: 'Motivated', emoji: '🎯', bg: 'bg-[#FDF0EB]', text: 'text-[#8A381E]', border: 'border-[#F5CBBC]' },
  overwhelmed: { label: 'Grounding Breath', emoji: '🌊', bg: 'bg-[#EBF3F5]', text: 'text-[#25505C]', border: 'border-[#C2DFE6]' },
  neutral: { label: 'Mindful Baseline', emoji: '⚖️', bg: 'bg-[#F0ECE1]', text: 'text-[#4A5D4E]', border: 'border-[#DCD7C5]' },
};

function getSafeSpotifyUrl(rawUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const parsed = new URL(rawUrl);
    if (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      (parsed.hostname === 'open.spotify.com' ||
        parsed.hostname.endsWith('.spotify.com') ||
        parsed.hostname === 'spotify.com' ||
        parsed.hostname === 'spotify.link')
    ) {
      return parsed.href;
    }
  } catch {
    // invalid URL format
  }
  return null;
}

export const SpotifyMusicCard: React.FC<SpotifyMusicCardProps> = ({ suggestion }) => {
  const [copied, setCopied] = useState(false);

  const moodTheme = MOOD_THEMES[suggestion.mood] || MOOD_THEMES.thoughtful;
  const safeSpotifyUrl = getSafeSpotifyUrl(suggestion.spotifyUrl);

  const handleCopyLink = () => {
    if (safeSpotifyUrl) {
      navigator.clipboard.writeText(safeSpotifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSourceLabel = () => {
    switch (suggestion.source) {
      case 'personal_library':
        return 'From Your Spotify Library';
      case 'spotify_search':
        return 'Spotify Web Search';
      case 'curated_fallback':
      default:
        return 'Curated Ambiance';
    }
  };

  return (
    <div className="mt-3.5 rounded-xl border border-[#DCD7C5] bg-[#FDFCF9] p-3.5 shadow-xs transition-all hover:shadow-sm">
      {/* Header Tag */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-[#EBE7D8] text-[11px]">
        <div className="flex items-center gap-1.5 font-serif font-medium text-[#1DB954]">
          <Disc3 className="h-3.5 w-3.5 animate-spin-slow text-[#1DB954]" />
          <span>Spotify Music Suggestion</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${moodTheme.bg} ${moodTheme.text} ${moodTheme.border}`}
          >
            <span>{moodTheme.emoji}</span>
            <span>{moodTheme.label}</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] text-[#7C786A] bg-[#F0ECE1] px-1.5 py-0.5 rounded">
            {getSourceLabel()}
          </span>
        </div>
      </div>

      {/* Main Track / Playlist Info */}
      <div className="flex items-center gap-3">
        {/* Cover Artwork */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#DCD7C5] bg-[#EBE7D8] shadow-2xs">
          {suggestion.imageUrl ? (
            <img
              src={suggestion.imageUrl}
              alt={suggestion.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#7C786A]">
              <Music className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* Text Metadata */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs sm:text-sm font-semibold font-serif text-[#1A1A1A]">
            {suggestion.name}
          </p>
          <p className="truncate text-xs text-[#7C786A] mt-0.5">
            {suggestion.artistOrOwner}
          </p>
          {suggestion.reasoning && (
            <p className="text-[11px] text-[#555246] mt-1 line-clamp-2 italic font-serif flex items-start gap-1">
              <Sparkles className="h-2.5 w-2.5 text-[#4A5D4E] shrink-0 mt-0.5" />
              <span>{suggestion.reasoning}</span>
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-[#EBE7D8]/70">
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1 rounded-lg border border-[#DCD7C5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#555246] hover:bg-[#F0ECE1] hover:text-[#1A1A1A] transition-colors cursor-pointer"
          title="Copy Spotify Link"
        >
          {copied ? <Check className="h-3 w-3 text-[#1DB954]" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy Link'}</span>
        </button>

        {safeSpotifyUrl && (
          <a
            href={safeSpotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1DB954] hover:bg-[#1AA34A] px-3 py-1 text-[11px] font-semibold text-white shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Open on Spotify</span>
          </a>
        )}
      </div>
    </div>
  );
};
