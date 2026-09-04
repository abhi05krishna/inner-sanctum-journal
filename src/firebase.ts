import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  getDocs,
  writeBatch,
  onSnapshot, 
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import type { 
  JournalEntry, 
  JournalTurn, 
  Organization, 
  OrgMember, 
  OrgInvite, 
  OrgRole, 
  OrgSeatStatus, 
  OrgAuditLogEntry, 
  OrgAuditAction 
} from './types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

/**
 * Utility: Deeply strip undefined values to ensure Zero-Crash Firestore hygiene.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as unknown as T;
  }
  return obj;
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Subscribe to user profile document changes (e.g. currentOrgId, hasSeenOnboarding)
 */
export function subscribeToUserProfile(
  userId: string,
  callback: (data: { currentOrgId?: string; hasSeenOnboarding?: boolean } | null) => void
): () => void {
  if (!userId) {
    callback(null);
    return () => {};
  }
  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as { currentOrgId?: string; hasSeenOnboarding?: boolean });
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Subscription error for user profile:', err);
      callback(null);
    }
  );
}

/**
 * Persist onboarding walkthrough completion status for a user.
 */
export async function setUserHasSeenOnboarding(userId: string, hasSeen: boolean = true): Promise<void> {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef, 
      { 
        hasSeenOnboarding: hasSeen, 
        updatedAt: new Date().toISOString() 
      }, 
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to set hasSeenOnboarding in Firestore:', err);
  }
}

/**
 * Subscribe to the real-time calendar-based journal entries collection.
 * Path: /users/{userId}/entries/{YYYY-MM-DD}
 */
export function subscribeToUserEntries(
  userId: string, 
  onData: (entries: JournalEntry[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(entriesRef, orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const entryDate = data.date || docSnap.id;
        entries.push({
          id: docSnap.id,
          date: entryDate,
          userId: data.userId || userId,
          title: data.title || 'Untitled Reflection',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          mode: data.mode || 'reflect',
          mood: data.mood,
          moodLocked: data.moodLocked === true,
          moodReason: data.moodReason || undefined,
          tags: Array.isArray(data.tags) ? data.tags : [],
          summary: data.summary,
          takeaways: Array.isArray(data.takeaways) ? data.takeaways : [],
          actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
          turns: Array.isArray(data.turns) ? data.turns : [],
          embedding: Array.isArray(data.embedding) ? data.embedding : undefined,
          isDeleted: data.isDeleted === true,
          deletedAt: data.deletedAt || null
        });
      });
      onData(entries);
    },
    (err) => {
      console.error('Firestore entries subscription error:', err);
      onError(err);
    }
  );
}

// Alias for backward compatibility
export const subscribeToUserJournals = subscribeToUserEntries;

/**
 * Windowed real-time subscription for visible calendar range (e.g. current month +/- 1 buffer month).
 * Path: /users/{userId}/entries where date >= startDate AND date <= endDate
 */
export function subscribeToUserEntriesForRange(
  userId: string,
  startDate: string,
  endDate: string,
  onData: (entries: JournalEntry[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(
    entriesRef,
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const entryDate = data.date || docSnap.id;
        entries.push({
          id: docSnap.id,
          date: entryDate,
          userId: data.userId || userId,
          title: data.title || 'Untitled Reflection',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          mode: data.mode || 'reflect',
          mood: data.mood,
          moodLocked: data.moodLocked === true,
          moodReason: data.moodReason || undefined,
          tags: Array.isArray(data.tags) ? data.tags : [],
          summary: data.summary,
          takeaways: Array.isArray(data.takeaways) ? data.takeaways : [],
          actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
          turns: Array.isArray(data.turns) ? data.turns : [],
          embedding: Array.isArray(data.embedding) ? data.embedding : undefined,
          isDeleted: data.isDeleted === true,
          deletedAt: data.deletedAt || null,
        });
      });
      onData(entries);
    },
    (err) => {
      console.error('Firestore windowed entries subscription error:', err);
      onError(err);
    }
  );
}

/**
 * Fetch a single journal entry on-demand by dateKey.
 */
