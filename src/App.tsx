import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  auth, 
  signInWithGoogle, 
  signOutUser, 
  onAuthStateChanged, 
  subscribeToUserEntries, 
  saveJournalEntryToFirestore, 
  deleteJournalEntryFromFirestore,
  softDeleteJournalEntryInFirestore,
  restoreJournalEntryInFirestore,
  subscribeToUserProfile,
  subscribeToOrganization,
  subscribeToUserOrgMembership,
  subscribeToOrgMembers,
  updateOrgMemberLastActiveDate,
  setUserHasSeenOnboarding,
  runFirestoreRuntimeDiagnostic,
  type User
} from './firebase';
import { Navbar } from './components/Navbar';
import { NavigationDrawer } from './components/NavigationDrawer';
import { LandingPage } from './components/LandingPage';
import { CalendarView, formatDateKey } from './components/CalendarView';
import { JournalEditor } from './components/JournalEditor';
import { SummaryModal } from './components/SummaryModal';
import { SecurityArchitectureModal } from './components/SecurityArchitectureModal';
import { SpotifyConnectModal } from './components/SpotifyConnectModal';
import { SpotifyCallbackHandler } from './components/SpotifyCallbackHandler';
import { WelcomeBackPrompt } from './components/WelcomeBackPrompt';
import { WeeklyReviewModal } from './components/WeeklyReviewModal';
import { OrgDisclosureModal } from './components/OrgDisclosureModal';
import { OrgAdminDashboardModal } from './components/OrgAdminDashboardModal';
import { JoinOrgModal } from './components/JoinOrgModal';
import { OnboardingWalkthrough } from './components/OnboardingWalkthrough';
import { fetchCurrentWeather } from './utils/weatherService';
import { ReflectionUniverse } from './components/ReflectionUniverse';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { JournalEntry, UserProfile, AppView, VisualDriverType, WeatherData, MoodType, Organization, OrgMember } from './types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  // If the current path is /spotify-callback or has Spotify OAuth code/error query params, render OAuth callback handler immediately
  const isSpotifyCallback =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/spotify-callback' ||
      (window.location.search.includes('code=') &&
        (window.location.search.includes('state=') || window.location.search.includes('error='))));

  if (isSpotifyCallback) {
    return <SpotifyCallbackHandler />;
  }

  // Authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // App Navigation View: Defaults to 'calendar' after login
  const [currentView, setCurrentView] = useState<AppView>('calendar');

  // Journal Entries state (keyed by YYYY-MM-DD)
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error'>('synced');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Global Visual Ambiance Driver & Weather State
  const [activeDriver, setActiveDriver] = useState<VisualDriverType>('mood');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  // UI Modals state
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(false);
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isOnboardingManual, setIsOnboardingManual] = useState(false);

  // Organization state (Zero Content Visibility)
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userOrgMember, setUserOrgMember] = useState<OrgMember | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [isOrgDisclosureOpen, setIsOrgDisclosureOpen] = useState(false);
  const [isOrgAdminOpen, setIsOrgAdminOpen] = useState(false);
  const [isJoinOrgOpen, setIsJoinOrgOpen] = useState(false);

  // Fetch real-time weather once securely for the session with location awareness
  useEffect(() => {
    let isMounted = true;
    fetchCurrentWeather()
      .then((data) => {
        if (isMounted && data) setWeatherData(data);
      })
      .catch((err) => console.warn('Weather fetch fallback:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Ambiance mode toggle
  const handleToggleDriver = () => {
    setActiveDriver((prev) => (prev === 'weather' ? 'mood' : 'weather'));
  };

  // Save timeout ref for debounced autosave
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: Create a fresh new blank entry for a given calendar date
  const createBlankEntryForDate = useCallback((userId: string, dateKey: string): JournalEntry => {
    return {
      id: dateKey,
      date: dateKey,
      userId,
      title: 'Untitled Reflection',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: 'reflect',
      mood: 'peaceful',
      tags: [],
      turns: [],
    };
  }, []);

  // 1. Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLoginAt: new Date().toISOString(),
        });
        // Walkthrough appears every time the user logs in; fully skippable/dismissible
        setIsOnboardingManual(false);
        setIsOnboardingOpen(true);
      } else {
        setCurrentUser(null);
        setEntries([]);
        setSelectedEntryId(null);
        setCurrentView('calendar');
        setIsOnboardingOpen(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time subscribe to user's isolated calendar entries in Firestore
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = subscribeToUserEntries(
      currentUser.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);
        // Retain current selection if valid
        setSelectedEntryId((prevId) => {
          if (prevId && fetchedEntries.some((e) => e.id === prevId || e.date === prevId)) {
            return prevId;
          }
          return prevId;
        });
      },
      (error) => {
        console.error('Firestore real-time sync failed:', error);
        setSyncStatus('error');
        setSyncError(error.message || 'Failed to sync with Cloud Firestore.');
      }
    );

    (window as any).runLiveFirestoreDiagnostic = (dateKey?: string) => {
      const key = dateKey || formatDateKey(new Date());
      console.log(`[Diagnostic] Triggering live Firestore query for key: ${key}...`);
      return runFirestoreRuntimeDiagnostic(currentUser.uid, key, 'manual_window_call');
    };

    return () => {
      delete (window as any).runLiveFirestoreDiagnostic;
      unsubscribe();
    };
  }, [currentUser?.uid]);

  // 3. Listen to user profile document to discover currentOrgId
  useEffect(() => {
    if (!currentUser?.uid) {
      setCurrentOrgId(null);
      setOrganization(null);
      setUserOrgMember(null);
      setOrgMembers([]);
      return;
    }

    const unsub = subscribeToUserProfile(currentUser.uid, (data) => {
      if (data?.currentOrgId) {
        setCurrentOrgId(data.currentOrgId);
      } else {
        const cached = localStorage.getItem(`org_${currentUser.uid}`);
        if (cached) {
          setCurrentOrgId(cached);
        }
      }
    });

    return () => unsub();
  }, [currentUser?.uid]);

  // 4. Subscribe to Organization metadata & current user membership status
  useEffect(() => {
    if (!currentOrgId || !currentUser?.uid) {
      setOrganization(null);
      setUserOrgMember(null);
      setOrgMembers([]);
      return;
    }

    const unsubOrg = subscribeToOrganization(currentOrgId, (org) => {
      setOrganization(org);
    });

    const unsubMember = subscribeToUserOrgMembership(currentOrgId, currentUser.uid, (member) => {
      setUserOrgMember(member);
    });

    return () => {
      unsubOrg();
      unsubMember();
    };
  }, [currentOrgId, currentUser?.uid]);

  // 5. If the current user is an Org Admin, subscribe to all organization seat members
  useEffect(() => {
    if (!currentOrgId || userOrgMember?.role !== 'admin') {
      setOrgMembers([]);
      return;
    }

    const unsubMembers = subscribeToOrgMembers(currentOrgId, (members) => {
      setOrgMembers(members);
    });

    return () => unsubMembers();
  }, [currentOrgId, userOrgMember?.role]);

  // Organization Joined / Created Handler
  const handleJoinedOrganization = (orgId: string) => {
    setCurrentOrgId(orgId);
    if (currentUser?.uid) {
      localStorage.setItem(`org_${currentUser.uid}`, orgId);
    }
  };

  // Auth Handlers
  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      setAuthError(err?.message || 'Authentication was cancelled or failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsDrawerOpen(false);
      await signOutUser();
      setCurrentView('calendar');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Calendar Date Selection: Opens existing active entry or initializes fresh day thread
  const handleSelectDate = (dateStr: string) => {
    if (!currentUser?.uid) return;

    // 1. Check if an active (non-deleted) entry exists for this date
    const existingActiveEntry = entries.find(
      (e) => (e.date || e.id) === dateStr && !e.isDeleted
    );
    if (existingActiveEntry) {
      setSelectedEntryId(existingActiveEntry.id);
      setCurrentView('editor');
      return;
    }

    // 2. If the entry at that date has isDeleted: true (or no entry exists yet),
    // open a fresh, empty new-entry state instead of loading soft-deleted content
    const newEntry = createBlankEntryForDate(currentUser.uid, dateStr);
    setEntries((prev) => {
      const remaining = prev.filter((e) => !((e.date || e.id) === dateStr && !e.isDeleted));
      return [newEntry, ...remaining];
    });
    setSelectedEntryId(dateStr);
    setCurrentView('editor');
  };

  // Active non-deleted reflections
  const activeEntries = useMemo(() => {
    return entries.filter((e) => !e.isDeleted);
  }, [entries]);

  // Recently soft-deleted reflections (up to 15-day recovery)
  const deletedEntries = useMemo(() => {
    return entries.filter((e) => !!e.isDeleted);
  }, [entries]);

  // Quick action: Write/Open Today's Reflection
  const handleWriteToday = () => {
    const todayKey = formatDateKey(new Date());
    handleSelectDate(todayKey);
  };

  // Close or dismiss onboarding walkthrough (remains fully skippable/dismissible)
  const handleCloseOnboarding = useCallback(() => {
    setIsOnboardingOpen(false);
  }, []);

  // Start today's reflection directly from onboarding tour CTA
  const handleStartTodayFromOnboarding = useCallback(() => {
    handleCloseOnboarding();
    handleWriteToday();
  }, [handleCloseOnboarding]);

  // Select Entry from Sidebar
  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntryId(entry.id);
    setCurrentView('editor');
  };

  // Soft Delete Entry (Move to Recently Deleted with 15-day recovery)
  const handleSoftDeleteEntry = async (entryId: string) => {
    if (!currentUser?.uid) return;
    const nowIso = new Date().toISOString();

    // 1. Immediately cancel any debounced autosave so it cannot overwrite the soft-deletion
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Resolve matching entry to find its actual document ID and date key
    const target = entries.find(
      (e) =>
        e.id === entryId ||
        e.date === entryId ||
        (e.date && e.date.startsWith(entryId)) ||
        (e.id && e.id.startsWith(entryId))
    );

    const docId = target?.id || target?.date || entryId;
    const dateKey = target?.date || target?.id || entryId;

    // Optimistic local state update across all representations
    setEntries((prev) =>
      prev.map((e) =>
        e.id === docId ||
        e.id === entryId ||
        e.date === dateKey ||
        e.date === entryId ||
        (target && e === target)
          ? { ...e, isDeleted: true, deletedAt: nowIso }
          : e
      )
    );

    if (
      selectedEntryId === entryId ||
      selectedEntryId === docId ||
      (currentSelectedEntry &&
        (currentSelectedEntry.id === docId ||
          currentSelectedEntry.id === entryId ||
          currentSelectedEntry.date === dateKey ||
          currentSelectedEntry.date === entryId))
    ) {
      setSelectedEntryId(null);
      setCurrentView('calendar');
    }

    try {
      // Soft delete the entry in Firestore at its primary document path
      await softDeleteJournalEntryInFirestore(currentUser.uid, docId);

      // If dateKey is distinct from docId, also soft delete dateKey document to prevent orphaned stubs
      if (dateKey && dateKey !== docId) {
        await softDeleteJournalEntryInFirestore(currentUser.uid, dateKey).catch(() => {});
      }

      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Failed to soft delete reflection:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Failed to move reflection to Recently Deleted.');
    }
  };

  // Restore Soft-Deleted Entry
  const handleRestoreEntry = async (entryId: string) => {
    if (!currentUser?.uid) return;

    const target = entries.find(
      (e) =>
        e.id === entryId ||
        e.date === entryId ||
        (e.date && e.date.startsWith(entryId)) ||
        (e.id && e.id.startsWith(entryId))
    );

    const docId = target?.id || target?.date || entryId;
    const dateKey = target?.date || target?.id || entryId;

    // Optimistic local state update
    setEntries((prev) =>
      prev.map((e) =>
        e.id === docId ||
        e.id === entryId ||
        e.date === dateKey ||
        e.date === entryId ||
        (target && e === target)
          ? { ...e, isDeleted: false, deletedAt: undefined }
          : e
      )
    );

    try {
      await restoreJournalEntryInFirestore(currentUser.uid, docId);
      if (dateKey && dateKey !== docId) {
        await restoreJournalEntryInFirestore(currentUser.uid, dateKey).catch(() => {});
      }
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Failed to restore reflection:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Failed to restore reflection.');
    }
  };

  // Permanent Delete Entry
  const handlePermanentDeleteEntry = async (entryId: string) => {
    if (!currentUser?.uid) return;

    const target = entries.find(
      (e) =>
        e.id === entryId ||
        e.date === entryId ||
        (e.date && e.date.startsWith(entryId)) ||
        (e.id && e.id.startsWith(entryId))
    );

    const docId = target?.id || target?.date || entryId;
    const dateKey = target?.date || target?.id || entryId;

    // Optimistic local delete
    setEntries((prev) =>
      prev.filter(
        (e) =>
          e.id !== docId &&
          e.id !== entryId &&
          e.date !== dateKey &&
          e.date !== entryId &&
          (!target || e !== target)
      )
    );

    try {
      await deleteJournalEntryFromFirestore(currentUser.uid, docId);
      if (dateKey && dateKey !== docId) {
        await deleteJournalEntryFromFirestore(currentUser.uid, dateKey).catch(() => {});
      }
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Failed to permanently delete reflection:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Failed to permanently delete reflection.');
    }
  };

  // Empty all items in Trash
  const handleEmptyTrash = async () => {
    if (!currentUser?.uid || deletedEntries.length === 0) return;

    const entriesToDelete = [...deletedEntries];
    setEntries((prev) => prev.filter((e) => !e.isDeleted));

    try {
      for (const e of entriesToDelete) {
        if (e.id) await deleteJournalEntryFromFirestore(currentUser.uid, e.id).catch(() => {});
        if (e.date && e.date !== e.id) await deleteJournalEntryFromFirestore(currentUser.uid, e.date).catch(() => {});
      }
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Failed to empty trash:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Failed to permanently delete all items in trash.');
    }
  };

  // Update entry & Save to Firestore
  const handleUpdateEntry = (updated: JournalEntry) => {
    if (!currentUser?.uid) return;

    // Guard: Never update an entry payload that is marked as deleted
    if (updated.isDeleted) return;

    // Local state immediate update: update active entry or add fresh entry
    setEntries((prev) => {
      const hasActive = prev.some((e) => (e.id === updated.id || e.date === updated.date) && !e.isDeleted);
      if (hasActive) {
        return prev.map((e) =>
          ((e.id === updated.id || e.date === updated.date) && !e.isDeleted ? updated : e)
        );
      }
      return [updated, ...prev];
    });

    // Update member last active date asynchronously if linked to an organization
    if (currentOrgId && currentUser?.uid) {
      const todayStr = formatDateKey(new Date());
      updateOrgMemberLastActiveDate(currentOrgId, currentUser.uid, todayStr).catch(() => {});
    }

    // Save with debouncing
    setSyncStatus('saving');
    setSyncError(null);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveJournalEntryToFirestore(currentUser.uid, updated);
        setSyncStatus('synced');
      } catch (err: any) {
        console.error('Firestore save rejection:', err);
        setSyncStatus('error');
        setSyncError(err?.message || 'Failed to sync updates to Cloud Firestore.');
      }
    }, 400);
  };

  // Summarize Entry with Gemini
  const handleSummarizeEntry = async (entry: JournalEntry) => {
    if (!currentUser?.uid || entry.turns.length === 0) return;

    setIsSummarizing(true);
    try {
      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-uid': currentUser.uid,
        },
        body: JSON.stringify({
          title: entry.title,
          mode: entry.mode,
          turns: entry.turns.map((t) => ({ role: t.role, content: t.content })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to summarize session.');
      }

      const summaryData = await response.json();

      const updatedEntry: JournalEntry = {
        ...entry,
        summary: summaryData.executiveSummary || 'Session summarized.',
        takeaways: summaryData.keyTakeaways || [],
        actionItems: summaryData.actionItems || [],
        updatedAt: new Date().toISOString(),
      };

      handleUpdateEntry(updatedEntry);
      setIsSummaryModalOpen(true);
    } catch (err: any) {
      console.error('Failed to summarize entry:', err);
      alert(`Synthesis error: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Selected Entry Resolver: Prioritize active non-deleted entry;
  // If the matching entry is soft-deleted, provide a fresh blank entry so editor opens empty
  const currentSelectedEntry = useMemo(() => {
    if (!selectedEntryId) return null;

    // Active (non-deleted) entry takes top priority
    const activeEntry = entries.find(
      (e) => (e.id === selectedEntryId || e.date === selectedEntryId) && !e.isDeleted
    );
    if (activeEntry) return activeEntry;

    // If an entry exists for this date but is soft-deleted, return a fresh empty new-entry state
    const softDeletedEntry = entries.find(
      (e) => (e.id === selectedEntryId || e.date === selectedEntryId) && e.isDeleted
    );
    if (softDeletedEntry && currentUser?.uid) {
      const dateKey = softDeletedEntry.date || softDeletedEntry.id || selectedEntryId;
      return createBlankEntryForDate(currentUser.uid, dateKey);
    }

    return null;
  }, [entries, selectedEntryId, currentUser?.uid, createBlankEntryForDate]);

  // Derive active mood dynamically from active entry or latest journal entry
  const currentMood: MoodType = useMemo(() => {
    if (currentView === 'editor' && currentSelectedEntry?.mood) {
      return currentSelectedEntry.mood;
    }
    const todayKey = formatDateKey(new Date());
    const todayEntry = entries.find((e) => (e.date || e.id) === todayKey);
    if (todayEntry?.mood) return todayEntry.mood;
    const latestWithMood = entries.find((e) => e.mood);
    return latestWithMood?.mood || 'peaceful';
  }, [currentView, currentSelectedEntry, entries]);

  // Render Loading Splash during initial Auth check
  if (authLoading && !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFCF9]">
        <div className="flex flex-col items-center gap-3 text-[#7C786A]">
          <Loader2 className="h-7 w-7 animate-spin text-[#4A5D4E]" />
          <p className="text-xs font-medium font-serif">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // If unauthenticated, show Landing Page with Google Sign-In
  if (!currentUser) {
    return (
      <>
        <LandingPage
          onSignIn={handleSignIn}
          isLoading={authLoading}
          error={authError}
          onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        />
        <SecurityArchitectureModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
        />
      </>
    );
  }

  // If authenticated, render Dashboard
  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-[#1A1A1A] selection:bg-[#EBE7DE] selection:text-[#1A1A1A] relative">
      {/* Top Navbar with unified Ambiance Mode Switcher */}
      <Navbar
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        isDrawerOpen={isDrawerOpen}
        syncStatus={syncStatus}
        onRetrySync={() => currentSelectedEntry && handleUpdateEntry(currentSelectedEntry)}
        currentView={currentView}
        onNavigateView={(view) => setCurrentView(view)}
        activeDateStr={currentSelectedEntry ? (currentSelectedEntry.date || currentSelectedEntry.id) : null}
        activeDriver={activeDriver}
        onToggleDriver={handleToggleDriver}
        currentMood={currentMood}
        weatherData={weatherData}
        onOpenSpotifyModal={() => setIsSpotifyModalOpen(true)}
        onOpenWeeklyReview={() => setIsWeeklyReviewOpen(true)}
        organization={organization}
        userOrgMember={userOrgMember}
        onOpenOrgModal={() => {
          if (userOrgMember?.role === 'admin') {
            setIsOrgAdminOpen(true);
          } else {
            setIsOrgDisclosureOpen(true);
          }
        }}
      />

      {/* Slide-out Navigation & Account Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={currentUser}
        entryCount={activeEntries.length}
        deletedEntries={deletedEntries}
        onRestoreEntry={handleRestoreEntry}
        onPermanentDeleteEntry={handlePermanentDeleteEntry}
        onEmptyTrash={handleEmptyTrash}
        onSignOut={handleSignOut}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onOpenSpotifyModal={() => setIsSpotifyModalOpen(true)}
        onOpenWeeklyReview={() => setIsWeeklyReviewOpen(true)}
        organization={organization}
        userOrgMember={userOrgMember}
        onOpenOrgDisclosure={() => setIsOrgDisclosureOpen(true)}
        onOpenOrgAdmin={() => setIsOrgAdminOpen(true)}
        onOpenJoinOrg={() => setIsJoinOrgOpen(true)}
        onOpenOnboarding={() => {
          setIsOnboardingManual(true);
          setIsOnboardingOpen(true);
        }}
        onNavigateView={(view) => setCurrentView(view)}
        onOpenToday={handleWriteToday}
        currentView={currentView}
      />

      {/* Sync Error Banner if any */}
      {syncStatus === 'error' && syncError && (
        <div className="bg-[#FDF2F2] border-b border-[#F5CACA] px-4 py-2 flex items-center justify-between text-xs text-[#9E3636]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#9E3636] shrink-0" />
            <span>{syncError}</span>
          </div>
          <button
            onClick={() => currentSelectedEntry && handleUpdateEntry(currentSelectedEntry)}
            className="flex items-center gap-1 font-semibold text-[#9E3636] hover:text-[#852828] underline cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry Sync</span>
          </button>
        </div>
      )}

      {/* Main Content Area: Universe, Calendar View or Day Reflection Editor */}
      {currentView === 'universe' ? (
        <ErrorBoundary sectionName="Universe View" onReset={() => setCurrentView('calendar')}>
          <ReflectionUniverse
            entries={entries}
            onSelectDate={(dateStr) => {
              handleSelectDate(dateStr);
              setCurrentView('editor');
            }}
            onBackToCalendar={() => setCurrentView('calendar')}
            userId={currentUser?.uid}
          />
        </ErrorBoundary>
      ) : currentView === 'calendar' ? (
        <ErrorBoundary sectionName="Calendar View">
          <CalendarView
            entries={entries}
            userId={currentUser?.uid}
            onSelectDate={handleSelectDate}
            onDeleteEntry={handleSoftDeleteEntry}
            activeDriver={activeDriver}
            weatherData={weatherData}
            detectedMood={currentMood}
            onToggleDriver={handleToggleDriver}
            onOpenWeeklyReview={() => setIsWeeklyReviewOpen(true)}
          />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary sectionName="Reflection Editor" onReset={() => setCurrentView('calendar')}>
          <div className="flex flex-1 overflow-hidden">
            {/* Central Day Reflection Editor */}
            {currentSelectedEntry ? (
              <JournalEditor
                key={currentSelectedEntry.id}
                entry={currentSelectedEntry}
                onUpdateEntry={handleUpdateEntry}
                onSummarize={handleSummarizeEntry}
                isSummarizing={isSummarizing}
                onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
                onBackToCalendar={() => setCurrentView('calendar')}
                onDeleteEntry={handleSoftDeleteEntry}
                activeDriver={activeDriver}
                weatherData={weatherData}
                onToggleDriver={handleToggleDriver}
                onOpenSpotifyModal={() => setIsSpotifyModalOpen(true)}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[#7C786A] bg-[#FDFCF9]">
                <h3 className="text-base font-serif font-semibold text-[#1A1A1A]">
                  No Date Selected
                </h3>
                <p className="mt-1 text-xs text-[#7C786A] max-w-sm font-serif">
                  Select a date from the calendar or choose today to begin writing your reflection.
                </p>
                <button
                  onClick={() => setCurrentView('calendar')}
                  className="mt-4 rounded-xl bg-[#4A5D4E] px-4 py-2 text-xs font-semibold text-[#FDFCF9] shadow-2xs hover:bg-[#3C4C3F] transition-colors cursor-pointer"
                >
                  Go to Calendar
                </button>
              </div>
            )}
          </div>
        </ErrorBoundary>
      )}

      {/* Welcome Back to Journal Prompt (Gentle nudge if yesterday was logged & today is unwritten) */}
      <WelcomeBackPrompt
        entries={entries}
        onOpenToday={handleWriteToday}
        userName={currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : undefined)}
      />

      {/* Weekly Review Flashcards Modal */}
      <WeeklyReviewModal
        isOpen={isWeeklyReviewOpen}
        onClose={() => setIsWeeklyReviewOpen(false)}
        entries={entries}
        onOpenDate={(dateStr) => {
          handleSelectDate(dateStr);
          setCurrentView('editor');
        }}
        currentUserId={currentUser?.uid}
      />

      {/* Modals */}
      <SummaryModal
        entry={currentSelectedEntry}
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />

      <SecurityArchitectureModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      <SpotifyConnectModal
        isOpen={isSpotifyModalOpen}
        onClose={() => setIsSpotifyModalOpen(false)}
        userId={currentUser?.uid}
      />

      {/* Organization Privacy Disclosure Modal (Plain language, zero content visibility) */}
      <OrgDisclosureModal
        isOpen={isOrgDisclosureOpen}
        onClose={() => setIsOrgDisclosureOpen(false)}
        organization={organization}
        member={userOrgMember}
      />

      {/* Organization Admin Portal Modal (Seat management & anonymous telemetry only) */}
      <OrgAdminDashboardModal
        isOpen={isOrgAdminOpen}
        onClose={() => setIsOrgAdminOpen(false)}
        organization={organization}
        members={orgMembers}
        currentUserId={currentUser?.uid}
      />

      {/* Join or Create Organization Modal */}
      <JoinOrgModal
        isOpen={isJoinOrgOpen}
        onClose={() => setIsJoinOrgOpen(false)}
        currentUser={currentUser}
        onJoinedOrganization={(org) => handleJoinedOrganization(org.id)}
        onCreatedOrganization={(org) => handleJoinedOrganization(org.id)}
      />

      {/* First-Time User Onboarding & Interactive Tour */}
      <OnboardingWalkthrough
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
        onStartToday={handleStartTodayFromOnboarding}
        isManuallyTriggered={isOnboardingManual}
      />
    </div>
  );
}

