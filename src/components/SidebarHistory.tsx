import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Trash2, 
  Calendar, 
  Sparkles, 
  Tag, 
  Plus, 
  ChevronRight, 
  MessageSquare,
  X,
  Compass
} from 'lucide-react';
import type { JournalEntry, ReflectionMode, MoodType } from '../types';

interface SidebarHistoryProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onNewEntry: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const MODE_LABELS: Record<ReflectionMode, { label: string; color: string }> = {
  reflect: { label: 'Reflection', color: 'bg-[#F0ECE1] text-[#4A5D4E] border-[#DCD7C5]' },
  brainstorm: { label: 'Brainstorm', color: 'bg-[#FDF7E7] text-[#996515] border-[#EEDB9F]' },
  summarize: { label: 'Synthesis', color: 'bg-[#EBF3ED] text-[#2D5A38] border-[#CFE2D4]' },
  deep_inquiry: { label: 'Inquiry', color: 'bg-[#F5F0F7] text-[#5F3B6E] border-[#E2D5E6]' },
  gratitude: { label: 'Gratitude', color: 'bg-[#FAF0ED] text-[#8C4332] border-[#EED7D1]' },
  problem_solving: { label: 'Problem Solving', color: 'bg-[#EDF4F7] text-[#2B566B] border-[#D1E3EA]' },
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

export const SidebarHistory: React.FC<SidebarHistoryProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onDeleteEntry,
  onNewEntry,
  isOpenMobile,
  onCloseMobile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Filter entries
  const activeEntries = useMemo(() => {
    return entries.filter((e) => !e.isDeleted);
  }, [entries]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    activeEntries.forEach((e) => {
      e.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [activeEntries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return activeEntries.filter((entry) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.turns.some((t) => t.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (entry.summary && entry.summary.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = !selectedTag || entry.tags?.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [activeEntries, searchQuery, selectedTag]);

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return 'Recent';
    }
  };

  const handleConfirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteEntry(id);
    setEntryToDelete(null);
  };

  const content = (
    <div className="flex h-full flex-col bg-[#F9F7F0]/85 backdrop-blur-md border-r border-[#E6E2D3]">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#E6E2D3] bg-[#FDFCF9]/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#7C786A]" />
            <h2 className="text-sm font-serif font-semibold text-[#1A1A1A]">
              Past Reflections ({activeEntries.length})
            </h2>
          </div>
          {isOpenMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-[#7C786A] hover:text-[#1A1A1A] rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9C988B]" />
          <input
            id="input-search-history"
            type="text"
            placeholder="Search past thoughts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#E6E2D3] bg-[#F9F7F0] pl-8 pr-3 py-1.5 text-xs text-[#1A1A1A] placeholder-[#9C988B] focus:border-[#4A5D4E] focus:bg-[#FFFFFF] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-[#9C988B] hover:text-[#1A1A1A]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tag Filter Pills */}
        {allTags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1 max-h-16 overflow-y-auto no-scrollbar">
            {allTags.map((tag) => {
              const active = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(active ? null : tag)}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                    active
                      ? 'bg-[#4A5D4E] text-[#FDFCF9] border-[#4A5D4E]'
                      : 'bg-[#FFFFFF] text-[#7C786A] border-[#E6E2D3] hover:bg-[#F0ECE1]'
                  }`}
                >
                  <Tag className="h-2.5 w-2.5" />
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-[#7C786A]">
            <Compass className="h-8 w-8 text-[#DCD7C5] mb-2" />
            <p className="text-xs font-serif font-medium text-[#1A1A1A]">
              {searchQuery || selectedTag ? 'No matching reflections' : 'No reflections yet'}
            </p>
            <p className="mt-1 text-[11px] text-[#7C786A] max-w-[180px]">
              {searchQuery || selectedTag 
                ? 'Try adjusting your search query or tag filters.'
                : 'Start your first guided journaling session with Gemini.'}
            </p>
            {!searchQuery && !selectedTag && (
              <button
                id="btn-sidebar-first-entry"
                onClick={onNewEntry}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#4A5D4E] hover:text-[#3C4C3F] underline"
              >
                <Plus className="h-3 w-3" />
                <span>Create First Entry</span>
              </button>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = selectedEntryId === entry.id;
            const modeInfo = MODE_LABELS[entry.mode] || MODE_LABELS.reflect;
            const moodEmoji = entry.mood ? MOOD_EMOJIS[entry.mood] : null;
            const isConfirmingDelete = entryToDelete === entry.id;

            return (
              <div
                key={entry.id}
                id={`journal-item-${entry.id}`}
                onClick={() => {
                  onSelectEntry(entry);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`group relative rounded-xl p-3 text-left transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#FFFFFF] border-[#4A5D4E] shadow-2xs ring-1 ring-[#4A5D4E]/30'
                    : 'bg-[#FDFCF9]/90 border-[#E6E2D3] hover:bg-[#FFFFFF] hover:border-[#DCD7C5]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {moodEmoji && <span className="text-xs shrink-0">{moodEmoji}</span>}
                    <h3 className="text-xs font-serif font-semibold text-[#1A1A1A] truncate">
                      {entry.title || 'Untitled Reflection'}
                    </h3>
                  </div>

                  <span className="text-[10px] text-[#9C988B] shrink-0 font-sans">
                    {formatDate(entry.updatedAt || entry.createdAt)}
                  </span>
                </div>

                {/* Subtitle / Preview */}
                <p className="mt-1 text-[11px] text-[#7C786A] line-clamp-2 leading-relaxed">
                  {entry.summary ||
                    (entry.turns.length > 0
                      ? entry.turns[entry.turns.length - 1].content
                      : 'No dialogue yet...')}
                </p>

                {/* Bottom Meta Bar */}
                <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 border-t border-[#E6E2D3]/60">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${modeInfo.color}`}
                    >
                      {modeInfo.label}
                    </span>

                    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#9C988B]">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {entry.turns.length}
                    </span>
                  </div>

                  {/* Delete button or confirmation */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-[#FDF2F2] p-1 rounded border border-[#F5CACA] text-[10px]">
                        <span className="text-[#9E3636] font-medium">Delete?</span>
                        <button
                          onClick={(e) => handleConfirmDelete(e, entry.id)}
                          className="px-1 py-0.5 bg-[#9E3636] text-white rounded font-medium hover:bg-[#852828]"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setEntryToDelete(null)}
                          className="px-1 py-0.5 bg-[#E6E2D3] text-[#1A1A1A] rounded hover:bg-[#DCD7C5]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`btn-delete-entry-${entry.id}`}
                        onClick={() => setEntryToDelete(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#9C988B] hover:text-[#9E3636] hover:bg-[#FDF2F2] rounded transition-all"
                        title="Delete reflection"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-80 shrink-0 h-[calc(100vh-57px)]">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col z-50">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
