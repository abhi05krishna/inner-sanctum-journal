import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ArrowRight, BookOpen, Flame, Sparkles } from 'lucide-react';
import type { JournalEntry } from '../types';
import { formatDateKey } from './CalendarView';

interface WelcomeBackPromptProps {
  entries: JournalEntry[];
  onOpenToday: () => void;
  userName?: string;
}

export const WelcomeBackPrompt: React.FC<WelcomeBackPromptProps> = ({
  entries,
  onOpenToday,
  userName,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const todayStr = useMemo(() => formatDateKey(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDateKey(d);
  }, []);

  // Calculate streak info for contextual display
  const hasYesterdayEntry = useMemo(() => {
    const todayEntry = entries.find((e) => !e.isDeleted && (e.date === todayStr || e.id === todayStr));
    const entriesWithContent = entries
      .filter((e) => !e.isDeleted)
      .filter(
        (e) =>
          (e.turns && e.turns.length > 0) ||
          (e.title && e.title.trim() !== '' && e.title !== 'Untitled Reflection') ||
          Boolean(e.summary)
      )
      .sort((a, b) => (b.date || b.id).localeCompare(a.date || a.id));

    const previousEntries = entriesWithContent.filter((e) => (e.date || e.id) !== todayStr);
    if (previousEntries.length === 0) return false;
    const latestRecordedDate = previousEntries[0].date || previousEntries[0].id;
    return latestRecordedDate === yesterdayStr;
  }, [entries, todayStr, yesterdayStr]);

  // Display every time the app loads, unless dismissed for this session/visit
  const shouldShow = !isDismissed;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleAccept = () => {
    handleDismiss();
    onOpenToday();
  };

  // Auto-dismiss after 4.5 seconds with visual progress indicator
  useEffect(() => {
    if (!shouldShow) return;

    const totalDurationMs = 4500;
    const intervalMs = 50;
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / totalDurationMs) * 100);
      setProgress(remainingPct);
    }, intervalMs);

    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, totalDurationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  // Extract first name for friendly warm greeting
  const displayName = userName ? userName.split(' ')[0] : null;

  return (
    <div
      id="welcome-back-journal-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome back journal invitation"
      onClick={handleDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      {/* Centered Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border-2 border-[#DFCBA0] bg-[#FAF3E1]/98 backdrop-blur-md p-6 sm:p-8 shadow-2xl transition-all animate-in zoom-in-95 duration-200 cursor-default text-center overflow-hidden"
      >
        {/* Top Close Button */}
        <button
          id="btn-dismiss-welcome-prompt"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-[#7C786A] hover:text-[#111111] hover:bg-[#F5E7C6] rounded-xl transition-colors cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss invitation"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Welcoming Diary / Book Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5E7C6] border border-[#DFCBA0] text-[#FA8112] shadow-sm">
          <BookOpen className="h-8 w-8" />
        </div>

        {/* Warm Greeting Badge */}
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#F5E7C6] px-3 py-1 text-xs font-bold text-[#994500] border border-[#DFCBA0]">
          {hasYesterdayEntry ? (
            <>
              <Flame className="h-3.5 w-3.5 text-[#FA8112]" />
              <span>Consistent Reflection Streak</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-[#FA8112]" />
              <span>Daily Reflection Sanctuary</span>
            </>
          )}
        </div>

        {/* Personalized Heading */}
        <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#111111] leading-snug">
          {displayName ? `Welcome back, ${displayName}! 📖` : 'Welcome back to your journal 📖'}
        </h3>

        {/* Friendly Invitation */}
        <p className="mt-3 text-sm text-[#333333] font-serif leading-relaxed">
          {hasYesterdayEntry
            ? 'You reflected yesterday — take a quiet, mindful moment to capture your thoughts, dilemmas, and creative sparks for today.'
            : 'Welcome back to your mindful sanctuary. Take a peaceful pause to capture your reflections, thoughts, and insights today.'}
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="btn-welcome-maybe-later"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-serif font-semibold text-[#5C5549] hover:text-[#111111] hover:bg-[#F5E7C6] rounded-xl transition-colors cursor-pointer"
          >
            Maybe later
          </button>
          <button
            id="btn-welcome-reflect-today"
            onClick={handleAccept}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#FA8112] hover:bg-[#E0720D] px-6 py-2.5 text-xs font-serif font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer group"
          >
            <Sparkles className="h-4 w-4" />
            <span>Reflect Today</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Subtle Auto-Dismiss Progress Bar */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1 bg-[#E5D8B8] overflow-hidden"
          title="Auto-closing soon"
        >
          <div 
            className="h-full bg-[#FA8112] transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
