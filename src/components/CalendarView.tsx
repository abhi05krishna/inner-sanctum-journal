import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Sparkles, 
  Plus, 
  MessageSquare, 
  Tag, 
  BookMarked,
  Flame,
  Search,
  CheckCircle2,
  Calendar as CalendarIcon,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Clock,
  Layers
} from 'lucide-react';
import type { JournalEntry, ReflectionMode, MoodType, WeatherData, VisualDriverType } from '../types';
import { LandingVideoBackground } from './LandingVideoBackground';
import { extractErrorMessage } from '../utils/errors';

interface CalendarViewProps {
  entries: JournalEntry[];
  userId?: string;
  onSelectDate: (dateStr: string) => void;
  onDeleteEntry?: (dateKey: string) => void;
  activeDriver?: VisualDriverType;
  weatherData?: WeatherData | null;
  detectedMood?: MoodType;
  onToggleDriver?: () => void;
  onOpenWeeklyReview?: () => void;
}

const MODE_COLORS: Record<ReflectionMode, { label: string; bg: string; text: string; border: string }> = {
  reflect: { label: 'Reflection', bg: 'bg-[#F5E7C6]', text: 'text-[#222222]', border: 'border-[#E5D8B8]' },
  brainstorm: { label: 'Brainstorm', bg: 'bg-[#FFF2D6]', text: 'text-[#8A5200]', border: 'border-[#F5D48B]' },
  summarize: { label: 'Synthesis', bg: 'bg-[#FEEDE0]', text: 'text-[#C45E00]', border: 'border-[#F8CBB0]' },
  deep_inquiry: { label: 'Inquiry', bg: 'bg-[#F5E7C6]/70', text: 'text-[#4A3B2A]', border: 'border-[#DEC89B]' },
  gratitude: { label: 'Gratitude', bg: 'bg-[#FFF0E6]', text: 'text-[#FA8112]', border: 'border-[#FDCDB4]' },
  problem_solving: { label: 'Problem Solving', bg: 'bg-[#F5E7C6]', text: 'text-[#222222]', border: 'border-[#E5D8B8]' },
};

