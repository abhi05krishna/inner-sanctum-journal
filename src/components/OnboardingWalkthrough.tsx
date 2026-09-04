import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Calendar,
  Sun,
  Search,
  Layers,
  Disc3,
  Mic,
  Menu,
  Building2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Compass,
  Lock,
  Share2,
  BookOpen
} from 'lucide-react';

export interface OnboardingStep {
  id: string;
  stepNumber: number;
  badge: string;
  title: string;
  description: string;
  secondaryNote?: string;
  icon: React.ElementType;
  targetSelector?: string;
  previewType: 'welcome' | 'calendar' | 'today' | 'ambiance' | 'search' | 'universe' | 'weekly' | 'spotify' | 'voice_share' | 'drawer' | 'organization' | 'ready';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    stepNumber: 1,
    badge: 'Introduction',
    title: 'Welcome to Inner Sanctum',
    description: 'Inner Sanctum is your private, contemplative daily sanctuary designed for intentional journaling, Socratic inquiry, and mindful self-discovery.',
    secondaryNote: 'Rooted in zero-data-sales privacy, owner-bound isolation, and calm design.',
    icon: Sparkles,
    previewType: 'welcome',
  },
  {
    id: 'calendar',
    stepNumber: 2,
    badge: 'Daily Structure',
    title: 'The Calendar View',
    description: 'Each day is its own dedicated reflection space. Click any calendar date to write, capture insights, or revisit past reflections anytime.',
    secondaryNote: 'Organized naturally by date without cluttered folders or unstructured notes.',
    icon: Calendar,
    targetSelector: '#section-today-reflection',
    previewType: 'calendar',
  },
  {
    id: 'today_reflection',
    stepNumber: 3,
    badge: 'Quick Access',
    title: "Today's Reflection Card",
    description: "The dedicated hero card at the top provides an instant view of today's progress and a one-click button to jump straight into your current entry.",
    secondaryNote: "Reflect at your own pace—return anytime to continue today's dialogue.",
    icon: BookOpen,
    targetSelector: '#section-today-reflection',
    previewType: 'today',
  },
  {
    id: 'ambiance',
    stepNumber: 4,
    badge: 'In-Entry Lighting',
    title: 'Adaptive Mood & Weather Lighting',
    description: 'To keep your home calendar minimalist and distraction-free, the mood vs. weather ambiance switcher is housed directly in the top navigation bar when viewing or writing inside a date reflection entry.',
    secondaryNote: 'Open today’s reflection or click any calendar date to toggle between sentiment-driven ambient tones and live local weather lighting in the top bar.',
    icon: Sun,
    previewType: 'ambiance',
  },
  {
    id: 'search',
    stepNumber: 5,
    badge: 'AI Discovery',
    title: 'Monthly Archive & Semantic Search',
    description: 'Search your reflections by concept or emotional feeling—not just exact keywords. AI vector embeddings locate related thoughts even if phrased differently.',
    secondaryNote: 'Try searching for ideas like "creative spark", "morning clarity", or "peaceful walk".',
    icon: Search,
    targetSelector: '#input-calendar-search',
    previewType: 'search',
  },
  {
    id: 'universe',
    stepNumber: 6,
    badge: 'Reflection Universe',
    title: 'Your Reflection Universe (2D Map)',
    description: 'Explore your memories projected into an interactive 2D universe. Entries that feel similar naturally cluster near each other, connected by subtle constellations.',
    secondaryNote: 'Click any node to re-read that reflection or explore related thoughts across time.',
    icon: Compass,
    targetSelector: '#btn-nav-universe',
    previewType: 'universe',
  },
  {
    id: 'weekly_review',
    stepNumber: 7,
    badge: 'Synthesis & Insights',
    title: 'Weekly Review Flashcards',
    description: 'At any point, generate an interactive 7-card deck synthesizing your daily reflections, recurring emotional arcs, and personal growth insights.',
    secondaryNote: 'Click "Weekly Review" above the calendar to review your week in bite-sized cards.',
    icon: Layers,
    targetSelector: '#btn-open-weekly-review',
    previewType: 'weekly',
  },
  {
    id: 'spotify',
    stepNumber: 8,
    badge: 'Atmospheric Audio',
    title: 'Mood Music Companion',
    description: 'During reflections, receive ambient music and playlist suggestions thoughtfully matched to your mood. Connecting your Spotify account is completely optional.',
    secondaryNote: 'Spotify credentials remain strictly encrypted with server-side token refresh.',
    icon: Disc3,
    previewType: 'spotify',
  },
  {
    id: 'voice_cards',
    stepNumber: 9,
    badge: 'Express & Share',
    title: 'Voice Input & Shareable Cards',
    description: 'Speak your thoughts hands-free with real-time speech-to-text, or export elegant, private quote cards with zero personal diary data exposed.',
    secondaryNote: 'Cards are drawn 100% in your browser canvas with zero server transmission.',
    icon: Mic,
    previewType: 'voice_share',
  },
  {
    id: 'navigation',
    stepNumber: 10,
    badge: 'Security & Options',
    title: 'Navigation & Security Hub',
    description: 'Open the hamburger menu to inspect our verified 5 Threat Zones security architecture, restore recently deleted reflections, or manage account settings.',
    secondaryNote: 'Includes a 15-day soft delete recovery safety net for accidental deletions.',
    icon: Menu,
    targetSelector: '#btn-hamburger-menu',
    previewType: 'drawer',
  },
  {
    id: 'organization',
    stepNumber: 11,
    badge: 'Optional Workspaces',
    title: 'Organization Workspaces & Privacy Guarantee',
    description: 'You can optionally join or sponsor an organization workspace from the menu. This is completely optional, and your reflections always remain 100% private.',
    secondaryNote: 'Employers and admins only manage seat counts and can NEVER read or view your journal content.',
    icon: Building2,
    previewType: 'organization',
  },
  {
    id: 'ready',
    stepNumber: 12,
    badge: 'Ready to Reflect',
    title: "You're All Set!",
    description: 'Your private sanctuary is ready. Begin with a single honest thought, capture gratitude, or explore deep inquiry with Gemini.',
    secondaryNote: 'Click below to start writing in today’s reflection space.',
    icon: CheckCircle2,
    previewType: 'ready',
  },
];

