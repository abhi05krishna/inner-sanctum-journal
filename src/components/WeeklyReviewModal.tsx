import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Calendar as CalendarIcon, 
  BookOpen, 
  CheckCircle2, 
  Flame, 
  Award,
  Layers,
  ArrowRight,
  RefreshCw,
  Share2,
  Check
} from 'lucide-react';
import type { JournalEntry, MoodType, WeeklyReviewResponse, WeeklyDailyCard } from '../types';
import { formatDateKey } from './CalendarView';
import { extractErrorMessage } from '../utils/errors';

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onOpenDate: (dateStr: string) => void;
  currentUserId?: string;
}

// Get the Monday-to-Sunday 7-day range for a given reference date
function getWeekDays(referenceDate: Date): Array<{ date: string; dayName: string; dateObj: Date }> {
  const d = new Date(referenceDate);
  // Normalize day of week (0 is Sunday, 1 is Monday... 6 is Saturday)
  const day = d.getDay();
  // Calculate distance to Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const days: Array<{ date: string; dayName: string; dateObj: Date }> = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    days.push({
      date: formatDateKey(current),
      dayName: dayNames[i],
      dateObj: current,
    });
  }

  return days;
}

function formatWeekRangeLabel(days: Array<{ dateObj: Date }>): string {
  if (days.length === 0) return '';
  const first = days[0].dateObj;
  const last = days[6].dateObj;

  const startMonth = first.toLocaleString('default', { month: 'short' });
  const startDay = first.getDate();
  const endMonth = last.toLocaleString('default', { month: 'short' });
  const endDay = last.getDate();
  const year = last.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

const MOOD_EMOJIS: Record<MoodType, string> = {
  happy: '🌸',
  peaceful: '🌿',
  energized: '⚡',
  thoughtful: '✨',
  anxious: '🌧️',
  motivated: '🎯',
  overwhelmed: '🌊',
  neutral: '🌱',
};

const MOOD_COLORS: Record<MoodType, { bg: string; text: string; border: string }> = {
  happy: { bg: 'bg-[#FF7E7E]/15', text: 'text-[#E05353]', border: 'border-[#FF7E7E]/40' },
  peaceful: { bg: 'bg-[#5B8C67]/15', text: 'text-[#3E6B4A]', border: 'border-[#5B8C67]/30' },
  energized: { bg: 'bg-[#E5A93C]/15', text: 'text-[#B87B14]', border: 'border-[#E5A93C]/30' },
  thoughtful: { bg: 'bg-[#6B7A99]/15', text: 'text-[#475573]', border: 'border-[#6B7A99]/30' },
  anxious: { bg: 'bg-[#C26D6D]/15', text: 'text-[#9A4242]', border: 'border-[#C26D6D]/30' },
  motivated: { bg: 'bg-[#D97706]/15', text: 'text-[#B45309]', border: 'border-[#D97706]/30' },
  overwhelmed: { bg: 'bg-[#7C6A96]/15', text: 'text-[#584672]', border: 'border-[#7C6A96]/30' },
  neutral: { bg: 'bg-[#8C8275]/15', text: 'text-[#5C5449]', border: 'border-[#8C8275]/30' },
};

export const WeeklyReviewModal: React.FC<WeeklyReviewModalProps> = ({
  isOpen,
  onClose,
  entries,
  onOpenDate,
  currentUserId,
}) => {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week
  const [cardIndex, setCardIndex] = useState(0); // 0 to 7 (0-6: days, 7: synthesis)
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<WeeklyReviewResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Compute 7 days for the selected week offset
  const weekDays = useMemo(() => {
    const ref = new Date();
    ref.setDate(ref.getDate() + weekOffset * 7);
    return getWeekDays(ref);
  }, [weekOffset]);

  const weekLabel = useMemo(() => formatWeekRangeLabel(weekDays), [weekDays]);

  // Aggregate local entries for the 7 days
  const aggregatedWeekDays = useMemo(() => {
    return weekDays.map((d) => {
      const entry = entries.find((e) => !e.isDeleted && (e.date === d.date || e.id === d.date));
      const hasEntry = Boolean(
        entry &&
          ((entry.turns && entry.turns.length > 0) ||
            (entry.title && entry.title.trim() !== '' && entry.title !== 'Untitled Reflection') ||
            entry.summary)
      );

      const contentSnippet = entry?.turns
        ? entry.turns.map((t) => `${t.role === 'user' ? 'User' : 'AI'}: ${t.content}`).join('\n')
        : '';

      return {
        date: d.date,
        dayName: d.dayName,
        hasEntry,
        title: entry?.title || '',
        summary: entry?.summary || '',
        mood: entry?.mood || 'peaceful',
        mode: entry?.mode || 'reflect',
        contentSnippet: contentSnippet.slice(0, 1000),
        entry,
      };
    });
  }, [weekDays, entries]);

  const totalEntriesLogged = useMemo(() => {
    return aggregatedWeekDays.filter((d) => d.hasEntry).length;
  }, [aggregatedWeekDays]);

  // Fetch or generate synthesis via Gemini API endpoint
  const generateWeeklyReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsFlipped(false);
    setCardIndex(0);

    try {
      const payload = {
        weekLabel,
        days: aggregatedWeekDays.map((d) => ({
          date: d.date,
          dayName: d.dayName,
          hasEntry: d.hasEntry,
          title: d.title,
          summary: d.summary,
          mood: d.mood,
          mode: d.mode,
          contentSnippet: d.contentSnippet,
        })),
      };

      const res = await fetch('/api/gemini/weekly-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUserId ? { 'x-user-uid': currentUserId } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData, `Failed to generate review (${res.status})`));
      }

      const data: WeeklyReviewResponse = await res.json();
      setReviewData(data);
    } catch (err: any) {
      console.error('Error generating weekly review:', err);
      setError(extractErrorMessage(err, 'Failed to synthesize this week with Gemini.'));
    } finally {
      setLoading(false);
    }
  }, [weekLabel, aggregatedWeekDays, currentUserId]);

  // Auto-generate on modal open or when week changes
  useEffect(() => {
    if (isOpen) {
      generateWeeklyReview();
    }
  }, [isOpen, weekOffset, generateWeeklyReview]);

  // Reset flip when card index changes
  const handleCardChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex <= 7) {
      setIsFlipped(false);
      setCardIndex(newIndex);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleCardChange(cardIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        handleCardChange(cardIndex - 1);
      } else if (e.key === ' ' || e.key === 'f' || e.key === 'F') {
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cardIndex, onClose]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        // Swipe left -> Next card
        handleCardChange(cardIndex + 1);
      } else {
        // Swipe right -> Prev card
        handleCardChange(cardIndex - 1);
      }
    }
    setTouchStartX(null);
  };

  const handleShareOrCopy = () => {
    if (!reviewData) return;
    const shareText = `🌟 Weekly Reflection (${reviewData.weekLabel})\n\n` +
      `Arc: ${reviewData.closingCard.arcSummary}\n\n` +
      `Key Themes: ${reviewData.closingCard.keyThemes.join(', ')}\n\n` +
      `Closing Message: ${reviewData.closingCard.closingMessage}\n\n` +
      `Reflected with "Inner Sanctum"`;

    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  // Active card data
  const isClosingCard = cardIndex === 7;
  const currentDailyCard: WeeklyDailyCard | undefined = reviewData?.dailyCards?.[cardIndex];
  const matchingLocalDay = aggregatedWeekDays[cardIndex];

  return (
    <div 
      id="weekly-review-modal"
      role="dialog" 
      aria-modal="true"
      aria-label="Weekly Reflection Flashcards Review"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Main Container */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#FDFCF9] shadow-2xl border border-[#E6E2D3] z-10 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header / Week Switcher */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E6E2D3] bg-[#F9F7F0]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4A5D4E] text-[#FDFCF9] shadow-2xs">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-semibold text-[#1A1A1A]">
                  Weekly Flashcards Review
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F0ECE1] px-2 py-0.5 text-[11px] font-medium text-[#4A5D4E] border border-[#E6E2D3]">
                  <Sparkles className="h-3 w-3" />
                  Gemini Synthesis
                </span>
              </div>
              <p className="text-xs text-[#7C786A] font-serif">
                7 daily reflection cards + 1 weekly emotional arc summary
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-weekly-copy"
              onClick={handleShareOrCopy}
              disabled={!reviewData}
              className="p-1.5 text-[#7C786A] hover:text-[#1A1A1A] hover:bg-[#F0ECE1] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              title="Copy Weekly Synthesis"
            >
              {copied ? <Check className="h-4 w-4 text-[#4A5D4E]" /> : <Share2 className="h-4 w-4" />}
            </button>
            <button
              id="btn-close-weekly-modal"
              onClick={onClose}
              className="p-1.5 text-[#7C786A] hover:text-[#1A1A1A] hover:bg-[#F0ECE1] rounded-lg transition-colors cursor-pointer"
              title="Close Review"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Week Selector Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-2.5 bg-[#FDFCF9] border-b border-[#E6E2D3]/60 text-xs font-serif shrink-0">
          <div className="flex items-center gap-1">
            <button
              id="btn-prev-week"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[#7C786A] hover:text-[#1A1A1A] hover:bg-[#F0ECE1] transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev Week</span>
            </button>
            <button
              id="btn-current-week"
              onClick={() => setWeekOffset(0)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                weekOffset === 0 ? 'bg-[#4A5D4E] text-[#FDFCF9] font-medium' : 'text-[#7C786A] hover:bg-[#F0ECE1]'
              }`}
            >
              This Week
            </button>
            <button
              id="btn-next-week"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[#7C786A] hover:text-[#1A1A1A] hover:bg-[#F0ECE1] transition-colors cursor-pointer"
            >
              <span>Next Week</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="font-semibold text-[#1A1A1A]">{weekLabel}</span>
              <span className="text-[11px] text-[#7C786A] ml-2">
                ({totalEntriesLogged}/7 days logged)
              </span>
            </div>
            <button
              id="btn-regenerate-weekly"
              onClick={generateWeeklyReview}
              disabled={loading}
              className="p-1 text-[#7C786A] hover:text-[#1A1A1A] hover:bg-[#F0ECE1] rounded-md transition-colors cursor-pointer"
              title="Regenerate synthesis with Gemini"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#4A5D4E]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Card Stage / Viewport */}
        <div 
          className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[380px] sm:min-h-[420px]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4A5D4E]/10 text-[#4A5D4E] border border-[#4A5D4E]/20 animate-pulse">
                <Sparkles className="h-7 w-7 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <h3 className="text-base font-serif font-semibold text-[#1A1A1A]">
                Synthesizing your weekly emotional arc...
              </h3>
              <p className="text-xs text-[#7C786A] font-serif max-w-sm">
                Gemini is analyzing your 7 daily reflections to extract core insights and overarching themes.
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 max-w-md">
              <p className="text-xs text-[#9A4242] font-serif">{error}</p>
              <button
                onClick={generateWeeklyReview}
                className="px-4 py-2 rounded-xl bg-[#4A5D4E] text-[#FDFCF9] text-xs font-serif cursor-pointer hover:bg-[#3C4C3F]"
              >
                Retry Analysis
              </button>
            </div>
          ) : reviewData ? (
            <div className="w-full max-w-lg flex flex-col items-center">
              
              {/* Card Container (Flippable) */}
              <div
                id={`flashcard-${cardIndex}`}
                onClick={() => setIsFlipped((prev) => !prev)}
                style={{ perspective: '1000px' }}
                className="w-full min-h-[320px] sm:min-h-[340px] cursor-pointer group select-none"
              >
                <div
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  className="relative w-full h-full min-h-[320px] sm:min-h-[340px] rounded-3xl shadow-lg border border-[#E6E2D3] bg-[#FDFCF9]"
                >
                  {/* ================= FRONT SIDE ================= */}
                  <div
                    style={{ backfaceVisibility: 'hidden' }}
                    className="absolute inset-0 w-full h-full rounded-3xl p-6 sm:p-7 flex flex-col justify-between bg-gradient-to-b from-[#FDFCF9] to-[#F9F7F0]"
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between">
                      {!isClosingCard && currentDailyCard ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-serif font-medium bg-[#F0ECE1] text-[#1A1A1A] border border-[#E6E2D3]">
                            {currentDailyCard.dayName}, {currentDailyCard.date}
                          </span>
                          {currentDailyCard.hasEntry ? (
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-serif font-medium flex items-center gap-1 border ${
                              MOOD_COLORS[currentDailyCard.mood || 'peaceful']?.bg || 'bg-[#F0ECE1]'
                            } ${MOOD_COLORS[currentDailyCard.mood || 'peaceful']?.text || 'text-[#4A5D4E]'} ${
                              MOOD_COLORS[currentDailyCard.mood || 'peaceful']?.border || 'border-[#E6E2D3]'
                            }`}>
                              <span>{currentDailyCard.moodEmoji || MOOD_EMOJIS[currentDailyCard.mood || 'peaceful']}</span>
                              <span className="capitalize">{currentDailyCard.mood || 'peaceful'}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-serif text-[#7C786A] bg-[#F0ECE1]/60 border border-[#E6E2D3]">
                              🌱 Quiet Day
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-serif font-medium bg-[#4A5D4E] text-[#FDFCF9] shadow-2xs">
                            ✨ Weekly Synthesis & Arc
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-serif text-[#4A5D4E] bg-[#F0ECE1] border border-[#E6E2D3]">
                            {totalEntriesLogged}/7 Days Reflected
                          </span>
                        </div>
                      )}

                      <span className="text-[11px] font-serif text-[#7C786A] tracking-wider">
                        Card {cardIndex + 1} of 8
                      </span>
                    </div>

                    {/* Middle: Core digest phrase or closing arc */}
                    <div className="my-auto py-4">
                      {!isClosingCard && currentDailyCard ? (
                        <div className="space-y-3">
                          <p className="text-lg sm:text-xl font-serif text-[#1A1A1A] font-medium leading-relaxed">
                            "{currentDailyCard.phrase}"
                          </p>
                          {currentDailyCard.keyInsight && (
                            <div className="inline-flex items-start gap-1.5 p-2.5 rounded-xl bg-[#F0ECE1]/80 border border-[#E6E2D3] text-xs font-serif text-[#4A5D4E]">
                              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>{currentDailyCard.keyInsight}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h3 className="text-base sm:text-lg font-serif font-semibold text-[#1A1A1A]">
                            {reviewData.closingCard.title}
                          </h3>
                          <p className="text-sm sm:text-base font-serif text-[#2C2C2C] leading-relaxed">
                            {reviewData.closingCard.arcSummary}
                          </p>
                          {/* Key Themes */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {reviewData.closingCard.keyThemes.map((theme, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-lg text-xs font-serif bg-[#F0ECE1] text-[#4A5D4E] border border-[#E6E2D3]"
                              >
                                #{theme}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Prompt / Flip hint */}
                    <div className="flex items-center justify-between text-xs text-[#7C786A] font-serif pt-2 border-t border-[#E6E2D3]/60">
                      <span className="flex items-center gap-1">
                        <RotateCw className="h-3 w-3 group-hover:rotate-45 transition-transform" />
                        <span>Click card to flip for details</span>
                      </span>
                      <span className="text-[11px] text-[#A39E8F]">
                        [Space] to flip
                      </span>
                    </div>
                  </div>

                  {/* ================= BACK SIDE ================= */}
                  <div
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                    className="absolute inset-0 w-full h-full rounded-3xl p-6 sm:p-7 flex flex-col justify-between bg-[#F9F7F0] border-2 border-[#4A5D4E]/20"
                  >
                    {/* Back Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-serif font-semibold text-[#4A5D4E] flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        {!isClosingCard ? 'Deep Dive & Reflection Prompt' : 'Closing Reflection & Forward Path'}
                      </span>
                      <span className="text-[11px] font-serif text-[#7C786A]">
                        Card {cardIndex + 1} of 8 (Back)
                      </span>
                    </div>

                    {/* Back Content */}
                    <div className="my-auto py-3 space-y-3">
                      {!isClosingCard && currentDailyCard ? (
                        <>
                          {currentDailyCard.hasEntry ? (
                            <div className="space-y-2">
                              <p className="text-xs sm:text-sm font-serif text-[#1A1A1A] leading-relaxed bg-[#FDFCF9] p-3 rounded-xl border border-[#E6E2D3]">
                                <span className="font-semibold block mb-1 text-[#4A5D4E]">Daily Excerpt:</span>
                                {currentDailyCard.summary || currentDailyCard.title || 'Recorded meaningful reflection turns.'}
                              </p>

                              {currentDailyCard.promptQuestion && (
                                <div className="p-3 rounded-xl bg-[#4A5D4E]/10 border border-[#4A5D4E]/20 text-xs font-serif text-[#1A1A1A]">
                                  <span className="font-semibold text-[#4A5D4E] block mb-0.5">Mindful Inquiry:</span>
                                  {currentDailyCard.promptQuestion}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2 text-center py-2">
                              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0ECE1] text-[#7C786A]">
                                🌱
                              </div>
                              <p className="text-xs font-serif text-[#7C786A] max-w-xs mx-auto">
                                No entry was recorded on {currentDailyCard.dayName}. Unlogged stillness is also a healthy part of your routine.
                              </p>
                              {currentDailyCard.promptQuestion && (
                                <p className="text-xs font-serif text-[#4A5D4E] italic">
                                  "{currentDailyCard.promptQuestion}"
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3.5 rounded-xl bg-[#FDFCF9] border border-[#E6E2D3] text-xs sm:text-sm font-serif text-[#1A1A1A] leading-relaxed">
                            <span className="font-semibold text-[#4A5D4E] block mb-1">Encouragement for the coming week:</span>
                            {reviewData.closingCard.closingMessage}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center text-xs font-serif">
                            <div className="p-2 rounded-lg bg-[#F0ECE1] border border-[#E6E2D3]">
                              <span className="block text-base font-semibold text-[#4A5D4E]">{totalEntriesLogged}</span>
                              <span className="text-[11px] text-[#7C786A]">Days Recorded</span>
                            </div>
                            <div className="p-2 rounded-lg bg-[#F0ECE1] border border-[#E6E2D3]">
                              <span className="block text-base font-semibold text-[#7C786A]">{7 - totalEntriesLogged}</span>
                              <span className="text-[11px] text-[#7C786A]">Quiet / Rest Days</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Back Footer & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#E6E2D3]">
                      {!isClosingCard && currentDailyCard ? (
                        <button
                          id={`btn-jump-day-${currentDailyCard.date}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onOpenDate(currentDailyCard.date);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4A5D4E] text-[#FDFCF9] text-xs font-serif hover:bg-[#3C4C3F] transition-colors cursor-pointer shadow-2xs"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span>Open {currentDailyCard.dayName}'s Journal</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs font-serif text-[#4A5D4E] font-medium">
                          You're doing great. Keep writing!
                        </span>
                      )}

                      <span className="text-[11px] text-[#7C786A] font-serif flex items-center gap-1">
                        <RotateCw className="h-3 w-3" />
                        Flip back
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Controls & Pagination */}
              <div className="w-full mt-5 flex items-center justify-between">
                <button
                  id="btn-prev-card"
                  onClick={() => handleCardChange(cardIndex - 1)}
                  disabled={cardIndex === 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-serif bg-[#F0ECE1] text-[#1A1A1A] hover:bg-[#E6E2D3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-[#E6E2D3]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                {/* 8 Pagination Dots */}
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleCardChange(idx)}
                      title={idx === 7 ? 'Closing Synthesis Card' : `Day ${idx + 1}`}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        cardIndex === idx
                          ? 'w-6 bg-[#4A5D4E]'
                          : 'w-2.5 bg-[#E6E2D3] hover:bg-[#A39E8F]'
                      }`}
                    />
                  ))}
                </div>

                <button
                  id="btn-next-card"
                  onClick={() => handleCardChange(cardIndex + 1)}
                  disabled={cardIndex === 7}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-serif bg-[#F0ECE1] text-[#1A1A1A] hover:bg-[#E6E2D3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-[#E6E2D3]"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-[#E6E2D3] bg-[#F9F7F0]/60 flex items-center justify-between text-xs text-[#7C786A] font-serif shrink-0">
          <span>Tip: Use ← / → arrow keys to navigate cards, [Space] to flip.</span>
          <button
            onClick={onClose}
            className="text-xs text-[#4A5D4E] hover:underline font-medium cursor-pointer"
          >
            Done Reviewing
          </button>
        </div>

      </div>
    </div>
  );
};