export async function fetchJournalEntry(userId: string, dateStr: string): Promise<JournalEntry | null> {
  if (!userId || !dateStr) return null;
  try {
    const docRef = doc(db, 'users', userId, 'entries', dateStr);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      date: data.date || snap.id,
      userId: data.userId || userId,
      title: data.title || 'Untitled Reflection',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      mode: data.mode || 'reflect',
      mood: data.mood,
      moodLocked: data.moodLocked === true,
      moodReason: data.moodReason || undefined,
      tags: Array.isArray(data.tags) ? data.tags : [],
      summary: data.summary,
      takeaways: Array.isArray(data.takeaways) ? data.takeaways : [],
      actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
      turns: Array.isArray(data.turns) ? data.turns : [],
      embedding: Array.isArray(data.embedding) ? data.embedding : undefined,
      isDeleted: data.isDeleted === true,
      deletedAt: data.deletedAt || null,
    };
  } catch (err) {
    console.warn(`[Firestore] Failed to fetch single entry ${dateStr}:`, err);
    return null;
  }
}

/**
 * Save or update a journal entry strictly isolated to the authenticated user.
 * Document Path: /users/{userId}/entries/{YYYY-MM-DD}
 * Nested Subcollection: /users/{userId}/entries/{YYYY-MM-DD}/messages/{messageId}
 */
export async function saveJournalEntryToFirestore(
  userId: string, 
  entry: JournalEntry
): Promise<void> {
  if (!userId) throw new Error('User is not authenticated');
  const entryDate = entry.date || entry.id;
  if (!entryDate) throw new Error('Journal entry missing date ID');

  const entryDocRef = doc(db, 'users', userId, 'entries', entryDate);
  
  // Clean payload for entry doc
  const cleanedEntry = stripUndefined({
    id: entryDate,
    date: entryDate,
    userId,
    title: entry.title || 'Untitled Reflection',
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: entry.mode || 'reflect',
    mood: entry.mood || null,
    moodLocked: entry.moodLocked === true,
    moodReason: entry.moodReason || null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    summary: entry.summary || null,
    takeaways: Array.isArray(entry.takeaways) ? entry.takeaways : [],
    actionItems: Array.isArray(entry.actionItems) ? entry.actionItems : [],
    turns: Array.isArray(entry.turns) ? entry.turns : [],
    embedding: Array.isArray(entry.embedding) ? entry.embedding : null,
    isDeleted: entry.isDeleted === true,
    deletedAt: entry.deletedAt || null,
    _syncedAt: serverTimestamp()
  });

  // Write parent document
  await setDoc(entryDocRef, cleanedEntry, { merge: true });

      // Sync messages subcollection
  if (Array.isArray(entry.turns) && entry.turns.length > 0) {
    const batch = writeBatch(db);
    entry.turns.forEach((turn) => {
      const turnDocRef = doc(db, 'users', userId, 'entries', entryDate, 'messages', turn.id);
      batch.set(turnDocRef, stripUndefined({
        id: turn.id,
        role: turn.role,
        content: turn.content,
        timestamp: turn.timestamp || new Date().toISOString(),
        musicSuggestion: turn.musicSuggestion || null,
        _syncedAt: serverTimestamp()
      }), { merge: true });
    });
    await batch.commit();
  }
}

/**
 * Subscribe to the user's Spotify connection state in Firestore.
 * Path: /users/{userId}/spotifyAuth/current
 */
export function subscribeToSpotifyConnection(
  userId: string,
  onData: (data: { connected: boolean; spotifyDisplayName?: string; spotifyUserId?: string; updatedAt?: string } | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId) {
    onData(null);
    return () => {};
  }

  const spotifyDocRef = doc(db, 'users', userId, 'spotifyAuth', 'current');
  return onSnapshot(
    spotifyDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onData({
          connected: data.connected === true,
          spotifyDisplayName: data.spotifyDisplayName,
          spotifyUserId: data.spotifyUserId,
          updatedAt: data.updatedAt
        });
      } else {
        onData({ connected: false });
      }
    },
    (err) => {
      console.warn('Spotify auth status subscription error:', err);
      if (onError) onError(err);
      onData({ connected: false });
    }
  );
}

/**
 * Disconnect Spotify connection by removing credentials from Firestore.
 */
export async function disconnectSpotifyAccountInFirestore(userId: string): Promise<void> {
  if (!userId) throw new Error('Invalid user ID for Spotify disconnect');
  const spotifyDocRef = doc(db, 'users', userId, 'spotifyAuth', 'current');
  await deleteDoc(spotifyDocRef);
}

/**
 * Soft delete a journal entry (moves it to the Recently Deleted trash with a timestamp).
 */
