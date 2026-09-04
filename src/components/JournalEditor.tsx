import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Lightbulb, 
  Download, 
  FileText, 
  Smile, 
  Tag as TagIcon, 
  X, 
  Loader2, 
  AlertCircle, 
  RotateCcw, 
  BookMarked,
  Layers,
  HeartHandshake,
  HelpCircle,
  ChevronLeft,
  Calendar as CalendarIcon,
  Trash2,
  Clock,
  Music,
  Disc3,
  Share2,
  Mic,
  MicOff
} from 'lucide-react';
import Markdown from 'react-markdown';
import type { JournalEntry, JournalTurn, ReflectionMode, MoodType, VisualDriverType, WeatherData } from '../types';
import { AnimatedBackground } from './AnimatedBackground';
import { SpotifyMusicCard } from './SpotifyMusicCard';
import { ShareableCardModal } from './ShareableCardModal';

interface JournalEditorProps {
  entry: JournalEntry;
  onUpdateEntry: (updated: JournalEntry) => void;
  onSummarize: (entry: JournalEntry) => Promise<void>;
  isSummarizing: boolean;
  onOpenSummaryModal: () => void;
  onBackToCalendar?: () => void;
  onDeleteEntry?: (dateKey: string) => void;
  activeDriver?: VisualDriverType;
  weatherData?: WeatherData | null;
  onToggleDriver?: () => void;
  onOpenSpotifyModal?: () => void;
  allEntries?: JournalEntry[];
  onNavigateToEntry?: (dateKey: string) => void;
}

const MODES: { id: ReflectionMode; label: string; desc: string; icon: string }[] = [
  { id: 'reflect', label: 'Socratic Reflection', desc: 'Mindful questioning & clarity', icon: '🪞' },
  { id: 'brainstorm', label: 'Creative Brainstorm', desc: 'Divergent ideas & possibilities', icon: '💡' },
  { id: 'deep_inquiry', label: 'Deep Inquiry', desc: 'Core motives & assumptions', icon: '🔍' },
  { id: 'problem_solving', label: 'Problem Solving', desc: 'Structured root cause & actions', icon: '🧩' },
  { id: 'gratitude', label: 'Gratitude & Savoring', desc: 'Grounding & emotional resilience', icon: '🌱' },
  { id: 'summarize', label: 'Synthesis Mode', desc: 'Key takeaways & takeaways', icon: '📑' },
];

const MOODS: { id: MoodType; label: string; emoji: string }[] = [
  { id: 'happy', label: 'Happy', emoji: '🌸' },
  { id: 'peaceful', label: 'Peaceful', emoji: '🌿' },
  { id: 'thoughtful', label: 'Thoughtful', emoji: '💡' },
  { id: 'energized', label: 'Energized', emoji: '⚡' },
  { id: 'motivated', label: 'Motivated', emoji: '🎯' },
  { id: 'neutral', label: 'Neutral', emoji: '⚖️' },
  { id: 'anxious', label: 'Anxious', emoji: '🌪️' },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '🌊' },
];

const SPARK_PROMPTS: Record<ReflectionMode, string[]> = {
  reflect: [
    'What was the most meaningful part of my day, and why?',
    'What thought or situation kept occupying my mental bandwidth?',
    'Where did I feel friction today, and what is it trying to tell me?',
  ],
  brainstorm: [
    'How might I approach this challenge from a completely opposite perspective?',
    'If budget and time were not constraints, what is the most ambitious solution?',
    'What are 3 alternative creative angles I haven’t tested yet?',
  ],
  deep_inquiry: [
    'What underlying assumption am I making about this situation?',
    'What is the real fear or motivation driving my hesitation?',
    'If I look back on this a year from now, what decision will I be proud of?',
  ],
  problem_solving: [
    'What is the single most critical bottleneck in this problem?',
    'What are 2 immediate actionable experiments I can execute today?',
    'What is inside my direct control versus what must I let go of?',
  ],
  gratitude: [
    'What small, quiet moment of comfort am I grateful for today?',
    'Who is someone who made my journey easier recently?',
    'What personal strength helped me navigate a recent obstacle?',
  ],
  summarize: [
    'What are the primary insights I want to remember from this week?',
    'Synthesize the key conclusions from my recent thoughts.',
  ],
};

