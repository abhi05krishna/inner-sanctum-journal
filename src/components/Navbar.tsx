import React from 'react';
import { 
  Sparkles, 
  CloudCheck, 
  CloudAlert,
  Loader2,
  Menu,
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  Sun,
  Smile,
  Disc3,
  Layers,
  Building2,
  ShieldCheck,
  Compass
} from 'lucide-react';
import type { AppView, VisualDriverType, MoodType, WeatherData, Organization, OrgMember } from '../types';

interface NavbarProps {
  onToggleDrawer: () => void;
  isDrawerOpen: boolean;
  syncStatus: 'synced' | 'saving' | 'error';
  onRetrySync?: () => void;
  currentView: AppView;
  onNavigateView: (view: AppView) => void;
  activeDateStr?: string | null;
  activeDriver?: VisualDriverType;
  onToggleDriver?: () => void;
  currentMood?: MoodType | null;
  weatherData?: WeatherData | null;
  onOpenSpotifyModal?: () => void;
  onOpenWeeklyReview?: () => void;
  organization?: Organization | null;
  userOrgMember?: OrgMember | null;
  onOpenOrgModal?: () => void;
}

const MOOD_ICONS: Record<string, string> = {
  peaceful: '🌿',
  energized: '⚡',
  thoughtful: '💡',
  anxious: '🌪️',
  motivated: '🎯',
  overwhelmed: '🌊',
  neutral: '⚖️',
};

