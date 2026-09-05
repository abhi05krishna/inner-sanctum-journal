export interface MusicSuggestion {
  id: string;
  type: 'track' | 'playlist';
  name: string;
  artistOrOwner: string;
  spotifyUrl: string;
  imageUrl?: string;
  reasoning: string;
  mood: MoodType;
  source: 'personal_library' | 'spotify_search' | 'curated_fallback';
}

export interface RetrievedPastEntry {
  id: string;
  date: string;
  title: string;
  mood?: MoodType;
  score: number;
  summarySnippet?: string;
}

export interface JournalTurn {
  id: string;
  role: 'user' | 'gemini';
  content: string;
  timestamp: string; // ISO string
  musicSuggestion?: MusicSuggestion;
  retrievedPastEntries?: RetrievedPastEntry[];
}

export interface SpotifyConnectionStatus {
  connected: boolean;
  spotifyDisplayName?: string;
  spotifyUserId?: string;
  connectedAt?: string;
  hasClientCredentials?: boolean;
}

export interface SpotifyAuthDoc {
  userId: string;
  connected: boolean;
  spotifyDisplayName?: string;
  spotifyUserId?: string;
  scopes?: string[];
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  updatedAt: string;
}

export type ReflectionMode = 
  | 'reflect' 
  | 'brainstorm' 
  | 'summarize' 
  | 'deep_inquiry' 
  | 'gratitude' 
  | 'problem_solving';

export type MoodType = 'happy' | 'peaceful' | 'energized' | 'thoughtful' | 'anxious' | 'motivated' | 'overwhelmed' | 'neutral';

export interface JournalEntry {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  mode: ReflectionMode;
  mood?: MoodType;
  moodLocked?: boolean;
  moodReason?: string;
  tags: string[];
  summary?: string;
  takeaways?: string[];
  actionItems?: string[];
  turns: JournalTurn[];
  embedding?: number[];
  deletedAt?: string | null; // ISO string when soft deleted
  isDeleted?: boolean; // Soft delete flag
}

export interface SemanticSearchResult {
  entry: JournalEntry;
  score: number; // Cosine similarity 0.0 - 1.0
  isSemanticMatch: boolean;
}

export type AppView = 'calendar' | 'editor' | 'universe';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastLoginAt: string;
  hasSeenOnboarding?: boolean;
}

export interface ReflectRequestPayload {
  mode: ReflectionMode;
  turns: { role: 'user' | 'gemini'; content: string; musicSuggestion?: MusicSuggestion }[];
  context?: {
    mood?: MoodType;
    tags?: string[];
    title?: string;
    lastMusicSuggestedAt?: string;
    isMusicThrottled?: boolean;
  };
  entryId?: string;
  pastEntries?: Array<{
    id: string;
    date: string;
    title: string;
    summary?: string;
    mood?: MoodType;
    tags?: string[];
    embedding?: number[];
  }>;
}

export interface ReflectResponsePayload {
  reply: string;
  suggestedPrompts?: string[];
  keyInsight?: string;
  modelUsed: string;
  detectedMood?: MoodType;
  moodReason?: string;
  musicSuggestion?: MusicSuggestion;
  retrievedPastEntries?: RetrievedPastEntry[];
}

export interface SummarizeRequestPayload {
  title: string;
  mode: ReflectionMode;
  turns: { role: 'user' | 'gemini'; content: string }[];
}

export interface WeatherData {
  success: boolean;
  condition: 'clear' | 'clouds' | 'rain' | 'drizzle' | 'snow' | 'thunderstorm' | 'fog' | 'windy';
  label: string;
  icon: string;
  temperatureC: number;
  temperatureF: number;
  isDay: boolean;
  city: string;
  timestamp: string;
  fallback?: boolean;
  source?: 'gps' | 'timezone' | 'ip' | 'fallback';
  timezone?: string;
}

export type VisualDriverType = 'mood' | 'weather';

export interface AmbientVisualTheme {
  driver: VisualDriverType;
  primaryMood?: MoodType;
  weatherCondition?: WeatherData['condition'];
  themeLabel: string;
  description: string;
  palette: {
    bgGradient: string;
    ambientOrbs: string[];
    scrimOverlay: string;
    accentGlow: string;
  };
}

export interface WeeklyDailyCard {
  date: string; // YYYY-MM-DD
  dayName: string; // e.g. Monday
  hasEntry: boolean;
  phrase: string;
  keyInsight?: string;
  mood?: MoodType;
  moodEmoji?: string;
  promptQuestion?: string;
  title?: string;
  summary?: string;
}

export interface WeeklyClosingCard {
  title: string;
  arcSummary: string;
  keyThemes: string[];
  closingMessage: string;
}

export interface WeeklyReviewResponse {
  weekLabel: string;
  dailyCards: WeeklyDailyCard[];
  closingCard: WeeklyClosingCard;
  modelUsed?: string;
}

export type OrgRole = 'admin' | 'employee';
export type OrgSeatStatus = 'active' | 'pending' | 'removed';

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  createdBy: string;
  createdAt: string; // ISO string
  plan: 'starter' | 'team' | 'enterprise';
  totalSeats: number;
  inviteCode: string;
}

export interface OrgMember {
  id: string; // userId (Firebase Auth UID)
  orgId: string;
  email: string;
  displayName: string;
  role: OrgRole;
  seatStatus: OrgSeatStatus;
  joinedAt: string; // ISO string
  invitedBy?: string;
  lastActiveDate?: string; // YYYY-MM-DD only, absolutely no content references
  disclosureAcceptedAt?: string; // ISO string
}

export interface OrgInvite {
  id: string;
  orgId: string;
  code: string;
  email?: string;
  role: OrgRole;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
}

export interface OrgAggregateStats {
  totalSeats: number;
  activeSeats: number;
  pendingSeats: number;
  removedSeats: number;
  membersActiveThisWeek: number;
  weeklyActivePercentage: number;
}

export type OrgAuditAction = 
  | 'org_created' 
  | 'seat_invited' 
  | 'seat_removed' 
  | 'seat_reactivated' 
  | 'invite_code_copied';

export interface OrgAuditLogEntry {
  id: string;
  orgId: string;
  action: OrgAuditAction;
  performedBy: string; // admin user UID
  performedByEmail?: string;
  affectedMemberId?: string;
  affectedEmail?: string;
  details?: string;
  timestamp: string; // ISO string
}