export const JournalEditor: React.FC<JournalEditorProps> = ({
  entry,
  onUpdateEntry,
  onSummarize,
  isSummarizing,
  onOpenSummaryModal,
  onBackToCalendar,
  onDeleteEntry,
  activeDriver = 'mood',
  weatherData,
  onToggleDriver,
  onOpenSpotifyModal,
  allEntries = [],
  onNavigateToEntry,
}) => {
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isAutoMoodEnabled, setIsAutoMoodEnabled] = useState<boolean>(!entry.moodLocked);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareExcerpt, setShareExcerpt] = useState<string | undefined>(undefined);
  const [moodUpdateNotice, setMoodUpdateNotice] = useState<{
    mood: MoodType;
    oldMood?: MoodType;
    reason?: string;
  } | null>(null);

  // Voice Input (Web Speech API)
  const isSpeechSupported = useMemo(() => {
    return typeof window !== 'undefined' && Boolean(
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition
    );
  }, []);

  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>('');

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping speech recognition:', e);
      }
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    setSpeechError(null);

    const SpeechRecognitionClass = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechError('Voice input is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      baseTextRef.current = inputText;

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPart = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart;
          } else {
            interimTranscript += transcriptPart;
          }
        }

        const base = baseTextRef.current.trim();
        const spoken = (finalTranscript + interimTranscript).trim();

        // Input validation: Enforce length cap of 4000 characters
        if (spoken) {
          const combined = base ? `${base} ${spoken}` : spoken;
          setInputText(combined.slice(0, 4000));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        let friendlyMsg = 'Voice recognition error. Please try again.';
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          friendlyMsg = 'Microphone permission was denied. Please allow microphone access in your browser to use voice reflection.';
        } else if (event.error === 'no-speech') {
          friendlyMsg = 'No speech was detected. Tap the mic when you are ready to speak.';
        } else if (event.error === 'audio-capture') {
          friendlyMsg = 'No microphone hardware found on this device.';
        } else if (event.error === 'network') {
          friendlyMsg = 'Voice recognition network error. Please check your connection.';
        }
        setSpeechError(friendlyMsg);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setSpeechError('Could not access microphone or start voice recognition.');
      setIsListening(false);
    }
  };

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore error on unmount
        }
      }
    };
  }, []);

  const handleShareTurn = (content: string) => {
    setShareExcerpt(content);
    setIsShareModalOpen(true);
  };

  // Synchronize auto mood detection toggle if entry.moodLocked changes
  useEffect(() => {
    setIsAutoMoodEnabled(!entry.moodLocked);
  }, [entry.moodLocked, entry.id]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to display mood shift toast
  const triggerMoodNotice = (newMood: MoodType, oldMood?: MoodType, reason?: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setMoodUpdateNotice({ mood: newMood, oldMood, reason });
    noticeTimerRef.current = setTimeout(() => {
      setMoodUpdateNotice(null);
    }, 4500);
  };

  // Asynchronously generate semantic vector embedding for this entry
  const generateAndAttachEmbedding = async (targetEntry: JournalEntry) => {
    const combinedContent = [
      targetEntry.title,
      targetEntry.summary,
      targetEntry.takeaways?.join(' '),
      targetEntry.actionItems?.join(' '),
      targetEntry.turns.map((t) => t.content).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (combinedContent.length < 15) return;

    try {
      const res = await fetch('/api/gemini/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': targetEntry.userId || '',
        },
        body: JSON.stringify({ text: combinedContent }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          console.warn('[Embedding] Rate limit reached. Skipping embedding generation for now.');
        }
        return;
      }

      const data = await res.json();
      if (Array.isArray(data.embedding) && data.embedding.length > 0) {
        onUpdateEntry({
          ...targetEntry,
          embedding: data.embedding,
        });
      }
    } catch (embErr) {
      console.warn('[Embedding Generation] Non-blocking embedding generation error:', embErr);
    }
  };

  // Lazy generation: If an existing entry has content but no vector embedding, generate lazily on first access
  useEffect(() => {
    if (
      entry.turns.length > 0 &&
      (!entry.embedding || entry.embedding.length === 0) &&
      !entry.isDeleted
    ) {
      generateAndAttachEmbedding(entry);
    }
  }, [entry.id]);

  // Analyze conversation dynamically ONLY if the entry has turns but has never had any mood assigned
  const evaluateDynamicMood = async (currentTurns: JournalTurn[], currentMood?: MoodType) => {
    if (!isAutoMoodEnabled || currentTurns.length === 0 || currentMood) return;

    try {
      const res = await fetch('/api/gemini/sentiment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-uid': entry.userId || '',
        },
        body: JSON.stringify({
          turns: currentTurns,
          title: entry.title,
        }),
      });

      if (!res.ok) return;
      const data = await res.json();
      if (data?.mood && data.mood !== currentMood) {
        const prevMood = currentMood || entry.mood;
        onUpdateEntry({
          ...entry,
          mood: data.mood,
          moodReason: data.reason,
          updatedAt: new Date().toISOString(),
        });
        triggerMoodNotice(data.mood, prevMood, data.reason);
      }
    } catch (err) {
      console.warn('[Dynamic Mood Detection] Non-blocking evaluation error:', err);
    }
  };

  // Initial check on mount: ONLY evaluate if entry has turns, mood is not manually locked, and NO mood exists yet
  useEffect(() => {
    if (isAutoMoodEnabled && entry.turns.length > 0 && !entry.moodLocked && !entry.mood) {
      evaluateDynamicMood(entry.turns, entry.mood);
    }
  }, [entry.id]);

  // Auto-scroll on turns update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.turns, isGenerating]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // Handle Title change
  const handleTitleChange = (newTitle: string) => {
    onUpdateEntry({
      ...entry,
      title: newTitle,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handle Mode change
  const handleModeChange = (mode: ReflectionMode) => {
    onUpdateEntry({
      ...entry,
      mode,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handle Manual Mood change (Overrides auto-detection until toggled back)
  const handleManualMoodChange = (mood: MoodType) => {
    setIsAutoMoodEnabled(false);
    onUpdateEntry({
      ...entry,
      mood,
      moodLocked: true,
      moodReason: 'Manually chosen by user',
      updatedAt: new Date().toISOString(),
    });
  };

  // Resume Auto-Detection
  const handleResumeAutoMood = () => {
    setIsAutoMoodEnabled(true);
    onUpdateEntry({
      ...entry,
      moodLocked: false,
      updatedAt: new Date().toISOString(),
    });
    // Immediately re-evaluate mood from existing conversation
    if (entry.turns.length > 0) {
      evaluateDynamicMood(entry.turns, entry.mood);
    }
  };

  // Tag management
  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || entry.tags?.includes(trimmed)) return;
    onUpdateEntry({
      ...entry,
      tags: [...(entry.tags || []), trimmed],
      updatedAt: new Date().toISOString(),
    });
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateEntry({
      ...entry,
      tags: (entry.tags || []).filter((t) => t !== tagToRemove),
      updatedAt: new Date().toISOString(),
    });
  };

  // Copy turn to clipboard
  const handleCopyTurn = (turnId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedTurnId(turnId);
    setTimeout(() => setCopiedTurnId(null), 2000);
  };

  // Export full reflection
  const handleExportMarkdown = () => {
    const transcript = `# ${entry.title || 'Journal Reflection'}\n` +
      `Date: ${new Date(entry.createdAt).toLocaleDateString()}\n` +
      `Mode: ${entry.mode}\n` +
      `Mood: ${entry.mood || 'N/A'}\n` +
      `Tags: ${(entry.tags || []).join(', ')}\n\n` +
      (entry.summary ? `## Summary\n${entry.summary}\n\n` : '') +
      `## Dialogue\n` +
      entry.turns
        .map(
          (t) =>
            `### ${t.role === 'user' ? 'Me' : 'Gemini AI'}\n${t.content}\n`
        )
        .join('\n');

    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(entry.title || 'reflection').toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Send turn to Gemini server-side endpoint
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isGenerating) return;

    setGenerationError(null);
    setIsGenerating(true);

    const userTurn: JournalTurn = {
      id: `turn-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    // Update optimistic entry state
    const updatedTurns = [...entry.turns, userTurn];
    
    // Auto-update title if it's default
    let updatedTitle = entry.title;
    if (
      (!updatedTitle || updatedTitle === 'Untitled Reflection' || updatedTitle === 'New Reflection') &&
      entry.turns.length === 0
    ) {
      updatedTitle = text.slice(0, 45).replace(/[#*`\n]/g, '') + (text.length > 45 ? '...' : '');
    }

    const optimisticEntry: JournalEntry = {
      ...entry,
      title: updatedTitle,
      turns: updatedTurns,
      updatedAt: new Date().toISOString(),
    };

    onUpdateEntry(optimisticEntry);
    setInputText('');

    try {
      // Call secure Express backend route
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-uid': entry.userId || '',
        },
        body: JSON.stringify({
          mode: entry.mode,
          turns: updatedTurns.map((t) => ({ role: t.role, content: t.content })),
          context: {
            mood: entry.mood,
            tags: entry.tags,
            title: updatedTitle,
          },
          entryId: entry.id,
          pastEntries: (allEntries || [])
            .filter((e) => e.id !== entry.id && e.date !== entry.date && !e.isDeleted)
            .map((e) => ({
              id: e.id,
              date: e.date,
              title: e.title,
              summary: e.summary,
              mood: e.mood,
              tags: e.tags,
              embedding: e.embedding,
            })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error(errData.error || 'Please slow down: AI request rate limit reached. Please wait a moment.');
        }
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();

      const geminiTurn: JournalTurn = {
        id: `turn-gemini-${Date.now()}`,
        role: 'gemini',
        content: data.reply || 'I hear you. Let us explore this deeper.',
        timestamp: new Date().toISOString(),
        musicSuggestion: data.musicSuggestion || undefined,
        retrievedPastEntries: Array.isArray(data.retrievedPastEntries) ? data.retrievedPastEntries : undefined,
      };

      // Determine updated mood dynamically from Gemini's sentiment evaluation
      let nextMood = entry.mood;
      let nextReason = entry.moodReason;

      if (isAutoMoodEnabled && data.detectedMood) {
        if (data.detectedMood !== entry.mood) {
          triggerMoodNotice(data.detectedMood, entry.mood, data.moodReason);
        }
        nextMood = data.detectedMood;
        nextReason = data.moodReason;
      }

      const finalEntry: JournalEntry = {
        ...optimisticEntry,
        mood: nextMood,
        moodReason: nextReason,
        turns: [...updatedTurns, geminiTurn],
        updatedAt: new Date().toISOString(),
      };

      onUpdateEntry(finalEntry);
      
      // Asynchronously refresh vector embedding for semantic search in the background
      generateAndAttachEmbedding(finalEntry);

      if (Array.isArray(data.suggestedPrompts)) {
        setSuggestedPrompts(data.suggestedPrompts);
      }
    } catch (err: any) {
      console.error('Error generating AI reflection:', err);
      setGenerationError(err?.message || 'Failed to receive response from Gemini. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AnimatedBackground
      driver={activeDriver}
      mood={entry.mood || 'peaceful'}
      weather={weatherData}
      showIndicatorBadge={false}
      onToggleDriver={onToggleDriver}
    >
      <div className="flex-1 flex flex-col h-[calc(100vh-57px)] overflow-hidden text-[#1A1A1A]">
        {/* Floating Journaling Desk with Generous Ambient Canvas Margins */}
        <div className="mx-auto max-w-4xl w-full px-4 sm:px-6 md:px-8 py-4 sm:py-6 flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col rounded-2xl border border-[#E6E2D3]/90 bg-[#FDFCF9]/82 backdrop-blur-md shadow-md overflow-hidden min-h-0">
            {/* Editor Header: Title, Modes, Mood, Actions */}
            <div className="border-b border-[#E6E2D3]/80 bg-[#FDFCF9]/85 backdrop-blur-md px-4 sm:px-6 py-3 space-y-2.5 shadow-2xs z-10">
        {/* Title and Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {onBackToCalendar && (
              <button
                id="btn-editor-back-to-calendar"
                onClick={onBackToCalendar}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-serif font-semibold text-[#4A5D4E] bg-[#F0ECE1] hover:bg-[#EBE7DE] rounded-lg border border-[#DCD7C5] transition-all shrink-0"
                title="Return to Calendar"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Calendar</span>
              </button>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#F0ECE1] px-2 py-0.5 text-[11px] font-medium text-[#4A5D4E] border border-[#E6E2D3]">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{entry.date || entry.id}</span>
                </span>
                <input
                  id="input-entry-title"
                  type="text"
                  maxLength={120}
                  value={entry.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Name this reflection session..."
                  className="w-full text-base sm:text-lg font-serif font-semibold text-[#1A1A1A] placeholder-[#9C988B] bg-transparent border-none p-0 focus:outline-none focus:ring-0 truncate"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Synthesize / Summary Action */}
            <button
              id="btn-synthesize-entry"
              onClick={() => onSummarize(entry)}
              disabled={isSummarizing || entry.turns.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD7C5] bg-[#F0ECE1] px-3.5 py-1.5 text-xs font-semibold text-[#4A5D4E] hover:bg-[#EBE7DE] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs"
              title="Generate AI executive summary and action items"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4A5D4E]" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-[#4A5D4E]" />
                  <span>Synthesize Insights</span>
                </>
              )}
            </button>

            {/* View Summary Modal if exists */}
            {entry.summary && (
              <button
                id="btn-view-summary"
                onClick={onOpenSummaryModal}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E6E2D3] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#F9F7F0] transition-colors shadow-2xs"
                title="View synthesized takeaways"
              >
                <BookMarked className="h-3.5 w-3.5 text-[#4A5D4E]" />
                <span className="hidden sm:inline">Takeaways</span>
              </button>
            )}

            {/* Spotify Companion Button */}
            {onOpenSpotifyModal && (
              <button
                id="btn-spotify-settings"
                onClick={onOpenSpotifyModal}
                className="p-1.5 text-[#7C786A] hover:text-[#1DB954] hover:bg-[#F0ECE1] rounded-lg transition-colors cursor-pointer"
                title="Mood Music Companion (Spotify & Gemini Tool Telemetry)"
              >
                <Disc3 className="h-4 w-4" />
              </button>
            )}

            {/* Shareable Reflection Card Button */}
            <button
              id="btn-share-reflection-card"
              onClick={() => {
                setShareExcerpt(undefined);
                setIsShareModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD7C5] bg-[#FAF3E1] px-2.5 py-1.5 text-xs font-serif font-semibold text-[#111111] hover:bg-[#F5E7C6] transition-all shadow-2xs cursor-pointer"
              title="Generate a private, shareable reflection card (client-side)"
            >
              <Share2 className="h-3.5 w-3.5 text-[#FA8112]" />
              <span className="hidden md:inline">Share Card</span>
            </button>

            {/* Export Markdown */}
            <button
              id="btn-export-entry"
              onClick={handleExportMarkdown}
              className="p-1.5 text-[#7C786A] hover:text-[#1A1A1A] hover:bg-[#F0ECE1] rounded-lg transition-colors cursor-pointer"
              title="Export as Markdown file"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* Move to Recently Deleted */}
            {onDeleteEntry && (
              <button
                id="btn-delete-editor-entry"
                onClick={() => setIsConfirmingDelete(true)}
                className="p-1.5 text-[#7C786A] hover:text-[#9E3636] hover:bg-[#FDF2F2] rounded-lg transition-colors cursor-pointer"
                title="Move reflection to Recently Deleted (15-day recovery)"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Reflection Mode Chips & Mood Picker */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Mode Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[#7C786A] mr-1 hidden sm:inline">Mode:</span>
            {MODES.map((m) => {
              const isActive = entry.mode === m.id;
              return (
                <button
                  key={m.id}
                  id={`btn-mode-${m.id}`}
                  onClick={() => handleModeChange(m.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#4A5D4E] text-[#FDFCF9] shadow-2xs'
                      : 'bg-[#F0ECE1] text-[#7C786A] hover:bg-[#EBE7DE] hover:text-[#1A1A1A]'
                  }`}
                  title={m.desc}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mood Controller & Tags */}
          <div className="flex items-center gap-2">
            {/* Dynamic Mood Selector with Agentic State Indicator */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <select
                  id="select-entry-mood"
                  value={entry.mood || 'peaceful'}
                  onChange={(e) => handleManualMoodChange(e.target.value as MoodType)}
                  className="appearance-none rounded-lg border border-[#E6E2D3] bg-[#F9F7F0] pl-7 pr-6 py-1 text-xs font-medium text-[#1A1A1A] focus:border-[#4A5D4E] focus:bg-[#FFFFFF] focus:outline-none cursor-pointer"
                  title={isAutoMoodEnabled ? 'Auto-adapting to conversation (change to lock manually)' : 'Manual override active'}
                >
                  {MOODS.map((mood) => (
                    <option key={mood.id} value={mood.id}>
                      {mood.emoji} {mood.label}
                    </option>
                  ))}
                </select>
                <Smile className="pointer-events-none absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9C988B]" />
              </div>

              {/* Auto-Detection Status Pill & Toggle */}
              {isAutoMoodEnabled ? (
                <span 
                  className="inline-flex items-center gap-1 rounded-md bg-[#EBF3ED] px-2 py-0.5 text-[10px] font-medium text-[#2E6B3E] border border-[#CDE3D2]"
                  title="AI companion continuously senses mood shifts from your conversation"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2E6B3E] animate-pulse" />
                  <span>Auto-sensing</span>
                </span>
              ) : (
                <button
                  onClick={handleResumeAutoMood}
                  className="inline-flex items-center gap-1 rounded-md bg-[#F0ECE1] hover:bg-[#E6E0D0] px-2 py-0.5 text-[10px] font-medium text-[#7C786A] hover:text-[#1A1A1A] border border-[#DCD7C5] transition-all cursor-pointer"
                  title="Click to resume real-time AI mood adaptation"
                >
                  <span>🔒 Manual</span>
                  <span className="text-[#4A5D4E] font-semibold underline ml-0.5">Resume AI</span>
                </button>
              )}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1">
              {(entry.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-[#F0ECE1] px-2 py-0.5 text-[11px] font-medium text-[#4A5D4E] border border-[#E6E2D3]"
                >
                  <span>#{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-[#9C988B] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}

              {showTagInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    maxLength={30}
                    placeholder="Tag..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag(newTagInput);
                      if (e.key === 'Escape') setShowTagInput(false);
                    }}
                    autoFocus
                    className="w-20 rounded-md border border-[#E6E2D3] bg-white px-2 py-0.5 text-[11px] text-[#1A1A1A] focus:outline-none focus:border-[#4A5D4E]"
                  />
                  <button
                    onClick={() => handleAddTag(newTagInput)}
                    className="p-0.5 text-[#7C786A] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#DCD7C5] px-2 py-0.5 text-[11px] text-[#7C786A] hover:text-[#1A1A1A] hover:border-[#4A5D4E] cursor-pointer"
                >
                  <TagIcon className="h-2.5 w-2.5" />
                  <span>+Tag</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Mood Shift Notice Toast */}
      {moodUpdateNotice && (
        <div className="mx-4 sm:mx-6 mt-2.5 flex items-center justify-between rounded-xl border border-[#4A5D4E]/30 bg-[#FFFFFF]/90 backdrop-blur-md px-3.5 py-2 text-xs text-[#1A1A1A] shadow-sm animate-fade-in transition-all">
          <div className="flex items-center gap-2">
            <span className="text-base">{MOODS.find((m) => m.id === moodUpdateNotice.mood)?.emoji}</span>
            <div className="font-serif">
              <span className="font-semibold text-[#4A5D4E]">
                Ambiance adapted to {MOODS.find((m) => m.id === moodUpdateNotice.mood)?.label}
              </span>
              {moodUpdateNotice.reason && (
                <span className="text-[#666255] ml-1.5 text-[11px]">
                  ({moodUpdateNotice.reason})
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setMoodUpdateNotice(null)}
            className="text-[#9C988B] hover:text-[#1A1A1A] text-[11px] px-1 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Summary Highlight Box if already synthesized */}
      {entry.summary && (
        <div className="mx-4 sm:mx-6 mt-3 rounded-xl border border-[#DCD7C5] bg-[#F9F7F0] p-3.5 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-[#4A5D4E] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-serif font-semibold text-[#1A1A1A]">
                Synthesized Key Takeaways
              </p>
              <p className="text-xs text-[#7C786A] mt-0.5 line-clamp-2 leading-relaxed">
                {entry.summary}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSummaryModal}
            className="text-xs font-medium text-[#4A5D4E] hover:text-[#3C4C3F] underline shrink-0 cursor-pointer"
          >
            View Details
          </button>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {entry.turns.length === 0 ? (
          /* Empty State Spark Questions */
          <div className="mx-auto max-w-2xl py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0ECE1] text-[#4A5D4E] mb-3 border border-[#E6E2D3]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-serif font-medium text-[#1A1A1A]">
              Begin your reflection
            </h3>
            <p className="mt-1.5 text-xs text-[#7C786A] max-w-md mx-auto leading-relaxed">
              Write freely about your day, a dilemma, or an ambition. Gemini will actively listen, reframe, and guide your thinking.
            </p>

            {/* Spark Prompts */}
            <div className="mt-6 text-left">
              <p className="text-xs font-serif italic text-[#7C786A] mb-2.5">
                Suggested Reflection Sparks:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {(SPARK_PROMPTS[entry.mode] || SPARK_PROMPTS.reflect).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="flex items-center justify-between rounded-xl border border-[#E6E2D3] bg-[#FFFFFF]/85 backdrop-blur-md p-3.5 text-xs text-[#1A1A1A] shadow-2xs hover:border-[#4A5D4E] hover:bg-[#F9F7F0]/95 transition-all text-left group"
                  >
                    <span className="font-serif leading-relaxed text-[13px]">{prompt}</span>
                    <Sparkles className="h-3.5 w-3.5 text-[#9C988B] group-hover:text-[#4A5D4E] shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Turns Stream */
          entry.turns.map((turn) => {
            const isUser = turn.role === 'user';
            const isCopied = copiedTurnId === turn.id;

            return (
              <div
                key={turn.id}
                className={`flex gap-3 max-w-3xl ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold shadow-2xs ${
                    isUser
                      ? 'bg-[#1A1A1A] text-[#FDFCF9]'
                      : 'bg-[#4A5D4E] text-[#FDFCF9]'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`group relative rounded-2xl p-4.5 text-xs sm:text-sm ${
                    isUser
                      ? 'bg-[#1A1A1A] text-[#FDFCF9] max-w-xl shadow-md'
                      : 'bg-[#FFFFFF]/85 backdrop-blur-md border border-[#E6E2D3]/90 text-[#1A1A1A] max-w-2xl shadow-sm'
                  }`}
                >
                  {/* Top Meta Bar for Gemini */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#E6E2D3]/80 text-[11px] text-[#7C786A]">
                      <span className="font-medium text-[#4A5D4E] flex items-center gap-1 font-serif">
                        <Sparkles className="h-3 w-3" />
                        <span>Gemini 3.6 Flash</span>
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleShareTurn(turn.content)}
                          className="inline-flex items-center gap-1 p-1 text-[#9C988B] hover:text-[#FA8112] rounded transition-all cursor-pointer"
                          title="Share as Quote Card"
                        >
                          <Share2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleCopyTurn(turn.id, turn.content)}
                          className="inline-flex items-center gap-1 p-1 text-[#9C988B] hover:text-[#1A1A1A] rounded transition-all cursor-pointer"
                          title="Copy text"
                        >
                          {isCopied ? (
                            <Check className="h-3 w-3 text-[#4A5D4E]" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Body Content */}
                  {isUser ? (
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-[#9C988B] font-serif">Reflection</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleShareTurn(turn.content)}
                            className="p-1 text-[#9C988B] hover:text-[#FA8112] rounded transition-colors cursor-pointer"
                            title="Share as Quote Card"
                          >
                            <Share2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleCopyTurn(turn.id, turn.content)}
                            className="p-1 text-[#9C988B] hover:text-[#FDFCF9] rounded transition-colors cursor-pointer"
                            title="Copy text"
                          >
                            {isCopied ? (
                              <Check className="h-3 w-3 text-[#4A5D4E]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-[13px] sm:text-sm font-sans">{turn.content}</p>
                    </div>
                  ) : (
                    <div className="prose-xs text-[#1A1A1A] leading-relaxed space-y-2.5 font-serif text-[14px] sm:text-[15px] [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-[#1A1A1A] [&_code]:bg-[#F0ECE1] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_h3]:font-serif [&_h3]:font-bold [&_h3]:text-[#1A1A1A] [&_h3]:mt-2">
                      <Markdown
                        components={{
                          a: ({ href, children, ...props }) => {
                            const isSafe = href && /^https?:\/\//i.test(href);
                            if (!isSafe) {
                              return <span>{children}</span>;
                            }
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#4A5D4E] underline hover:text-[#3C4C3F]"
                                {...props}
                              >
                                {children}
                              </a>
                            );
                          },
                        }}
                      >
                        {turn.content}
                      </Markdown>
                    </div>
                  )}

                  {/* Agentic Spotify Music Suggestion Card */}
                  {!isUser && turn.musicSuggestion && (
                    <SpotifyMusicCard suggestion={turn.musicSuggestion} />
                  )}

                  {/* RAG Retrieved Memories Indicator */}
                  {!isUser && turn.retrievedPastEntries && turn.retrievedPastEntries.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#E6E2D3]/80">
                      <div className="flex items-center gap-1.5 text-[11px] font-serif text-[#7C786A] mb-1.5">
                        <Sparkles className="h-3 w-3 text-[#4A5D4E]" />
                        <span className="font-semibold text-[#1A1A1A]">Connected Past Reflections:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {turn.retrievedPastEntries.map((pe) => (
                          <button
                            key={pe.id}
                            type="button"
                            onClick={() => onNavigateToEntry ? onNavigateToEntry(pe.date) : undefined}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F4F0E6] hover:bg-[#EBE5D5] text-[#2C3E2D] border border-[#E0DBCB] text-[11px] font-sans transition-all cursor-pointer group/rag"
                            title={`Click to open reflection from ${pe.date}: "${pe.title}" (${Math.round(pe.score * 100)}% match)`}
                          >
                            <CalendarIcon className="h-3 w-3 text-[#7C786A] group-hover/rag:text-[#4A5D4E]" />
                            <span className="font-medium">{pe.date}</span>
                            <span className="text-[#8C8779] truncate max-w-[120px]">• {pe.title}</span>
                            <span className="text-[10px] text-[#4A5D4E] font-semibold bg-[#E4DECE] px-1 rounded">
                              {Math.round(pe.score * 100)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`mt-2 text-[10px] ${
                      isUser ? 'text-[#9C988B] text-right' : 'text-[#9C988B]'
                    }`}
                  >
                    {new Date(turn.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator for Gemini */}
        {isGenerating && (
          <div className="flex gap-3 max-w-2xl mr-auto">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#4A5D4E] text-[#FDFCF9] shadow-2xs">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl border border-[#E6E2D3]/90 bg-[#FFFFFF]/85 backdrop-blur-md p-4 text-xs text-[#7C786A] shadow-sm flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-[#4A5D4E]" />
              <span className="font-serif italic text-[#1A1A1A]">Gemini is reflecting on your thoughts...</span>
            </div>
          </div>
        )}

        {/* Suggested Prompts Follow-up Chips */}
        {suggestedPrompts.length > 0 && !isGenerating && (
          <div className="pt-2 max-w-3xl">
            <p className="text-[11px] font-serif italic text-[#7C786A] mb-2">
              Follow-up Inquiries:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p)}
                  className="rounded-lg border border-[#E6E2D3]/90 bg-[#FFFFFF]/85 backdrop-blur-md px-3.5 py-1.5 text-xs text-[#4A5D4E] hover:bg-[#F0ECE1] shadow-2xs transition-all text-left font-serif cursor-pointer"
                >
                  <span>💭 {p}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {generationError && (
          <div className="rounded-xl border border-[#F5CACA] bg-[#FDF2F2]/95 backdrop-blur-md p-3.5 text-xs text-[#9E3636] flex items-start gap-2 shadow-2xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#9E3636]" />
            <div className="flex-1">
              <p className="font-semibold">Reflection Generation Notice:</p>
              <p className="mt-0.5 text-[#9E3636]">{generationError}</p>
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="text-xs font-semibold text-[#9E3636] underline hover:text-[#852828] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[#E6E2D3]/80 bg-[#FDFCF9]/85 backdrop-blur-md p-3 sm:p-4 shadow-sm">
        <div className="mx-auto max-w-3xl">
          {/* Active Listening Visual Banner */}
          {isListening && (
            <div className="mb-2 flex items-center justify-between rounded-xl border border-[#FA8112]/40 bg-[#FAF3E1] px-3 py-2 text-xs text-[#994500] shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FA8112] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FA8112]"></span>
                </span>
                <span className="font-serif font-medium">Listening... Speak your reflection. Tap Stop when finished.</span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-serif font-bold bg-[#FA8112] text-white rounded-lg hover:bg-[#E0720D] transition-colors cursor-pointer"
              >
                <MicOff className="h-3 w-3" />
                <span>Stop</span>
              </button>
            </div>
          )}

          {/* Speech Error Banner */}
          {speechError && (
            <div className="mb-2 flex items-center justify-between rounded-xl border border-[#F5CACA] bg-[#FDF2F2] px-3 py-2 text-xs text-[#9E3636] shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#9E3636]" />
                <span className="font-serif">{speechError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSpeechError(null)}
                className="text-[#9E3636] hover:text-[#852828] p-1 cursor-pointer"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="relative flex items-end gap-2 rounded-2xl border border-[#DCD7C5] bg-[#FFFFFF] p-2.5 shadow-2xs focus-within:border-[#4A5D4E] focus-within:ring-1 focus-within:ring-[#4A5D4E]/30">
            <textarea
              ref={textareaRef}
              id="textarea-reflection-input"
              rows={2}
              maxLength={4000}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Write or speak your thought, challenge, or reflection... (Press ${
                navigator.platform?.includes('Mac') ? '⌘+Enter' : 'Ctrl+Enter'
              } to send)`}
              className="w-full resize-none border-none bg-transparent p-1.5 text-xs sm:text-sm text-[#1A1A1A] placeholder-[#9C988B] focus:outline-none focus:ring-0 max-h-44"
            />

            {/* Voice Input Microphone Button */}
            {isSpeechSupported ? (
              <button
                type="button"
                id="btn-voice-reflection"
                onClick={toggleListening}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all cursor-pointer ${
                  isListening
                    ? 'bg-[#FA8112] text-white shadow-md animate-pulse'
                    : 'bg-[#F0ECE1] text-[#7C786A] hover:text-[#FA8112] hover:bg-[#EAE5D8] border border-[#DCD7C5]'
                }`}
                title={isListening ? 'Stop recording voice reflection' : 'Speak reflection with voice input (Web Speech API)'}
              >
                {isListening ? (
                  <Mic className="h-4 w-4 animate-bounce" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0ECE1]/60 text-[#B8B4A6] border border-[#E6E2D3] cursor-not-allowed opacity-60"
                title="Voice input is not supported in this browser (Web Speech API unavailable)"
              >
                <MicOff className="h-4 w-4" />
              </button>
            )}

            <button
              id="btn-send-reflection"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isGenerating}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4A5D4E] text-[#FDFCF9] shadow-2xs hover:bg-[#3C4C3F] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Send to Gemini"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-[#7C786A] px-1">
            <span>
              {entry.mode === 'reflect'
                ? '💡 Socratic inquiry mode active'
                : `💡 ${entry.mode} mode active`}
            </span>
            <span>Press Cmd+Enter to send</span>
          </div>
        </div>
      </div>
          </div>
        </div>
      </div>

      {/* Soft Delete Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#E6E2D3] bg-[#FDFCF9] p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF2F2] text-[#9E3636] border border-[#F5CACA] shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Move Reflection to Trash?
                </h3>
                <p className="text-xs text-[#7C786A] font-serif">
                  Date: <span className="font-semibold text-[#1A1A1A]">{entry.date || entry.id}</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#FAF9F5] border border-[#E6E2D3] p-3 text-xs text-[#7C786A] leading-relaxed flex items-start gap-2 font-serif">
              <Clock className="h-4 w-4 text-[#4A5D4E] shrink-0 mt-0.5" />
              <span>
                This reflection will be moved to <strong className="text-[#1A1A1A]">Recently Deleted</strong>. You can retrieve it anytime within <strong className="text-[#1A1A1A]">15 days</strong> from the side menu.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E2D3]">
              <button
                id="btn-cancel-editor-delete"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-3 py-1.5 rounded-lg bg-[#F0ECE1] text-xs font-semibold text-[#7C786A] hover:bg-[#E5DFD1] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-editor-delete"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  if (onDeleteEntry) {
                    onDeleteEntry(entry.date || entry.id);
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#9E3636] text-xs font-semibold text-[#FFFFFF] hover:bg-[#852828] transition-colors cursor-pointer shadow-2xs"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shareable Reflection Card Modal */}
      <ShareableCardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        entry={entry}
        initialExcerpt={shareExcerpt}
      />
  </AnimatedBackground>
);
};