export const Navbar: React.FC<NavbarProps> = ({
  onToggleDrawer,
  isDrawerOpen,
  syncStatus,
  onRetrySync,
  currentView,
  onNavigateView,
  activeDateStr,
  activeDriver = 'mood',
  onToggleDriver,
  currentMood = 'peaceful',
  weatherData,
  onOpenSpotifyModal,
  onOpenWeeklyReview,
  organization,
  userOrgMember,
  onOpenOrgModal,
}) => {
  const moodEmoji = currentMood ? MOOD_ICONS[currentMood] || '🌿' : '🌿';
  const weatherIcon = weatherData?.icon || '⛅';

  return (
    <header className="sticky top-0 z-30 border-b border-[#E5D8B8]/80 bg-[#FAF3E1]/90 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-3 transition-colors text-[#222222]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 sm:gap-4">
        {/* Left Section: Functional Hamburger Menu, Brand & Navigation */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Functional Hamburger Menu Toggle */}
          <button
            id="btn-hamburger-menu"
            onClick={onToggleDrawer}
            className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
              isDrawerOpen
                ? 'bg-[#FA8112] text-white border-[#FA8112] shadow-2xs'
                : 'bg-[#F5E7C6] text-[#5C5549] border-[#E5D8B8] hover:text-[#222222] hover:bg-[#EBDAB3]'
            }`}
            title={isDrawerOpen ? 'Close Menu (Esc)' : 'Open Account & Security Menu'}
            aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isDrawerOpen}
          >
            {isDrawerOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>

          {/* If inside an active reflection editor or universe, provide quick back to calendar button */}
          {(currentView === 'editor' || currentView === 'universe') && (
            <button
              id="btn-back-to-calendar"
              onClick={() => onNavigateView('calendar')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-serif font-semibold text-[#222222] bg-[#F5E7C6] hover:bg-[#EBDAB3] rounded-xl border border-[#E5D8B8] transition-all shadow-2xs cursor-pointer shrink-0"
              title="Return to Monthly Calendar Overview"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-[#FA8112]" />
              <span className="hidden xs:inline">Calendar</span>
            </button>
          )}

          {/* Logo & Application Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              onClick={() => onNavigateView('calendar')}
              className="flex h-8.5 w-8.5 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#FA8112] text-white shadow-xs hover:bg-[#E0700B] transition-colors shrink-0 cursor-pointer"
              title="Calendar Overview"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 
                  onClick={() => onNavigateView('calendar')}
                  className="text-sm sm:text-base md:text-lg font-serif tracking-tight text-[#111111] font-bold cursor-pointer hover:text-[#FA8112] transition-colors truncate"
                >
                  Inner Sanctum
                </h1>
                <span className="hidden lg:inline-flex items-center rounded-full bg-[#F5E7C6] px-2 py-0.5 text-[10px] font-bold text-[#111111] border border-[#DFCBA0]">
                  {currentView === 'universe'
                    ? 'Reflection Universe'
                    : currentView === 'editor' && activeDateStr
                    ? `${activeDateStr}`
                    : 'Monthly Journal'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#222222] font-semibold hidden xl:block tracking-wide truncate">
                {currentView === 'universe'
                  ? '2D Semantic Embedding Space'
                  : currentView === 'editor' && activeDateStr
                  ? `Reflecting on ${activeDateStr}`
                  : 'Calendar-guided Socratic companion & mindful organizer'}
              </p>
            </div>
          </div>
        </div>

        {/* Center/Right Section: Ambiance Mode Switch UI, Calendar View, Sync & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Ambiance Mode Switcher (Mood vs Weather) - shown exclusively in date-relevant entry page */}
          {currentView === 'editor' && onToggleDriver && (
            <div 
              id="navbar-ambiance-mode-switcher"
              className="flex items-center bg-[#F5E7C6]/90 backdrop-blur-md p-0.5 sm:p-1 rounded-xl border border-[#E5D8B8] shadow-2xs"
              title={`Active visual driver: ${activeDriver === 'mood' ? 'Mood-Driven' : 'Weather-Driven'}. Click to toggle.`}
            >
              <button
                id="btn-nav-mode-mood"
                onClick={() => activeDriver !== 'mood' && onToggleDriver()}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-serif rounded-lg transition-all cursor-pointer ${
                  activeDriver === 'mood'
                    ? 'bg-[#FAF3E1] text-[#222222] shadow-2xs font-bold border border-[#E5D8B8]'
                    : 'text-[#5C5549] hover:text-[#222222] hover:bg-[#FAF3E1]/60'
                }`}
                title="Switch to real-time Mood-driven visual ambiance"
              >
                <span className="text-xs">{moodEmoji}</span>
                <span className="hidden sm:inline capitalize">{currentMood || 'Mood'}</span>
                <span className="sm:hidden font-medium">Mood</span>
              </button>

              <button
                id="btn-nav-mode-weather"
                onClick={() => activeDriver !== 'weather' && onToggleDriver()}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-serif rounded-lg transition-all cursor-pointer ${
                  activeDriver === 'weather'
                    ? 'bg-[#FAF3E1] text-[#FA8112] shadow-2xs font-bold border border-[#E5D8B8]'
                    : 'text-[#5C5549] hover:text-[#222222] hover:bg-[#FAF3E1]/60'
                }`}
                title={weatherData ? `${weatherData.label}, ${weatherData.temperatureC}°C in ${weatherData.city}` : "Switch to live Weather-driven visual ambiance"}
              >
                <span className="text-xs">{weatherIcon}</span>
                <span className="hidden sm:inline">
                  {weatherData ? `${weatherData.label}${weatherData.city ? ` (${weatherData.city.split(',')[0]})` : ''}` : 'Weather'}
                </span>
                <span className="sm:hidden font-medium">Weather</span>
              </button>
            </div>
          )}

          {/* Spotify Mood Music Companion */}
          {onOpenSpotifyModal && (
            <button
              id="btn-nav-spotify"
              onClick={onOpenSpotifyModal}
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium border bg-[#F5E7C6] text-[#222222] border-[#E5D8B8] hover:text-[#1DB954] hover:border-[#1DB954]/50 hover:bg-[#EBDAB3] transition-colors cursor-pointer"
              title="Spotify Mood Music Companion & Agentic Tool Settings"
            >
              <Disc3 className="h-3.5 w-3.5 text-[#1DB954]" />
              <span className="hidden lg:inline font-serif">Music</span>
            </button>
          )}

          {/* Weekly Flashcards Review Button */}
          {onOpenWeeklyReview && (
            <button
              id="btn-nav-weekly-review"
              onClick={onOpenWeeklyReview}
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-serif font-semibold bg-[#F5E7C6] text-[#222222] border border-[#E5D8B8] hover:bg-[#EBDAB3] transition-colors cursor-pointer shadow-2xs"
              title="Open Weekly Review Flashcards"
            >
              <Layers className="h-3.5 w-3.5 text-[#FA8112]" />
              <span className="hidden lg:inline">Weekly Review</span>
            </button>
          )}

          {/* Reflection Universe Dedicated Button */}
          <button
            id="btn-nav-universe"
            onClick={() => onNavigateView(currentView === 'universe' ? 'calendar' : 'universe')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-serif font-semibold border transition-colors cursor-pointer ${
              currentView === 'universe'
                ? 'bg-[#4A5D4E] text-white border-[#4A5D4E] shadow-2xs'
                : 'bg-[#F5E7C6] text-[#222222] border-[#E5D8B8] hover:bg-[#EBDAB3]'
            }`}
            title={currentView === 'universe' ? 'Return to Calendar' : 'Explore Reflection Universe (2D Semantic Map)'}
          >
            <Compass className="h-3.5 w-3.5 text-[#4A5D4E]" />
            <span className="hidden sm:inline">Universe</span>
          </button>

          {/* Calendar View Toggle Button */}
          <button
            id="btn-toggle-calendar-view"
            onClick={() => onNavigateView(currentView === 'calendar' ? 'editor' : 'calendar')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
              currentView === 'calendar'
                ? 'bg-[#FA8112] text-white border-[#FA8112] shadow-2xs'
                : 'bg-[#F5E7C6] text-[#5C5549] border-[#E5D8B8] hover:text-[#222222] hover:bg-[#EBDAB3]'
            }`}
            title={currentView === 'calendar' ? 'Currently viewing Calendar' : 'Switch to Calendar View'}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Calendar View</span>
          </button>

          {/* Organization & Privacy Badge */}
          {organization && onOpenOrgModal && (
            <button
              id="btn-nav-org"
              onClick={onOpenOrgModal}
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium border bg-[#F5E7C6] text-[#222222] border-[#E5D8B8] hover:bg-[#EBDAB3] transition-colors cursor-pointer shadow-2xs"
              title={`${organization.name} (${userOrgMember?.role === 'admin' ? 'Org Admin' : 'Employee Seat'}) - Zero Content Visibility`}
            >
              <Building2 className="h-3.5 w-3.5 text-[#FA8112]" />
              <span className="hidden xl:inline font-serif font-semibold truncate max-w-[120px]">{organization.name}</span>
              <span className="text-[10px] font-mono uppercase bg-[#FA8112]/15 text-[#FA8112] font-bold px-1.5 py-0.2 rounded-md">
                {userOrgMember?.role === 'admin' ? 'Admin' : 'Seat'}
              </span>
            </button>
          )}

          {/* Cloud Sync Status Indicator */}
          <div className="flex items-center">
            {syncStatus === 'synced' && (
              <span 
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium text-[#222222] bg-[#F5E7C6]/90 rounded-full border border-[#E5D8B8]"
                title="All entries saved and synchronized in Cloud Firestore"
              >
                <CloudCheck className="h-3.5 w-3.5 text-[#FA8112]" />
                <span className="hidden sm:inline font-serif">Synced</span>
              </span>
            )}
            {syncStatus === 'saving' && (
              <span 
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium text-[#C45E00] bg-[#FFF0E6] rounded-full border border-[#FDCDB4]"
                title="Saving changes securely to Firestore..."
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FA8112]" />
                <span className="hidden sm:inline font-serif">Saving...</span>
              </span>
            )}
            {syncStatus === 'error' && (
              <button
                id="btn-retry-sync-nav"
                onClick={onRetrySync}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium text-[#9E3636] bg-[#FDF2F2] rounded-full border border-[#F5CACA] hover:bg-[#FCE8E8] transition-colors cursor-pointer"
                title="Click to retry saving to Cloud Firestore"
              >
                <CloudAlert className="h-3.5 w-3.5 text-[#9E3636]" />
                <span className="hidden sm:inline">Sync Failed • Retry</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