interface OnboardingWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  onStartToday: () => void;
  isManuallyTriggered?: boolean;
}

export const OnboardingWalkthrough: React.FC<OnboardingWalkthroughProps> = ({
  isOpen,
  onClose,
  onStartToday,
  isManuallyTriggered = false,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = ONBOARDING_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;

  // Handle Spotlight ring on target DOM element
  useEffect(() => {
    if (!isOpen) return;

    const selector = step.targetSelector;
    if (!selector) return;

    let highlightedEl: HTMLElement | null = null;
    try {
      highlightedEl = document.querySelector(selector);
      if (highlightedEl) {
        highlightedEl.classList.add('transition-all', 'duration-300');
        highlightedEl.style.outline = '3px solid #FA8112';
        highlightedEl.style.outlineOffset = '4px';
        highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch {
      // ignore selector errors
    }

    return () => {
      if (highlightedEl) {
        highlightedEl.style.outline = '';
        highlightedEl.style.outlineOffset = '';
      }
    };
  }, [isOpen, currentStepIndex, step.targetSelector]);

  // Keyboard navigation: ArrowLeft (prev), ArrowRight (next), Escape (dismiss)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLastStep) {
      onStartToday();
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const StepIcon = step.icon;

  return (
    <div
      id="onboarding-walkthrough-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#222222]/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Modal Container */}
      <div
        id="onboarding-walkthrough-modal"
        className="relative flex flex-col w-full max-w-lg rounded-3xl border border-[#DCD7C5] bg-[#FAF3E1] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Progress & Header Bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E5D8B8]/80 bg-[#FAF3E1]">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FA8112]/15 text-[#FA8112]">
              <Compass className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-serif font-bold text-[#222222] tracking-wide">
              {isManuallyTriggered ? 'Inner Sanctum Guide' : 'Orientation Tour'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Step Counter Badge */}
            <span className="text-xs font-serif font-semibold text-[#5C5549] bg-[#F5E7C6] px-2.5 py-0.5 rounded-full border border-[#E5D8B8]">
              {step.stepNumber} of {ONBOARDING_STEPS.length}
            </span>

            {/* Skip / Close Button */}
            <button
              id="btn-skip-onboarding"
              onClick={handleSkip}
              className="p-1 rounded-lg text-[#7C7464] hover:text-[#222222] hover:bg-[#F5E7C6] transition-colors cursor-pointer"
              title="Skip Tour (Esc)"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Step Progress Pill Indicator Bars */}
        <div className="w-full bg-[#E5D8B8]/50 h-1.5 flex gap-0.5 px-4 pt-1">
          {ONBOARDING_STEPS.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-1 flex-1 rounded-full cursor-pointer transition-all duration-300 ${
                idx === currentStepIndex
                  ? 'bg-[#FA8112] shadow-xs'
                  : idx < currentStepIndex
                  ? 'bg-[#FA8112]/50'
                  : 'bg-[#DCD7C5]'
              }`}
              title={`Jump to ${s.title}`}
            />
          ))}
        </div>

        {/* Content Section */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Step Category Badge & Icon */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F5E7C6] px-3 py-1 text-xs font-serif font-bold text-[#8A3B00] border border-[#DFCBA0]">
              <StepIcon className="h-3.5 w-3.5 text-[#FA8112]" />
              <span>{step.badge}</span>
            </div>

            {step.targetSelector && (
              <span className="hidden xs:inline-flex items-center gap-1 text-[11px] font-serif text-[#7C7464]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FA8112] animate-ping" />
                <span>Spotlighted in UI</span>
              </span>
            )}
          </div>

          {/* Step Title & Description */}
          <div className="space-y-1.5">
            <h2
              id="onboarding-step-title"
              className="text-lg sm:text-xl font-serif font-bold tracking-tight text-[#111111]"
            >
              {step.title}
            </h2>
            <p className="text-xs sm:text-sm font-sans text-[#222222] leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Rich Visual Mini-Preview Illustration Card */}
          <div className="rounded-2xl border border-[#E5D8B8] bg-[#F5E7C6]/50 p-3.5 sm:p-4 shadow-2xs">
            {step.previewType === 'welcome' && (
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FA8112] text-white shadow-md">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1 text-xs font-serif text-[#222222] space-y-1">
                  <div className="font-bold text-[#111111] flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-[#FA8112]" />
                    <span>Owner-Isolated & Private</span>
                  </div>
                  <p className="text-[#5C5549] text-[11px] leading-relaxed">
                    Designed for honest reflection with zero ads, zero telemetry tracking, and encrypted Firestore isolation.
                  </p>
                </div>
              </div>
            )}

            {step.previewType === 'calendar' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-serif font-semibold text-[#5C5549]">
                  <span>Calendar Grid</span>
                  <span className="text-[#FA8112]">Daily Entries</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-serif">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="font-bold text-[#8A8373] py-0.5">{d}</div>
                  ))}
                  {[12, 13, 14, 15, 16, 17, 18].map((day, idx) => (
                    <div
                      key={day}
                      className={`py-1 rounded-lg border text-xs font-bold transition-all ${
                        idx === 4
                          ? 'bg-[#FA8112] text-white border-[#FA8112] shadow-2xs'
                          : idx === 2
                          ? 'bg-[#FAF3E1] text-[#111111] border-[#DFCBA0]'
                          : 'bg-[#FAF3E1]/70 text-[#7C7464] border-transparent'
                      }`}
                    >
                      {day}
                      {idx === 2 && <span className="block h-1 w-1 mx-auto mt-0.5 rounded-full bg-[#FA8112]" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step.previewType === 'today' && (
              <div className="flex items-center justify-between gap-3 bg-[#FAF3E1] p-3 rounded-xl border border-[#DFCBA0]">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-serif font-bold text-[#8A3B00]">
                    <span className="h-2 w-2 rounded-full bg-[#FA8112]" />
                    <span>Today's Reflection</span>
                  </div>
                  <div className="text-xs font-serif text-[#222222] font-semibold">
                    Instant one-click access to today's prompt
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-[#FA8112] text-white text-xs font-serif font-bold shadow-2xs">
                  Open Today
                </div>
              </div>
            )}

            {step.previewType === 'ambiance' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-serif">
                  <span className="text-[#5C5549] font-medium">Inside Date Reflection:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#8A3B00] bg-[#FAF3E1] px-2 py-0.5 rounded-full border border-[#DFCBA0]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FA8112]" />
                    Top Navbar Control
                  </span>
                </div>

                <div className="flex items-center justify-between bg-[#FAF3E1] p-2.5 rounded-xl border border-[#DFCBA0]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-serif font-bold text-[#111111]">Daily Reflection</span>
                    <span className="text-[10px] text-[#7C7464]">• Top Bar</span>
                  </div>

                  <div className="flex items-center bg-[#F5E7C6] p-0.5 sm:p-1 rounded-lg border border-[#E5D8B8] shadow-2xs gap-1">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF3E1] text-[#FA8112] text-[11px] font-serif font-bold shadow-xs border border-[#DFCBA0]">
                      <span>🌿</span>
                      <span>Mood</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[#7C7464] text-[11px] font-serif font-medium hover:text-[#111111]">
                      <span>⛅</span>
                      <span>Weather</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-serif text-[#5C5549] pl-1 leading-relaxed">
                  Home calendar remains clean and distraction-free. Switch ambiance anytime while writing.
                </div>
              </div>
            )}

            {step.previewType === 'search' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-[#FAF3E1] px-3 py-2 rounded-xl border border-[#DFCBA0]">
                  <Search className="h-3.5 w-3.5 text-[#FA8112]" />
                  <span className="text-xs font-serif text-[#222222]">"creative motivation after morning coffee"</span>
                  <span className="ml-auto text-[9px] font-bold bg-[#FA8112]/20 text-[#8A3B00] px-1.5 py-0.5 rounded">
                    Vector Match
                  </span>
                </div>
                <div className="text-[10px] font-serif text-[#5C5549] pl-1">
                  Matches entries conceptually without needing the exact phrase.
                </div>
              </div>
            )}

            {step.previewType === 'universe' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between bg-[#0B1222] p-3 rounded-xl border border-white/15 text-white shadow-inner">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#63B3ED]/20 text-[#90CDF4] border border-[#63B3ED]/30">
                      <Compass className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-serif font-bold text-white">
                        Night-Sky Observatory
                      </div>
                      <div className="text-[10px] text-slate-300">
                        2D Semantic Space • Mood Nebulae
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#FF6B6B]" />
                    <span className="h-2 w-2 rounded-full bg-[#48BB78]" />
                    <span className="h-2 w-2 rounded-full bg-[#63B3ED]" />
                    <span className="text-[10px] font-mono text-slate-300 ml-1">Star Clusters</span>
                  </div>
                </div>
                <div className="text-[10px] font-serif text-[#5C5549] pl-1 leading-relaxed">
                  Closeness indicates similar thoughts. Includes soft cluster shading, zoom/pan navigation, and a full mood legend.
                </div>
              </div>
            )}

            {step.previewType === 'weekly' && (
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2 overflow-hidden py-1">
                  {['Mon', 'Wed', 'Fri', 'Sun'].map((d, i) => (
                    <div
                      key={d}
                      className="inline-flex h-8 w-12 items-center justify-center rounded-lg border border-[#DFCBA0] bg-[#FAF3E1] text-[10px] font-serif font-bold text-[#222222] shadow-2xs"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="text-xs font-serif font-bold text-[#8A3B00] min-w-0">
                  7 Daily Cards + Emotional Arc Summary
                </div>
              </div>
            )}

            {step.previewType === 'spotify' && (
              <div className="flex items-center gap-3 bg-[#FAF3E1] p-2.5 rounded-xl border border-[#DFCBA0]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1DB954] text-white shadow-2xs">
                  <Disc3 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-serif font-bold text-[#111111]">
                    Ambient Music Suggestions
                  </div>
                  <div className="text-[10px] text-[#5C5549]">
                    Connect Spotify (Optional) to stream mood-matched playlists.
                  </div>
                </div>
              </div>
            )}

            {step.previewType === 'voice_share' && (
              <div className="grid grid-cols-2 gap-2 text-xs font-serif">
                <div className="flex items-center gap-2 bg-[#FAF3E1] p-2 rounded-xl border border-[#DFCBA0]">
                  <Mic className="h-4 w-4 text-[#FA8112]" />
                  <span className="text-[#222222] font-semibold">Web Speech API</span>
                </div>
                <div className="flex items-center gap-2 bg-[#FAF3E1] p-2 rounded-xl border border-[#DFCBA0]">
                  <Share2 className="h-4 w-4 text-[#FA8112]" />
                  <span className="text-[#222222] font-semibold">Client Quote Card</span>
                </div>
              </div>
            )}

            {step.previewType === 'drawer' && (
              <div className="flex items-center justify-between bg-[#FAF3E1] p-2.5 rounded-xl border border-[#DFCBA0]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#FA8112]" />
                  <span className="text-xs font-serif font-bold text-[#222222]">
                    5 Threat Zones Security Model
                  </span>
                </div>
                <span className="text-[10px] font-serif font-bold text-[#8A3B00] bg-[#F5E7C6] px-2 py-0.5 rounded border border-[#E5D8B8]">
                  Verified
                </span>
              </div>
            )}

            {step.previewType === 'organization' && (
              <div className="space-y-1.5 bg-[#FAF3E1] p-3 rounded-xl border border-[#DFCBA0]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif font-bold text-[#222222] flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[#FA8112]" />
                    <span>Company Wellness Workspaces</span>
                  </span>
                  <span className="text-[9px] font-serif font-bold text-[#5C5549] bg-[#F5E7C6] px-2 py-0.5 rounded border border-[#E5D8B8]">
                    Optional
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-[11px] font-serif text-[#4A5D4E] font-medium leading-relaxed">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#4A5D4E]" />
                  <span>
                    <strong>Zero-Content Visibility Guarantee:</strong> Employers only manage seat licenses and cannot access your reflections under any circumstance.
                  </span>
                </div>
              </div>
            )}

            {step.previewType === 'ready' && (
              <div className="text-center py-2 space-y-1.5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FA8112]/20 text-[#FA8112] mb-1">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="text-xs font-serif font-bold text-[#111111]">
                  Your private reflection space is ready.
                </div>
                <div className="text-[11px] font-serif text-[#5C5549]">
                  Return to this guide anytime via the hamburger menu.
                </div>
              </div>
            )}

            {/* Step secondary contextual note */}
            {step.secondaryNote && (
              <div className="mt-2.5 pt-2 border-t border-[#E5D8B8]/80 text-[11px] font-serif text-[#5C5549] leading-relaxed">
                💡 {step.secondaryNote}
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#E5D8B8] bg-[#F5E7C6]/60">
          <div>
            {!isFirstStep ? (
              <button
                id="btn-onboarding-back"
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-serif font-semibold text-[#222222] bg-[#FAF3E1] hover:bg-[#EBDAB3] border border-[#DFCBA0] transition-colors cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                id="btn-onboarding-skip-footer"
                type="button"
                onClick={handleSkip}
                className="text-xs font-serif font-medium text-[#7C7464] hover:text-[#222222] transition-colors cursor-pointer px-2 py-1"
              >
                Skip Tour
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isLastStep ? (
              <button
                id="btn-onboarding-next"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-serif font-bold text-white bg-[#FA8112] hover:bg-[#E0700B] transition-all shadow-md hover:shadow-lg cursor-pointer group"
              >
                <span>Next</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button
                id="btn-onboarding-start-reflection"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-serif font-bold text-white bg-[#FA8112] hover:bg-[#E0700B] transition-all shadow-md hover:shadow-lg cursor-pointer group animate-bounce-subtle"
              >
                <Sparkles className="h-4 w-4 text-white group-hover:rotate-12 transition-transform" />
                <span>Start Today's Reflection</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