const MOOD_EMOJIS: Record<MoodType, string> = {
  happy: '🌸',
  peaceful: '🌿',
  energized: '⚡',
  thoughtful: '💡',
  anxious: '🌪️',
  motivated: '🎯',
  overwhelmed: '🌊',
  neutral: '⚖️',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Format date helper to YYYY-MM-DD in local time
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface ArchiveCardProps {
  entry: any;
  onSelect: (dateKey: string) => void;
  onDelete: (dateKey: string) => void;
}

const ArchiveCard: React.FC<ArchiveCardProps> = ({ entry, onSelect, onDelete }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const dateKey = entry.date || entry.id;
  const modeInfo = MODE_COLORS[entry.mode as ReflectionMode] || MODE_COLORS.reflect;
  const moodEmoji = entry.mood ? MOOD_EMOJIS[entry.mood as MoodType] : null;
  const semanticScore = entry._semanticScore;
  const isSemanticHit = entry._isSemanticHit;

  // Build paginated content pages so long content does not get cut off or overflow
  const pages = useMemo(() => {
    const list: { label: string; text: string }[] = [];

    // Page 1: Synthesis / Summary if present
    if (entry.summary && typeof entry.summary === 'string' && entry.summary.trim()) {
      list.push({ label: 'Summary', text: entry.summary.trim() });
    }

    // Dialogue turns
    if (Array.isArray(entry.turns) && entry.turns.length > 0) {
      entry.turns.forEach((turn: any, tIdx: number) => {
        const role = turn.role === 'user' ? 'Me' : 'Gemini';
        const rawContent = (turn.content || '').trim();
        if (!rawContent) return;

        // If turn is longer than 150 chars, chunk it so it fits comfortably in card display area
        if (rawContent.length > 150) {
          const words = rawContent.split(' ');
          let currentChunk = '';
          const chunks: string[] = [];
          for (const word of words) {
            if ((currentChunk + ' ' + word).trim().length > 130 && currentChunk.length > 0) {
              chunks.push(currentChunk.trim());
              currentChunk = word;
            } else {
              currentChunk = currentChunk ? `${currentChunk} ${word}` : word;
            }
          }
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }

          chunks.forEach((chunk, cIdx) => {
            list.push({
              label: `${role} (${tIdx + 1}.${cIdx + 1})`,
              text: chunk,
            });
          });
        } else {
          list.push({
            label: `${role} (${tIdx + 1})`,
            text: rawContent,
          });
        }
      });
    }

    // Key Takeaways or Action Items
    if (Array.isArray(entry.takeaways) && entry.takeaways.length > 0) {
      list.push({
        label: 'Takeaways',
        text: entry.takeaways.join(' • '),
      });
    }

    if (Array.isArray(entry.actionItems) && entry.actionItems.length > 0) {
      list.push({
        label: 'Action Items',
        text: entry.actionItems.join(' • '),
      });
    }

    if (list.length === 0) {
      list.push({ label: 'Reflection', text: 'No dialogue recorded yet.' });
    }

    return list;
  }, [entry]);

  // Keep page index within bounds if pages change
  const activePage = pages[Math.min(pageIndex, pages.length - 1)] || pages[0];
  const totalPages = pages.length;

  return (
    <div
      id={`archive-entry-${dateKey}`}
      onClick={() => onSelect(dateKey)}
      className={`rounded-xl border bg-[#FAF3E1]/95 hover:border-[#FA8112] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between p-3 group/card ${
        isSemanticHit ? 'border-[#FA8112] bg-[#FFF5E8]' : 'border-[#DFCBA0]'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-serif font-bold text-[#994500]">
            {dateKey}
          </span>
          <div className="flex items-center gap-1">
            {moodEmoji && <span className="text-[11px]">{moodEmoji}</span>}
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold border ${modeInfo.bg} ${modeInfo.text} ${modeInfo.border}`}
            >
              {modeInfo.label}
            </span>
          </div>
        </div>

        <h4 className="text-[11px] font-serif font-bold text-[#111111] line-clamp-1 group-hover/card:text-[#FA8112] transition-colors">
          {entry.title || 'Untitled Reflection'}
        </h4>

        {/* Paginated Excerpt Content Display */}
        <div className="mt-1 min-h-[48px] flex flex-col justify-between">
          <p className="text-[10px] text-[#1A1A1A] font-medium leading-relaxed">
            <span className="text-[9px] font-bold text-[#8A5016] uppercase tracking-wider mr-1">
              [{activePage.label}]
            </span>
            {activePage.text}
          </p>

          {/* In-Card Pagination Controls when content exceeds a single card page */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1 mt-1 border-t border-[#EBDAB3]/70 text-[9px]">
              <span className="font-mono font-bold text-[#7A4B1A]">
                {pageIndex + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id={`btn-prev-page-${dateKey}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPageIndex((p) => Math.max(0, p - 1));
                  }}
                  disabled={pageIndex === 0}
                  className="p-0.5 rounded hover:bg-[#EBDAB3] disabled:opacity-30 disabled:cursor-not-allowed text-[#222222] transition-colors cursor-pointer"
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  id={`btn-next-page-${dateKey}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPageIndex((p) => Math.min(totalPages - 1, p + 1));
                  }}
                  disabled={pageIndex >= totalPages - 1}
                  className="p-0.5 rounded hover:bg-[#EBDAB3] disabled:opacity-30 disabled:cursor-not-allowed text-[#222222] transition-colors cursor-pointer"
                  title="Next page"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 pt-1.5 border-t border-[#DFCBA0] flex items-center justify-between text-[9px] text-[#222222]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#111111]">{entry.turnsCount ?? (entry.turns?.length || 0)} turns</span>
          {isSemanticHit && semanticScore ? (
            <span className="flex items-center gap-0.5 text-[#8A3B00] font-bold bg-[#FFF0E6] px-1.5 py-0.2 rounded border border-[#FDCDB4]">
              <Sparkles className="h-2 w-2 text-[#FA8112]" />
              {Math.round(semanticScore * 100)}% match
            </span>
          ) : entry.summary ? (
            <span className="flex items-center gap-1 text-[#111111] font-bold">
              <Sparkles className="h-2.5 w-2.5 text-[#FA8112]" />
              Synthesized
            </span>
          ) : null}
        </div>

        {/* Delete Button on Archive Card */}
        <button
          id={`btn-delete-archive-${dateKey}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(dateKey);
          }}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-[#4A4235] hover:text-[#9E3636] hover:bg-[#FDF2F2] rounded transition-colors cursor-pointer"
          title="Move reflection to Recently Deleted (15-day recovery)"
        >
          <Trash2 className="h-2.5 w-2.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  entries,
  userId,
  onSelectDate,
  onDeleteEntry,
  activeDriver: propActiveDriver,
  weatherData: propWeatherData,
  detectedMood: propDetectedMood,
  onToggleDriver: propToggleDriver,
  onOpenWeeklyReview,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [semanticScoresMap, setSemanticScoresMap] = useState<Record<string, { score: number; isSemanticMatch: boolean }>>({});
  const [remoteSearchEntries, setRemoteSearchEntries] = useState<Record<string, JournalEntry>>({});
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [searchRateLimitNotice, setSearchRateLimitNotice] = useState<string | null>(null);

  const [visibleArchiveCount, setVisibleArchiveCount] = useState<number>(6);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deletingDateKey, setDeletingDateKey] = useState<string | null>(null);

  // Weather and Mood Ambiance States (with prop overrides)
  const [weatherDataInternal, setWeatherDataInternal] = useState<WeatherData | null>(null);
  const weatherData = propWeatherData !== undefined ? propWeatherData : weatherDataInternal;

  const [detectedMoodInternal, setDetectedMoodInternal] = useState<MoodType>('peaceful');
  const detectedMood = propDetectedMood || detectedMoodInternal;

  const [isClassifyingMood, setIsClassifyingMood] = useState(false);

  // Day of month alternating rule: Odd days = Mood, Even days = Weather
  const dayOfMonth = useMemo(() => new Date().getDate(), []);
  const initialDriver: VisualDriverType = useMemo(() => (dayOfMonth % 2 !== 0 ? 'mood' : 'weather'), [dayOfMonth]);
  const [activeDriverInternal, setActiveDriverInternal] = useState<VisualDriverType>(initialDriver);
  const activeDriver = propActiveDriver || activeDriverInternal;

  const todayStr = useMemo(() => formatDateKey(new Date()), []);

  // Filter out soft-deleted entries for active calendar view
  const activeEntries = useMemo(() => {
    return entries.filter((e) => !e.isDeleted);
  }, [entries]);

  // Frontend Search Debouncing (450ms) to conserve API tokens and prevent runaway usage
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform vector semantic search whenever debounced query has >= 2 characters
  useEffect(() => {
    if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
      setSemanticScoresMap({});
      setRemoteSearchEntries({});
      setIsSearchingSemantic(false);
      setSearchRateLimitNotice(null);
      return;
    }

    let isCancelled = false;

    async function executeSemanticSearch() {
      setIsSearchingSemantic(true);
      setSearchRateLimitNotice(null);

      try {
        const candidatePayload = activeEntries.map((e) => ({
          id: e.id,
          date: e.date || e.id,
          embedding: e.embedding,
        }));

        const res = await fetch('/api/gemini/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-uid': userId || activeEntries[0]?.userId || '',
          },
          body: JSON.stringify({
            query: debouncedSearchQuery,
            entries: candidatePayload,
            userId: userId || activeEntries[0]?.userId || '',
          }),
        });

        if (!res.ok) {
          if (res.status === 429) {
            const errData = await res.json().catch(() => ({}));
            if (!isCancelled) {
              setSearchRateLimitNotice(
                extractErrorMessage(errData, 'Rate limit reached: Gemini API calls are capped. Showing keyword matches.')
              );
            }
          }
          return;
        }

        const data = await res.json();
        if (!isCancelled && Array.isArray(data.results)) {
          const scoreMap: Record<string, { score: number; isSemanticMatch: boolean }> = {};
          const remoteMap: Record<string, JournalEntry> = {};

          data.results.forEach((r: any) => {
            const key = r.date || r.id;
            scoreMap[key] = {
              score: r.score,
              isSemanticMatch: r.isSemanticMatch,
            };
            if (r.entryData) {
              remoteMap[key] = r.entryData;
            }
          });

          setSemanticScoresMap(scoreMap);
          setRemoteSearchEntries(remoteMap);
        }
      } catch (err) {
        console.warn('[Semantic Search] Non-blocking search error:', err);
      } finally {
        if (!isCancelled) {
          setIsSearchingSemantic(false);
        }
      }
    }

    executeSemanticSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearchQuery, activeEntries]);

  const todayReadable = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Map entries by date key for O(1) cell lookups with key normalization
  const entryMap = useMemo(() => {
    const map = new Map<string, JournalEntry>();
    activeEntries.forEach((e) => {
      const key = e.date || e.id;
      if (key) {
        map.set(key, e);
        if (key.includes('T')) map.set(key.split('T')[0], e);
      }
      if (e.date) {
        map.set(e.date, e);
        if (e.date.includes('T')) map.set(e.date.split('T')[0], e);
      }
      if (e.id) {
        map.set(e.id, e);
        if (e.id.includes('T')) map.set(e.id.split('T')[0], e);
      }
    });

    // Also include remote search entries
    Object.values(remoteSearchEntries).forEach((e) => {
      const key = e.date || e.id;
      if (key && !map.has(key)) {
        map.set(key, e);
        if (key.includes('T')) map.set(key.split('T')[0], e);
      }
    });

    return map;
  }, [activeEntries, remoteSearchEntries]);

  const todayEntry = useMemo(() => {
    return entryMap.get(todayStr) || null;
  }, [entryMap, todayStr]);

  // Fetch today's weather securely via server proxy
  useEffect(() => {
    if (propWeatherData !== undefined) return;
    let isMounted = true;
    async function loadWeather() {
      try {
        const res = await fetch('/api/weather');
        if (res.ok) {
          const data: WeatherData = await res.json();
          if (isMounted) setWeatherDataInternal(data);
        }
      } catch (err) {
        console.warn('Weather fetch fallback triggered:', err);
      }
    }
    loadWeather();
    return () => {
      isMounted = false;
    };
  }, [propWeatherData]);

  // Determine today's mood/theme from today's entry or the most recent journal entry
  useEffect(() => {
    if (propDetectedMood !== undefined) return;
    let isMounted = true;

    async function resolveMoodTheme() {
      // 1. If today has a stored mood, use it directly
      if (todayEntry?.mood) {
        if (isMounted) setDetectedMoodInternal(todayEntry.mood);
        return;
      }

      // 2. Otherwise find the most recent journal entry with content
      const sortedEntries = [...entries].sort((a, b) => (b.date || b.id).localeCompare(a.date || a.id));
      const latestWithContent = sortedEntries.find((e) => e.turns && e.turns.length > 0);

      if (latestWithContent) {
        if (latestWithContent.mood) {
          if (isMounted) setDetectedMoodInternal(latestWithContent.mood);
          return;
        }

        // Classify using Gemini API server proxy if not yet stored
        try {
          setIsClassifyingMood(true);
          const response = await fetch('/api/gemini/sentiment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              turns: latestWithContent.turns,
              title: latestWithContent.title,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            if (isMounted && data.mood) {
              setDetectedMoodInternal(data.mood);
            }
          }
        } catch (err) {
          console.warn('Mood classification fallback:', err);
          if (isMounted) setDetectedMoodInternal('thoughtful');
        } finally {
          if (isMounted) setIsClassifyingMood(false);
        }
      } else {
        if (isMounted) setDetectedMoodInternal('peaceful');
      }
    }

    resolveMoodTheme();
    return () => {
      isMounted = false;
    };
  }, [todayEntry, entries, propDetectedMood]);

  // Current viewed month and year
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month Title
  const monthTitle = useMemo(() => {
    return currentDate.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }, [currentDate]);


  // Generate calendar grid cells
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 6 = Sat
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      entry?: JournalEntry;
    }[] = [];

    // Preceding month trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = formatDateKey(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        entry: entryMap.get(dateStr),
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const d = new Date(currentYear, currentMonth, dayNum);
      const dateStr = formatDateKey(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        entry: entryMap.get(dateStr),
      });
    }

    // Following month leading days to complete the 35 or 42 grid
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(currentYear, currentMonth + 1, dayNum);
      const dateStr = formatDateKey(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        entry: entryMap.get(dateStr),
      });
    }

    return days;
  }, [currentYear, currentMonth, entryMap, todayStr]);

  // Reflections written this month
  const thisMonthEntriesCount = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return activeEntries.filter((e) => (e.date || e.id).startsWith(prefix)).length;
  }, [activeEntries, currentYear, currentMonth]);

  // Unique tags for filter
  const allTags = useMemo(() => {
    const set = new Set<string>();
    activeEntries.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [activeEntries]);

  // Filtered and ranked entries for list view with semantic and keyword ranking
  const { displayedArchiveEntries, totalMatchingCount, isSearching } = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase().trim();
    const isSearching = query.length > 0;

    // Combine active local entries and any remote vector search results
    const combinedMap = new Map<string, JournalEntry>();
    activeEntries.forEach((e) => combinedMap.set(e.date || e.id, e));
    if (isSearching) {
      Object.values(remoteSearchEntries).forEach((e) => {
        const key = e.date || e.id;
        if (!combinedMap.has(key) && !e.isDeleted) {
          combinedMap.set(key, e);
        }
      });
    }

    const allCandidates = Array.from(combinedMap.values());

    const scored = allCandidates
      .map((e) => {
        const dateKey = e.date || e.id;
        const semanticInfo = semanticScoresMap[dateKey];
        const semanticScore = semanticInfo?.score || 0;
        const isSemanticHit = semanticInfo?.isSemanticMatch || semanticScore >= 0.52;

        const titleMatch = query ? (e.title || '').toLowerCase().includes(query) : false;
        const summaryMatch = Boolean(query && e.summary && e.summary.toLowerCase().includes(query));
        const turnsMatch = query ? e.turns?.some((t) => t.content?.toLowerCase().includes(query)) : false;
        const tagsMatch = query ? e.tags?.some((t) => t?.toLowerCase().includes(query)) : false;
        const isKeywordHit = query ? titleMatch || summaryMatch || turnsMatch || tagsMatch : true;

        const matchesTag = !selectedTag || e.tags?.includes(selectedTag);

        // Combined relevance score
        let score = semanticScore;
        if (titleMatch) score += 0.35;
        if (summaryMatch) score += 0.25;
        if (turnsMatch) score += 0.15;

        const isMatch = (query ? isSemanticHit || isKeywordHit : true) && matchesTag;

        return {
          entry: e,
          score,
          semanticScore,
          isSemanticHit,
          isMatch,
        };
      })
      .filter((item) => item.isMatch)
      .sort((a, b) => {
        if (isSearching) {
          return b.score - a.score;
        }
        return (b.entry.date || b.entry.id).localeCompare(a.entry.date || a.entry.id);
      })
      .map((item) => ({
        ...item.entry,
        _semanticScore: item.semanticScore,
        _isSemanticHit: item.isSemanticHit,
      }));

    const totalMatchingCount = scored.length;
    // When searching: show all matches without 6 cap.
    // When not searching: cap by visibleArchiveCount (default 6).
    const displayedArchiveEntries = isSearching ? scored : scored.slice(0, visibleArchiveCount);

    return {
      displayedArchiveEntries,
      totalMatchingCount,
      isSearching,
    };
  }, [activeEntries, remoteSearchEntries, debouncedSearchQuery, selectedTag, semanticScoresMap, visibleArchiveCount]);

  // When selecting an entry, sync the calendar month if needed
  const handleSelectAndNavigate = (dateKey: string) => {
    try {
      const [y, m] = dateKey.split('-').map(Number);
      if (y && m) {
        setCurrentDate(new Date(y, m - 1, 1));
      }
    } catch {
      // ignore
    }
    onSelectDate(dateKey);
  };

  return (
    <LandingVideoBackground
      videoSrc="/video/aigen.mp4"
      posterSrc="/images/home_nature_poster.jpg"
      fallbackColor="#FAF3E1"
    >
      <div className="flex-1 flex flex-col h-[calc(100vh-57px)] overflow-y-auto text-[#222222]">
        {/* Main Floating Content Column with Generous Ambient Canvas Margins */}
        <div className="mx-auto max-w-4xl w-full px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-5 flex-1">
          {/* Calendar Header Card - Floating Translucent Glass */}
          <div className="rounded-2xl border border-[#DFCBA0] bg-[#FAF3E1]/95 backdrop-blur-md px-5 py-4 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Month Navigation & Title */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-[#F5E7C6] border border-[#DFCBA0] rounded-xl p-1 shadow-2xs">
                  <button
                    id="btn-calendar-prev-month"
                    onClick={handlePrevMonth}
                    className="p-1.5 text-[#222222] hover:text-[#FA8112] hover:bg-[#FAF3E1] rounded-lg transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    id="btn-calendar-today"
                    onClick={handleToday}
                    className="px-3 py-1 text-xs font-bold text-[#994500] hover:bg-[#FAF3E1] rounded-lg transition-colors font-serif cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    id="btn-calendar-next-month"
                    onClick={handleNextMonth}
                    className="p-1.5 text-[#222222] hover:text-[#FA8112] hover:bg-[#FAF3E1] rounded-lg transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#111111]">
                    {monthTitle}
                  </h2>
                  <p className="text-xs text-[#222222] font-serif font-semibold">
                    {thisMonthEntriesCount} {thisMonthEntriesCount === 1 ? 'reflection' : 'reflections'} recorded this month
                  </p>
                </div>
              </div>

              {/* Weekly Flashcards Review Action */}
              {onOpenWeeklyReview && (
                <button
                  id="btn-open-weekly-review"
                  onClick={onOpenWeeklyReview}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F5E7C6] hover:bg-[#EBDAB3] border border-[#DFCBA0] px-3.5 py-2 text-xs font-serif font-bold text-[#111111] transition-all shadow-2xs hover:shadow-xs cursor-pointer group shrink-0"
                  title="Generate weekly reflection flashcards and synthesis"
                >
                  <Layers className="h-4 w-4 text-[#FA8112] group-hover:scale-110 transition-transform" />
                  <span>Weekly Review</span>
                  <span className="hidden sm:inline-flex items-center rounded-md bg-[#FA8112]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#8A3B00]">
                    7 Cards + Arc
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Dedicated Section: Open Today's Reflection */}
          <section
            id="section-today-reflection"
            aria-label="Today's Reflection"
            className="rounded-2xl border border-[#DFCBA0] bg-[#FAF3E1]/95 backdrop-blur-md p-4 sm:p-5 shadow-md transition-all hover:border-[#FA8112]/60"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FA8112]/20 px-2.5 py-0.5 text-xs font-bold text-[#8A3B00] font-serif">
                    <CalendarIcon className="h-3.5 w-3.5 text-[#B84E00]" />
                    Today's Reflection
                  </span>
                  {todayEntry ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#994500] bg-[#FFF0E6] border border-[#FDCDB4] rounded-full px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Entry In Progress
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#222222] bg-[#F5E7C6] border border-[#DFCBA0] rounded-full px-2 py-0.5">
                      Awaiting Entry
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#111111]">
                    {todayReadable}
                  </h3>
                  <p className="text-xs text-[#1A1A1A] font-medium leading-relaxed line-clamp-1">
                    {todayEntry
                      ? (todayEntry.title || todayEntry.summary || (todayEntry.turns.length > 0 ? todayEntry.turns[0].content : "Continue your daily inquiry and mindfulness journal."))
                      : "Take a mindful pause today. Reflect on your focus, capture gratitude, or explore deep inquiry with Gemini."}
                  </p>
                </div>

                {/* If today has an entry, display interactive metadata badges */}
                {todayEntry && (
                  <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-[#222222]">
                    <span className="flex items-center gap-1 font-bold text-[#111111]">
                      <MessageSquare className="h-3.5 w-3.5 text-[#FA8112]" />
                      {todayEntry.turns.length} {todayEntry.turns.length === 1 ? 'turn' : 'turns'}
                    </span>
                    {todayEntry.mood && (
                      <span className="flex items-center gap-1 font-semibold text-[#111111]">
                        <span>{MOOD_EMOJIS[todayEntry.mood]}</span>
                        <span className="capitalize">{todayEntry.mood}</span>
                      </span>
                    )}
                    {todayEntry.mode && (
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold border ${MODE_COLORS[todayEntry.mode]?.bg} ${MODE_COLORS[todayEntry.mode]?.text} ${MODE_COLORS[todayEntry.mode]?.border}`}>
                        {MODE_COLORS[todayEntry.mode]?.label}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Primary Action Buttons: Open Today's Reflection & Delete Option */}
              <div className="shrink-0 flex items-center gap-2">
                {todayEntry && (
                  <button
                    id="btn-delete-today-reflection"
                    onClick={() => setDeletingDateKey(todayStr)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFCBA0] bg-[#FAF3E1] hover:bg-[#FDF2F2] hover:text-[#9E3636] hover:border-[#F5CACA] px-3.5 py-2.5 text-xs font-serif font-semibold text-[#5C5549] transition-all cursor-pointer shadow-2xs"
                    title="Move today's reflection to Recently Deleted (15-day recovery)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Move to Trash</span>
                  </button>
                )}
                <button
                  id="btn-open-today-reflection"
                  onClick={() => onSelectDate(todayStr)}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#FA8112] hover:bg-[#E0700B] px-5 py-2.5 text-xs sm:text-sm font-serif font-bold text-white shadow-md hover:shadow-lg transition-all group cursor-pointer"
                  title={`Open reflection for ${todayStr}`}
                >
                  <Sparkles className="h-4 w-4 text-white group-hover:rotate-12 transition-transform" />
                  <span>Open Today's Reflection</span>
                  <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </section>

          {/* Calendar Grid Container - Compact & Elevated with Translucent Scrim */}
          <div className="rounded-2xl border border-[#DFCBA0] bg-[#FAF3E1]/95 backdrop-blur-md shadow-md overflow-hidden">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-[#DFCBA0] bg-[#F5E7C6] text-center py-2.5">
              {WEEKDAYS.map((day, idx) => (
                <div
                  key={day}
                  className={`text-[11px] font-serif font-bold tracking-wide ${
                    idx === 0 || idx === 6 ? 'text-[#994500]' : 'text-[#111111]'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid with Compact Heights */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[#DFCBA0]">
              {calendarDays.map((cell) => {
                const hasSavedContent = Boolean(
                  cell.entry &&
                  (
                    (Array.isArray(cell.entry.turns) && cell.entry.turns.length > 0) ||
                    (cell.entry.title && cell.entry.title.trim() !== '' && cell.entry.title !== 'Untitled Reflection' && cell.entry.title !== 'New Reflection') ||
                    Boolean(cell.entry.summary) ||
                    Boolean(cell.entry.moodReason)
                  )
                );
                const hasEntry = !!cell.entry;
                const modeInfo = cell.entry ? MODE_COLORS[cell.entry.mode] || MODE_COLORS.reflect : null;
                const moodEmoji = cell.entry?.mood ? MOOD_EMOJIS[cell.entry.mood] : null;

                // Check for semantic or keyword search match for this day
                const semanticInfo = semanticScoresMap[cell.dateStr];
                const semanticScore = semanticInfo?.score || 0;
                const isSemanticHit = semanticInfo?.isSemanticMatch || semanticScore >= 0.52;

                const q = debouncedSearchQuery.toLowerCase().trim();
                const isKeywordHit =
                  q.length > 0 &&
                  cell.entry &&
                  (cell.entry.title.toLowerCase().includes(q) ||
                    cell.entry.summary?.toLowerCase().includes(q) ||
                    cell.entry.turns.some((t) => t.content.toLowerCase().includes(q)));

                const isSearchMatch = q.length > 0 && (isSemanticHit || isKeywordHit);

                return (
                  <div
                    key={cell.dateStr}
                    id={`calendar-cell-${cell.dateStr}`}
                    onClick={() => onSelectDate(cell.dateStr)}
                    className={`group relative min-h-[58px] sm:min-h-[68px] md:min-h-[74px] p-1.5 sm:p-2 flex flex-col justify-between transition-all cursor-pointer ${
                      !cell.isCurrentMonth
                        ? 'bg-[#F5E7C6]/40 text-[#6B6355]'
                        : hasSavedContent
                        ? 'bg-[#FAF3E1] hover:bg-[#F5E7C6]'
                        : 'bg-[#FFFFFF]/90 hover:bg-[#FAF3E1]'
                    } ${
                      cell.isToday
                        ? 'ring-2 ring-inset ring-[#FA8112] bg-[#FFF5E8]'
                        : ''
                    } ${
                      isSearchMatch
                        ? 'ring-2 ring-inset ring-[#FA8112] bg-[#FFF0E0] shadow-2xs z-10'
                        : ''
                    }`}
                  >
                    {/* Top Cell Bar: Day Number & Today indicator */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`inline-flex items-center justify-center text-[11px] font-serif font-bold h-5 w-5 rounded-full transition-colors ${
                          cell.isToday
                            ? 'bg-[#FA8112] text-white shadow-2xs'
                            : isSearchMatch
                            ? 'bg-[#FA8112] text-white shadow-2xs'
                            : hasSavedContent
                            ? 'text-[#111111]'
                            : cell.isCurrentMonth
                            ? 'text-[#222222]'
                            : 'text-[#8A8373]'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {/* Entry Indicator Dot / Mood & Search Match & Cell Delete */}
                      <div className="flex items-center gap-1">
                        {isSearchMatch && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-bold font-serif bg-[#FA8112] text-white rounded shadow-2xs"
                            title={`Search match${semanticScore ? ` (${Math.round(semanticScore * 100)}% similarity)` : ''}`}
                          >
                            <Sparkles className="h-2 w-2" />
                            <span>Match</span>
                          </span>
                        )}

                        {hasSavedContent && (
                          <>
                            {moodEmoji && (
                              <span className="text-[11px] shrink-0" title={`Mood: ${cell.entry?.mood}`}>
                                {moodEmoji}
                              </span>
                            )}
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-[#FA8112]"
                              title="Reflection entry exists"
                            />
                            {/* Quick delete on cell hover or focus */}
                            <button
                              id={`btn-delete-cell-${cell.dateStr}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingDateKey(cell.dateStr);
                              }}
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 text-[#5C5549] hover:text-[#9E3636] hover:bg-[#FDF2F2] rounded transition-all cursor-pointer"
                              title="Move reflection to Recently Deleted (15-day recovery)"
                              aria-label="Delete reflection"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Middle Content: Entry Snippet or Empty hover prompt */}
                    <div className="my-0.5 flex-1 flex flex-col justify-center">
                      {hasSavedContent && cell.entry ? (
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-serif font-bold text-[#111111] line-clamp-1 leading-tight group-hover:text-[#FA8112] transition-colors">
                            {cell.entry.title || (cell.entry.turns && cell.entry.turns.length > 0 ? cell.entry.turns[0].content : 'Reflection')}
                          </p>
                        </div>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#FA8112] transition-opacity py-0.5">
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-serif font-bold bg-[#F5E7C6] px-1 py-0.2 rounded border border-[#DFCBA0] text-[#111111]">
                            <Plus className="h-2 w-2 text-[#FA8112]" />
                            <span>Reflect</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Meta Bar */}
                    {hasSavedContent && cell.entry && modeInfo ? (
                      <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-[#DFCBA0] text-[8px]">
                        <span
                          className={`inline-flex items-center rounded px-1 py-0.2 font-bold border ${modeInfo.bg} ${modeInfo.text} ${modeInfo.border}`}
                        >
                          {modeInfo.label}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[#222222] font-semibold">
                          <MessageSquare className="h-2 w-2 text-[#FA8112]" />
                          {cell.entry.turns.length}
                        </span>
                      </div>
                    ) : (
                      <div className="h-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Section: Reflections Index & Filter */}
          <div className="rounded-2xl border border-[#DFCBA0] bg-[#FAF3E1]/95 backdrop-blur-md p-4 sm:p-5 space-y-3.5 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DFCBA0] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-serif font-bold text-[#111111]">
                    Monthly Archive & Search
                  </h3>
                  {isSearchingSemantic && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-[#8A3B00] bg-[#FFF0E6] border border-[#FDCDB4] rounded-full animate-pulse">
                      <Sparkles className="h-2.5 w-2.5 text-[#FA8112]" />
                      Semantic search...
                    </span>
                  )}
                  {debouncedSearchQuery && !isSearchingSemantic && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-[#111111] bg-[#F5E7C6] border border-[#DFCBA0] rounded-full">
                      <Sparkles className="h-2.5 w-2.5 text-[#FA8112]" />
                      AI Embeddings & Keywords
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#1A1A1A] font-medium leading-relaxed">
                  Quickly locate reflections, synthesized takeaways, or search conceptually using semantic embeddings.
                </p>
              </div>

              {/* Search Input */}
              <div className="relative max-w-xs w-full">
                <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-[#4A4235]" />
                <input
                  id="input-calendar-search"
                  type="text"
                  maxLength={300}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search semantically (e.g. creative ideas, calm mornings)..."
                  className="w-full rounded-lg border border-[#DFCBA0] bg-[#FFFFFF] pl-8 pr-3 py-1.5 text-xs text-[#111111] placeholder-[#4A4235] font-medium focus:border-[#FA8112] focus:ring-1 focus:ring-[#FA8112] focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Rate limit / Error Notice Banner */}
            {searchRateLimitNotice && (
              <div className="rounded-xl bg-[#FFF9E6] border border-[#F0E0A6] p-2.5 text-xs text-[#7A5B0B] font-bold flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-[#B8860B] shrink-0" />
                <span>{searchRateLimitNotice}</span>
              </div>
            )}

            {/* Tag filters */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#111111] mr-1">Filter by tag:</span>
                {allTags.map((tag) => {
                  const isActive = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(isActive ? null : tag)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#FA8112] text-white border-[#FA8112]'
                          : 'bg-[#F5E7C6] text-[#111111] border-[#DFCBA0] hover:bg-[#EBDAB3]'
                      }`}
                    >
                      <Tag className="h-2.5 w-2.5 text-[#FA8112]" />
                      <span>#{tag}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* List of matching reflections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {displayedArchiveEntries.length === 0 ? (
                <div className="col-span-full py-6 text-center text-[#1A1A1A] text-xs font-semibold">
                  No matching reflections found. Try searching for other concepts or click any calendar date to write.
                </div>
              ) : (
                displayedArchiveEntries.map((entry: any) => {
                  const dateKey = entry.date || entry.id;
                  return (
                    <ArchiveCard
                      key={dateKey}
                      entry={entry}
                      onSelect={handleSelectAndNavigate}
                      onDelete={(key) => setDeletingDateKey(key)}
                    />
                  );
                })
              )}
            </div>

            {/* Pagination / Expand Controls for Default View */}
            {!isSearching && totalMatchingCount > 6 && (
              <div className="pt-2 border-t border-[#E5D8B8]/70 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="text-xs text-[#5C5549] font-serif">
                  Showing <span className="font-semibold text-[#222222]">{displayedArchiveEntries.length}</span> of{' '}
                  <span className="font-semibold text-[#222222]">{totalMatchingCount}</span> reflections (newest first)
                </div>

                <div className="flex items-center gap-2">
                  {visibleArchiveCount < totalMatchingCount && (
                    <>
                      <button
                        id="btn-archive-show-more"
                        onClick={() => setVisibleArchiveCount((prev) => Math.min(prev + 6, totalMatchingCount))}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#222222] bg-[#FAF3E1] hover:bg-[#F5E7C6] border border-[#E5D8B8] transition-all shadow-2xs cursor-pointer"
                      >
                        <ChevronDown className="h-3.5 w-3.5 text-[#FA8112]" />
                        <span>Show more ({Math.min(6, totalMatchingCount - visibleArchiveCount)})</span>
                      </button>

                      <button
                        id="btn-archive-view-all"
                        onClick={() => setVisibleArchiveCount(totalMatchingCount)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#222222] bg-[#F5E7C6] hover:bg-[#EBDAB3] border border-[#E5D8B8] transition-all shadow-2xs cursor-pointer"
                      >
                        <span>View all ({totalMatchingCount})</span>
                      </button>
                    </>
                  )}

                  {visibleArchiveCount >= totalMatchingCount && (
                    <button
                      id="btn-archive-show-less"
                      onClick={() => setVisibleArchiveCount(6)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5C5549] bg-[#FAF3E1] hover:bg-[#F5E7C6] border border-[#E5D8B8] transition-all shadow-2xs cursor-pointer"
                    >
                      <ChevronUp className="h-3.5 w-3.5 text-[#FA8112]" />
                      <span>Show less (default 6)</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Active search results counter */}
            {isSearching && (
              <div className="pt-2 border-t border-[#E5D8B8]/70 flex items-center justify-between text-xs text-[#5C5549] font-serif">
                <div>
                  Found <span className="font-semibold text-[#FA8112]">{totalMatchingCount}</span>{' '}
                  {totalMatchingCount === 1 ? 'reflection' : 'reflections'} matching "{debouncedSearchQuery}" across your history
                </div>
                {totalMatchingCount > 0 && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[#FA8112] hover:underline font-semibold cursor-pointer"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Soft Delete Confirmation Modal */}
      {deletingDateKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#E5D8B8] bg-[#FAF3E1] p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF2F2] text-[#9E3636] border border-[#F5CACA] shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-bold text-[#222222]">
                  Move Reflection to Trash?
                </h3>
                <p className="text-xs text-[#5C5549] font-serif">
                  Date: <span className="font-semibold text-[#222222]">{deletingDateKey}</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#F5E7C6]/60 border border-[#E5D8B8] p-3 text-xs text-[#5C5549] leading-relaxed flex items-start gap-2 font-serif">
              <Clock className="h-4 w-4 text-[#FA8112] shrink-0 mt-0.5" />
              <span>
                This reflection will be moved to <strong className="text-[#222222]">Recently Deleted</strong>. You can retrieve it anytime within <strong className="text-[#222222]">15 days</strong> from the side menu.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5D8B8]">
              <button
                id="btn-cancel-delete"
                onClick={() => setDeletingDateKey(null)}
                className="px-3 py-1.5 rounded-lg bg-[#F5E7C6] text-xs font-semibold text-[#5C5549] hover:bg-[#EBDAB3] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-soft-delete"
                onClick={() => {
                  if (onDeleteEntry && deletingDateKey) {
                    onDeleteEntry(deletingDateKey);
                  }
                  setDeletingDateKey(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#9E3636] text-xs font-semibold text-[#FFFFFF] hover:bg-[#852828] transition-colors cursor-pointer shadow-2xs"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </LandingVideoBackground>
  );
};