export async function softDeleteJournalEntryInFirestore(
  userId: string,
  dateKey: string
): Promise<void> {
  if (!userId || !dateKey) throw new Error('Invalid arguments for soft deletion');
  const entryDocRef = doc(db, 'users', userId, 'entries', dateKey);
  await setDoc(
    entryDocRef,
    {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _syncedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Restore a soft-deleted journal entry back to the active calendar.
 */
export async function restoreJournalEntryInFirestore(
  userId: string,
  dateKey: string
): Promise<void> {
  if (!userId || !dateKey) throw new Error('Invalid arguments for restoring entry');
  const entryDocRef = doc(db, 'users', userId, 'entries', dateKey);
  await setDoc(
    entryDocRef,
    {
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
      _syncedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Permanently delete a user's journal entry and all nested messages.
 */
export async function deleteJournalEntryFromFirestore(
  userId: string, 
  dateKey: string
): Promise<void> {
  if (!userId || !dateKey) throw new Error('Invalid arguments for entry deletion');
  
  // Delete subcollection messages first
  try {
    const messagesRef = collection(db, 'users', userId, 'entries', dateKey, 'messages');
    const messagesSnap = await getDocs(messagesRef);
    if (!messagesSnap.empty) {
      const batch = writeBatch(db);
      messagesSnap.forEach((mDoc) => {
        batch.delete(mDoc.ref);
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('Could not batch delete subcollection messages:', err);
  }

  // Delete main day entry doc
  const entryDocRef = doc(db, 'users', userId, 'entries', dateKey);
  await deleteDoc(entryDocRef);
}

/**
 * =========================================================================
 * ENTERPRISE / ORGANIZATION MANAGEMENT (ZERO CONTENT VISIBILITY ARCHITECTURE)
 * =========================================================================
 */

/**
 * Generate a clean unique invite code for an organization
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ORG-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += '-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

/**
 * Create a new Organization in Firestore with the creator as the initial Org Admin.
 */
export async function createOrganizationInFirestore(
  name: string,
  plan: 'starter' | 'team' | 'enterprise',
  totalSeats: number,
  user: { uid: string; email: string | null; displayName: string | null }
): Promise<Organization> {
  if (!user?.uid) throw new Error('User must be authenticated to create an organization');
  
  const trimmedName = (name || '').trim();
  if (!trimmedName || trimmedName.length > 100) {
    throw new Error('Organization name must be between 1 and 100 characters.');
  }

  const orgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inviteCode = generateInviteCode();
  const nowIso = new Date().toISOString();

  const orgData: Organization = {
    id: orgId,
    name: trimmedName,
    createdBy: user.uid,
    createdAt: nowIso,
    plan,
    totalSeats: totalSeats || (plan === 'enterprise' ? 100 : plan === 'team' ? 25 : 10),
    inviteCode,
  };

  // 1. Create Organization document
  const orgRef = doc(db, 'organizations', orgId);
  await setDoc(orgRef, orgData);

  // 2. Create Admin Member document under organizations/{orgId}/members/{userId}
  const memberRef = doc(db, 'organizations', orgId, 'members', user.uid);
  const adminMemberData: OrgMember = {
    id: user.uid,
    orgId,
    email: user.email || '',
    displayName: user.displayName || 'Org Administrator',
    role: 'admin',
    seatStatus: 'active',
    joinedAt: nowIso,
    disclosureAcceptedAt: nowIso,
  };
  await setDoc(memberRef, adminMemberData);

  // 3. Update user profile with currentOrgId
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, { currentOrgId: orgId, updatedAt: nowIso }, { merge: true });

  // 4. Record audit log entry for organization creation
  await logOrgAdminAction(orgId, 'org_created', user.uid, {
    performedByEmail: user.email || undefined,
    details: `Created organization '${trimmedName}' with ${plan} plan (${orgData.totalSeats} seats).`,
  });

  return orgData;
}

/**
 * Fetch organization metadata by organization ID
 */
export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  if (!orgId) return null;
  try {
    const snap = await getDoc(doc(db, 'organizations', orgId));
    if (snap.exists()) {
      return snap.data() as Organization;
    }
  } catch (err) {
    console.error('Error fetching organization:', err);
  }
  return null;
}

/**
 * Lookup organization by invite code
 */
export async function getOrganizationByInviteCode(inviteCode: string): Promise<Organization | null> {
  const cleanCode = inviteCode.trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    const q = query(collection(db, 'organizations'), where('inviteCode', '==', cleanCode), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Organization;
    }
  } catch (err) {
    console.error('Error querying organization by invite code:', err);
  }
  return null;
}

/**
 * Subscribe in real-time to an Organization document
 */
export function subscribeToOrganization(
  orgId: string,
  callback: (org: Organization | null) => void
): () => void {
  if (!orgId) {
    callback(null);
    return () => {};
  }
  const orgRef = doc(db, 'organizations', orgId);
  return onSnapshot(
    orgRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as Organization);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Subscription error for organization:', err);
      callback(null);
    }
  );
}

/**
 * Subscribe in real-time to all members of an Organization (Admin view only)
 */
export function subscribeToOrgMembers(
  orgId: string,
  callback: (members: OrgMember[]) => void
): () => void {
  if (!orgId) {
    callback([]);
    return () => {};
  }
  const membersRef = collection(db, 'organizations', orgId, 'members');
  return onSnapshot(
    membersRef,
    (snap) => {
      const members: OrgMember[] = [];
      snap.forEach((d) => {
        members.push(d.data() as OrgMember);
      });
      callback(members);
    },
    (err) => {
      console.warn('Subscription error for org members:', err);
      callback([]);
    }
  );
}

/**
 * Subscribe in real-time to the current user's membership in an Organization
 */
export function subscribeToUserOrgMembership(
  orgId: string,
  userId: string,
  callback: (member: OrgMember | null) => void
): () => void {
  if (!orgId || !userId) {
    callback(null);
    return () => {};
  }
  const memberRef = doc(db, 'organizations', orgId, 'members', userId);
  return onSnapshot(
    memberRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as OrgMember);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Subscription error for user org membership:', err);
      callback(null);
    }
  );
}

/**
 * Join an Organization using an invite code after reviewing the Zero Content Visibility disclosure.
 */
export async function joinOrganizationWithInviteCode(
  inviteCode: string,
  user: { uid: string; email: string | null; displayName: string | null }
): Promise<{ organization: Organization; member: OrgMember }> {
  if (!user?.uid) throw new Error('User must be signed in to join an organization');
  
  const org = await getOrganizationByInviteCode(inviteCode);
  if (!org) {
    throw new Error('Invalid or expired invitation code. Please check with your organization admin.');
  }

  const nowIso = new Date().toISOString();
  const memberRef = doc(db, 'organizations', org.id, 'members', user.uid);
  const existingSnap = await getDoc(memberRef);

  let memberData: OrgMember;
  if (existingSnap.exists()) {
    const existing = existingSnap.data() as OrgMember;
    memberData = {
      ...existing,
      seatStatus: 'active',
      disclosureAcceptedAt: nowIso,
      email: user.email || existing.email,
      displayName: user.displayName || existing.displayName,
    };
  } else {
    memberData = {
      id: user.uid,
      orgId: org.id,
      email: user.email || '',
      displayName: user.displayName || 'Employee',
      role: 'employee',
      seatStatus: 'active',
      joinedAt: nowIso,
      disclosureAcceptedAt: nowIso,
    };
  }

  await setDoc(memberRef, memberData);

  // Link currentOrgId on user document
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, { currentOrgId: org.id, updatedAt: nowIso }, { merge: true });

  return { organization: org, member: memberData };
}

/**
 * Log Organization Admin Action to the organization's dedicated audit trail.
 * Path: organizations/{orgId}/auditLog/{logId}
 * CRITICAL ENTERPRISE PRIVACY MANDATE:
 * Records account and seat lifecycle changes only (seat_invited, seat_removed, seat_reactivated, org_created).
 * Absolutely ZERO journal content, mood entries, or reflections are ever stored in or accessible from this audit log.
 */
export async function logOrgAdminAction(
  orgId: string,
  action: OrgAuditAction,
  performedBy: string,
  options?: {
    performedByEmail?: string;
    affectedMemberId?: string;
    affectedEmail?: string;
    details?: string;
  }
): Promise<void> {
  if (!orgId || !action || !performedBy) return;
  try {
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRef = doc(db, 'organizations', orgId, 'auditLog', logId);
    const entry: OrgAuditLogEntry = {
      id: logId,
      orgId,
      action,
      performedBy,
      performedByEmail: options?.performedByEmail,
      affectedMemberId: options?.affectedMemberId,
      affectedEmail: options?.affectedEmail,
      details: options?.details,
      timestamp: new Date().toISOString(),
    };
    await setDoc(logRef, stripUndefined(entry));
  } catch (err) {
    console.warn('[Org Audit Log] Failed to record audit log entry:', err);
  }
}

/**
 * Real-time subscription to Organization Admin Audit Trail.
 * Only readable by Org Admins as enforced by Firestore Security Rules.
 */
export function subscribeOrgAuditLogs(
  orgId: string,
  callback: (logs: OrgAuditLogEntry[]) => void
): () => void {
  if (!orgId) {
    callback([]);
    return () => {};
  }
  const logsRef = collection(db, 'organizations', orgId, 'auditLog');
  const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((d) => d.data() as OrgAuditLogEntry);
      callback(logs);
    },
    (err) => {
      console.warn('[Org Audit Log] Subscription error:', err);
    }
  );
}

