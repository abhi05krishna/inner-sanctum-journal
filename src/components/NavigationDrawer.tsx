import React, { useEffect, useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  LogOut, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Lock, 
  Database, 
  KeyRound,
  CheckCircle2,
  ChevronRight,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  ChevronDown,
  Disc3,
  Music,
  Layers,
  Building2,
  UserPlus,
  Compass
} from 'lucide-react';
import type { UserProfile, AppView, JournalEntry, Organization, OrgMember } from '../types';

const MAX_RETENTION_DAYS = 15;

export function getDaysRemaining(deletedAt?: string | null): number {
  if (!deletedAt) return MAX_RETENTION_DAYS;
  const deletedTime = new Date(deletedAt).getTime();
  if (isNaN(deletedTime)) return MAX_RETENTION_DAYS;
  const msElapsed = Date.now() - deletedTime;
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
  return Math.max(0, MAX_RETENTION_DAYS - daysElapsed);
}

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  entryCount: number;
  deletedEntries?: JournalEntry[];
  onSignOut: () => void;
  onOpenSecurityModal: () => void;
  onNavigateView: (view: AppView) => void;
  onOpenToday?: () => void;
  onRestoreEntry?: (dateKey: string) => void;
  onPermanentDeleteEntry?: (dateKey: string) => void;
  onEmptyTrash?: () => void;
  onOpenSpotifyModal?: () => void;
  onOpenWeeklyReview?: () => void;
  organization?: Organization | null;
  userOrgMember?: OrgMember | null;
  onOpenOrgDisclosure?: () => void;
  onOpenOrgAdmin?: () => void;
  onOpenJoinOrg?: () => void;
  onOpenOnboarding?: () => void;
  currentView: AppView;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  user,
  entryCount,
  deletedEntries = [],
  onSignOut,
  onOpenSecurityModal,
  onNavigateView,
  onOpenToday,
  onRestoreEntry,
  onPermanentDeleteEntry,
  onEmptyTrash,
  onOpenSpotifyModal,
  onOpenWeeklyReview,
  organization,
  userOrgMember,
  onOpenOrgDisclosure,
  onOpenOrgAdmin,
  onOpenJoinOrg,
  onOpenOnboarding,
  currentView,
}) => {
  const [isTrashOpen, setIsTrashOpen] = useState(true);
  const [confirmPermanentDate, setConfirmPermanentDate] = useState<string | null>(null);

  // Listen for Escape key to close the drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open on mobile
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

  const handleSelectNav = (view: AppView) => {
    onNavigateView(view);
    onClose();
  };

  const handleOpenTodayClick = () => {
    onClose();
    if (onOpenToday) {
      onOpenToday();
    }
  };

  const handleOpenSecurity = () => {
    onClose();
    onOpenSecurityModal();
  };

  const handleLogoutClick = () => {
    onClose();
    onSignOut();
  };

  const handleRestore = (dateKey: string) => {
    if (onRestoreEntry) {
      onRestoreEntry(dateKey);
    }
  };

  const handlePermanentDelete = (dateKey: string) => {
    if (onPermanentDeleteEntry) {
      onPermanentDeleteEntry(dateKey);
      setConfirmPermanentDate(null);
    }
  };

  return (
    <>
      {/* Dimmed Background Scrim / Overlay */}
      <div
        id="drawer-scrim-overlay"
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-Out Side Drawer (Left) */}
      <aside
        id="side-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation and Account Menu"
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 sm:w-92 max-w-[88vw] bg-[#FAF3E1] border-r border-[#E5D8B8] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out text-[#222222] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5D8B8] bg-[#F5E7C6]/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FA8112] text-white shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-semibold text-[#222222]">
                Inner Sanctum
              </h2>
              <p className="text-[10px] text-[#5C5549] font-serif">
                Account & Mindful Organizer
              </p>
            </div>
          </div>

          <button
            id="btn-close-drawer"
            onClick={onClose}
            className="p-1.5 text-[#5C5549] hover:text-[#222222] hover:bg-[#EBDAB3] rounded-lg transition-colors cursor-pointer"
            title="Close menu (Esc)"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* User Profile Section */}
          {user && (
            <div className="rounded-2xl border border-[#E5D8B8] bg-[#F5E7C6]/60 p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User Profile'}
                    className="h-11 w-11 rounded-full border border-[#E5D8B8] object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FA8112] text-sm font-serif font-bold text-white shrink-0">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-serif font-semibold text-[#222222] truncate">
                    {user.displayName || 'Authenticated User'}
                  </div>
                  <div className="text-[11px] text-[#5C5549] truncate">
                    {user.email || 'Google Account'}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[#FA8112] font-semibold">
                    <CheckCircle2 className="h-3 w-3 text-[#FA8112]" />
                    <span>Federated Auth Active</span>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="pt-2 border-t border-[#E5D8B8] flex items-center justify-between text-xs text-[#5C5549]">
                <span>Active Reflections:</span>
                <span className="font-semibold text-[#222222]">
                  {entryCount} {entryCount === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          )}

          {/* Quick Navigation Section */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-serif font-semibold text-[#5C5549] tracking-wider uppercase">
              Navigation
            </h3>
            <div className="space-y-1">
              <button
                id="btn-drawer-calendar"
                onClick={() => handleSelectNav('calendar')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  currentView === 'calendar'
                    ? 'bg-[#FA8112] text-white border-[#FA8112] shadow-2xs'
                    : 'bg-[#F5E7C6] text-[#222222] border-[#E5D8B8] hover:bg-[#EBDAB3]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Calendar Overview</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              </button>

              {/* Reflection Universe View */}
              <button
                id="btn-drawer-universe"
                onClick={() => handleSelectNav('universe')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  currentView === 'universe'
                    ? 'bg-[#4A5D4E] text-white border-[#4A5D4E] shadow-2xs'
                    : 'bg-[#F5E7C6] text-[#222222] border-[#E5D8B8] hover:bg-[#EBDAB3]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="h-4 w-4 text-[#4A5D4E]" />
                  <span>Reflection Universe (2D Map)</span>
                </div>
                <span className="text-[10px] font-bold bg-[#FAF3E1] text-[#4A5D4E] px-1.5 py-0.5 rounded-md border border-[#E5D8B8]">
                  Semantic AI
                </span>
              </button>

              {onOpenToday && (
                <button
                  id="btn-drawer-open-today"
                  onClick={handleOpenTodayClick}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#F5E7C6] text-[#222222] border border-[#E5D8B8] hover:bg-[#EBDAB3] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-[#FA8112]" />
                    <span>Open Today's Reflection</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              )}

              {onOpenWeeklyReview && (
                <button
                  id="btn-drawer-weekly-review"
                  onClick={() => {
                    onClose();
                    onOpenWeeklyReview();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#F5E7C6] text-[#222222] border border-[#E5D8B8] hover:bg-[#EBDAB3] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-4 w-4 text-[#FA8112]" />
                    <span>Weekly Review Flashcards</span>
                  </div>
                  <span className="text-[10px] font-bold bg-[#FAF3E1] text-[#FA8112] px-1.5 py-0.5 rounded-md border border-[#E5D8B8]">
                    7 Cards + Arc
                  </span>
                </button>
              )}

              {onOpenSpotifyModal && (
                <button
                  id="btn-drawer-spotify-modal"
                  onClick={() => {
                    onClose();
                    onOpenSpotifyModal();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#F5E7C6] text-[#222222] border border-[#E5D8B8] hover:bg-[#EBDAB3] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Disc3 className="h-4 w-4 text-[#1DB954]" />
                    <span>Mood Music Companion (Spotify)</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              )}

              {onOpenOnboarding && (
                <button
                  id="btn-drawer-onboarding-tour"
                  onClick={() => {
                    onClose();
                    onOpenOnboarding();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#F5E7C6] text-[#222222] border border-[#E5D8B8] hover:bg-[#EBDAB3] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Compass className="h-4 w-4 text-[#FA8112]" />
                    <span>Show Me Around (App Tour)</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              )}
            </div>
          </div>

          {/* Organization & Enterprise Hub (Zero Content Visibility) */}
          <div className="space-y-2">
            <span className="text-[11px] font-serif font-semibold text-[#5C5549] tracking-wider uppercase flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#FA8112]" />
              <span>Enterprise & Organization</span>
            </span>

            {organization ? (
              <div className="rounded-2xl border border-[#E5D8B8] bg-[#F5E7C6]/60 p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-serif font-bold text-xs text-[#222222] truncate">
                      {organization.name}
                    </div>
                    <div className="text-[10px] text-[#5C5549] flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FA8112]/15 text-[#FA8112] border border-[#FA8112]/30">
                        {userOrgMember?.role === 'admin' ? 'Org Admin' : 'Employee Seat'}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{userOrgMember?.seatStatus || 'active'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-[#E5D8B8]">
                  {/* View Privacy Disclosure */}
                  {onOpenOrgDisclosure && (
                    <button
                      id="btn-drawer-org-disclosure"
                      onClick={() => {
                        onClose();
                        onOpenOrgDisclosure();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-serif font-semibold bg-[#FAF3E1] text-[#222222] border border-[#E5D8B8] hover:bg-[#EBDAB3] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#FA8112]" />
                        <span>Zero Content Privacy Guarantee</span>
                      </div>
                      <ChevronRight className="h-3 w-3 opacity-60" />
                    </button>
                  )}

                  {/* If Admin: Open Admin Portal */}
                  {userOrgMember?.role === 'admin' && onOpenOrgAdmin && (
                    <button
                      id="btn-drawer-org-admin"
                      onClick={() => {
                        onClose();
                        onOpenOrgAdmin();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-serif font-semibold bg-[#FA8112] text-white hover:bg-[#E0700B] transition-colors shadow-2xs cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>Manage Organization Seats</span>
                      </div>
                      <ChevronRight className="h-3 w-3 opacity-60" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E5D8B8] bg-[#F5E7C6]/60 p-3 space-y-2">
                <p className="text-[10px] text-[#5C5549] leading-relaxed">
                  Join a company workspace or sponsor employee seats with zero content visibility.
                </p>
                {onOpenJoinOrg && (
                  <button
                    id="btn-drawer-join-org"
                    onClick={() => {
                      onClose();
                      onOpenJoinOrg();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-serif font-semibold bg-[#FAF3E1] text-[#222222] border border-[#E5D8B8] hover:bg-[#EBDAB3] transition-colors cursor-pointer shadow-2xs"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-[#FA8112]" />
                    <span>Join or Create Organization</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Recently Deleted Section (Soft Deleted with 15-Day Retrieval Window) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsTrashOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-[11px] font-serif font-semibold text-[#5C5549] tracking-wider uppercase hover:text-[#222222] transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-[#9E3636]" />
                <span>Recently Deleted</span>
                <span className="ml-1 rounded-full bg-[#F5E7C6] px-1.5 py-0.2 text-[10px] font-bold text-[#FA8112] border border-[#E5D8B8]">
                  {deletedEntries.length}
                </span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isTrashOpen ? 'rotate-180' : ''}`} />
              </button>

              {deletedEntries.length > 0 && onEmptyTrash && (
                <button
                  onClick={onEmptyTrash}
                  className="text-[10px] font-serif text-[#9E3636] hover:text-[#7A1F1F] underline cursor-pointer"
                  title="Empty all recently deleted reflections"
                >
                  Empty Trash
                </button>
              )}
            </div>

            {isTrashOpen && (
              <div className="rounded-2xl border border-[#E5D8B8] bg-[#F5E7C6]/60 p-3 space-y-2.5">
                <div className="flex items-start gap-2 bg-[#FAF3E1]/80 rounded-xl p-2 text-[10px] font-serif text-[#5C5549] leading-relaxed border border-[#E5D8B8]">
                  <Clock className="h-3.5 w-3.5 text-[#FA8112] shrink-0 mt-0.5" />
                  <span>
                    Soft-deleted entries remain retrievable for up to <strong className="text-[#222222]">15 days</strong> before permanent removal.
                  </span>
                </div>

                {deletedEntries.length === 0 ? (
                  <div className="py-4 text-center text-[11px] font-serif text-[#8A8373]">
                    No recently deleted reflections.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {deletedEntries.map((entry) => {
                      const dateKey = entry.date || entry.id;
                      const daysLeft = getDaysRemaining(entry.deletedAt);
                      const isConfirming = confirmPermanentDate === dateKey;

                      return (
                        <div
                          key={dateKey}
                          id={`deleted-entry-card-${dateKey}`}
                          className="rounded-xl border border-[#E5D8B8] bg-[#FAF3E1] p-2.5 shadow-2xs space-y-2 transition-all hover:border-[#FA8112]"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-serif font-bold text-xs text-[#222222]">
                                  {dateKey}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-medium border ${
                                    daysLeft > 3
                                      ? 'bg-[#EBF3ED] text-[#2D5A38] border-[#CFE2D4]'
                                      : daysLeft > 0
                                      ? 'bg-[#FDF7E7] text-[#996515] border-[#EEDB9F]'
                                      : 'bg-[#FDF2F2] text-[#9E3636] border-[#F5CACA]'
                                  }`}
                                  title={`Deleted on ${entry.deletedAt ? new Date(entry.deletedAt).toLocaleDateString() : 'recent'}`}
                                >
                                  <Clock className="h-2.5 w-2.5" />
                                  {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#5C5549] line-clamp-1 mt-0.5 font-serif">
                                {entry.title || (entry.turns.length > 0 ? entry.turns[0].content : 'Untitled')}
                              </p>
                            </div>
                          </div>

                          {/* Inline Confirmation or Action Buttons */}
                          {isConfirming ? (
                            <div className="pt-1.5 border-t border-[#E5D8B8] flex items-center justify-between gap-2 text-[10px]">
                              <span className="text-[#9E3636] font-medium">Permanently delete?</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handlePermanentDelete(dateKey)}
                                  className="px-2 py-0.5 rounded bg-[#9E3636] text-white font-semibold hover:bg-[#852828] transition-colors cursor-pointer"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  onClick={() => setConfirmPermanentDate(null)}
                                  className="px-2 py-0.5 rounded bg-[#F5E7C6] text-[#5C5549] hover:bg-[#EBDAB3] transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-1.5 border-t border-[#E5D8B8] flex items-center justify-between gap-2">
                              {/* Retrieve / Restore Button */}
                              <button
                                id={`btn-restore-entry-${dateKey}`}
                                onClick={() => handleRestore(dateKey)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF3E1] text-[#222222] hover:bg-[#F5E7C6] border border-[#E5D8B8] text-[10px] font-semibold transition-all cursor-pointer shadow-2xs"
                                title="Restore this reflection back to your active calendar"
                              >
                                <RotateCcw className="h-3 w-3 text-[#FA8112]" />
                                <span>Retrieve & Restore</span>
                              </button>

                              {/* Permanent Delete Button */}
                              <button
                                id={`btn-perm-delete-${dateKey}`}
                                onClick={() => setConfirmPermanentDate(dateKey)}
                                className="p-1 text-[#8A8373] hover:text-[#9E3636] hover:bg-[#FDF2F2] rounded-md transition-colors cursor-pointer"
                                title="Permanently delete from database"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Security Architecture & Threat Model Section */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-serif font-semibold text-[#5C5549] tracking-wider uppercase">
              Security & Governance
            </h3>
            
            <button
              id="btn-drawer-security-modal"
              onClick={handleOpenSecurity}
              className="w-full text-left rounded-2xl border border-[#E5D8B8] bg-[#F5E7C6]/60 p-3.5 sm:p-4 hover:border-[#FA8112] hover:bg-[#F5E7C6] transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#222222]">
                  <ShieldCheck className="h-4 w-4 text-[#FA8112]" />
                  <span>Security Model & Audit</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[#5C5549] group-hover:text-[#FA8112] transition-colors" />
              </div>
              <p className="text-[11px] text-[#5C5549] leading-relaxed mb-3">
                Inspect the 5 Threat Zones, active Firestore Security Rules, and model fallback architecture.
              </p>

              {/* Security Pill Indicators */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#FAF3E1] border border-[#E5D8B8] text-[#222222]">
                  <Lock className="h-2.5 w-2.5 text-[#FA8112]" />
                  <span className="truncate">Owner-Bound UID</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#FAF3E1] border border-[#E5D8B8] text-[#222222]">
                  <Database className="h-2.5 w-2.5 text-[#FA8112]" />
                  <span className="truncate">Nested Rules</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#FAF3E1] border border-[#E5D8B8] text-[#222222]">
                  <KeyRound className="h-2.5 w-2.5 text-[#FA8112]" />
                  <span className="truncate">Secret Manager</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#FAF3E1] border border-[#E5D8B8] text-[#222222]">
                  <Sparkles className="h-2.5 w-2.5 text-[#FA8112]" />
                  <span className="truncate">Fallback Ladder</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Drawer Footer: Genuine Sign Out */}
        <div className="p-4 border-t border-[#E5D8B8] bg-[#F5E7C6]/80">
          <button
            id="btn-drawer-signout"
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FDF2F2] border border-[#F5CACA] px-4 py-2.5 text-xs font-semibold text-[#9E3636] hover:bg-[#FBE8E8] transition-colors shadow-2xs cursor-pointer"
            title="Terminate Firebase session and securely log out"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out of Account</span>
          </button>
          <p className="text-[10px] text-center text-[#8A8373] mt-2 font-serif">
            Terminates active OAuth tokens & clears session data.
          </p>
        </div>
      </aside>
    </>
  );
};