/**
 * Invite an employee seat to the organization by email (Admin function)
 */
export async function inviteEmployeeSeat(
  orgId: string,
  email: string,
  role: OrgRole = 'employee',
  adminUserId: string,
  adminEmail?: string
): Promise<OrgMember> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('A valid email is required to invite an employee');
  if (cleanEmail.length > 254) throw new Error('Email exceeds maximum allowed length of 254 characters.');
  
  const nowIso = new Date().toISOString();
  const tempMemberId = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const memberRef = doc(db, 'organizations', orgId, 'members', tempMemberId);

  const newMember: OrgMember = {
    id: tempMemberId,
    orgId,
    email: cleanEmail,
    displayName: cleanEmail.split('@')[0],
    role,
    seatStatus: 'pending',
    joinedAt: nowIso,
    invitedBy: adminUserId,
  };

  await setDoc(memberRef, newMember);

  // Record audit log for the invite action
  await logOrgAdminAction(orgId, 'seat_invited', adminUserId, {
    performedByEmail: adminEmail,
    affectedMemberId: tempMemberId,
    affectedEmail: cleanEmail,
    details: `Invited employee seat for ${cleanEmail} with ${role} role.`,
  });

  return newMember;
}

/**
 * Remove an employee's seat from an organization (Admin function).
 * NOTE: This ONLY revokes the org seat; it NEVER deletes or modifies the employee's personal journal content.
 */
export async function removeEmployeeSeat(
  orgId: string,
  memberId: string,
  adminUserId?: string,
  options?: { adminEmail?: string; memberEmail?: string }
): Promise<void> {
  if (!orgId || !memberId) throw new Error('Invalid arguments for removing seat');
  const memberRef = doc(db, 'organizations', orgId, 'members', memberId);
  await setDoc(
    memberRef,
    {
      seatStatus: 'removed',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // Record audit log for the seat removal
  if (adminUserId) {
    await logOrgAdminAction(orgId, 'seat_removed', adminUserId, {
      performedByEmail: options?.adminEmail,
      affectedMemberId: memberId,
      affectedEmail: options?.memberEmail,
      details: `Revoked seat for ${options?.memberEmail || memberId}. Personal user reflections remain isolated and untouched.`,
    });
  }
}

/**
 * Reactivate a previously removed seat (Admin function)
 */
export async function reactivateEmployeeSeat(
  orgId: string,
  memberId: string,
  adminUserId?: string,
  options?: { adminEmail?: string; memberEmail?: string }
): Promise<void> {
  if (!orgId || !memberId) throw new Error('Invalid arguments for reactivating seat');
  const memberRef = doc(db, 'organizations', orgId, 'members', memberId);
  await setDoc(
    memberRef,
    {
      seatStatus: 'active',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // Record audit log for the seat reactivation
  if (adminUserId) {
    await logOrgAdminAction(orgId, 'seat_reactivated', adminUserId, {
      performedByEmail: options?.adminEmail,
      affectedMemberId: memberId,
      affectedEmail: options?.memberEmail,
      details: `Reactivated active seat for ${options?.memberEmail || memberId}.`,
    });
  }
}

/**
 * Update the member's last active calendar date ONLY (Date string YYYY-MM-DD, absolutely zero content).
 */
export async function updateOrgMemberLastActiveDate(
  orgId: string,
  userId: string,
  dateKey: string
): Promise<void> {
  if (!orgId || !userId || !dateKey) return;
  try {
    const memberRef = doc(db, 'organizations', orgId, 'members', userId);
    await setDoc(
      memberRef,
      {
        lastActiveDate: dateKey,
      },
      { merge: true }
    );
  } catch (err) {
    // Non-critical background telemetry update
    console.debug('Could not update org member last active date:', err);
  }
}

export { onAuthStateChanged };
export type { User };
