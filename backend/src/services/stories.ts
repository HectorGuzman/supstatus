import type { DocumentData, DocumentSnapshot, Query } from 'firebase-admin/firestore';
import { ensureFirebase } from '../config/firebase.js';

const admin = ensureFirebase();
const firestore = admin.firestore();

export type StoryStatus = 'pending' | 'published' | 'archived';

export interface StoryPayload {
  title?: string;
  body?: string;
  spot?: string;
  bestConditions?: string;
  mediaUrl?: string;
}

export interface StoryAdminUpdate {
  status?: StoryStatus;
  featured?: boolean;
  published?: boolean;
}

export interface StoryRecord {
  id: string;
  authorUid: string;
  authorName?: string;
  authorEmail?: string;
  title?: string;
  body?: string;
  spot?: string;
  bestConditions?: string;
  mediaUrl?: string;
  status: StoryStatus;
  featured: boolean;
  likes: number;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  liked?: boolean;
}

interface AuthorMeta {
  displayName?: string | null;
  email?: string | null;
}

const storiesCollection = firestore.collection('stories');

function toISOString(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  if ('toDate' in (value as { toDate?: () => Date }) && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toISOString();
  }
  return null;
}

function serializeStoryDoc(doc: DocumentSnapshot, currentUid?: string | null): StoryRecord | null {
  const data = doc.data();
  if (!data) return null;
  const likes = typeof data.likes === 'number' ? data.likes : 0;
  const likedBy = data.likedBy && typeof data.likedBy === 'object' ? data.likedBy : undefined;
  return {
    id: doc.id,
    authorUid: data.authorUid,
    authorName: data.authorName,
    authorEmail: data.authorEmail,
    title: data.title,
    body: data.body,
    spot: data.spot,
    bestConditions: data.bestConditions,
    mediaUrl: data.mediaUrl,
    status: (data.status as StoryStatus) || 'pending',
    featured: Boolean(data.featured),
    likes,
    publishedAt: toISOString(data.publishedAt),
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
    liked: currentUid ? Boolean(likedBy?.[currentUid]) : undefined,
  };
}

function sanitizePayload(payload: StoryPayload) {
  const sanitized: Record<string, string> = {};
  ([
    ['title', payload.title],
    ['body', payload.body],
    ['spot', payload.spot],
    ['bestConditions', payload.bestConditions],
    ['mediaUrl', payload.mediaUrl],
  ] as const).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length) {
        sanitized[key] = trimmed;
      }
    }
  });
  return sanitized;
}

export async function createUserStory(uid: string, payload: StoryPayload, author: AuthorMeta) {
  const docRef = storiesCollection.doc();
  const sanitized = sanitizePayload(payload);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const bodyText = sanitized.body || payload.body?.trim() || '';
  const displayName = author.displayName?.trim() || '';
  const fallbackTitle =
    sanitized.title
    || (displayName
      ? `Remada de ${displayName}`
      : bodyText
        ? `${bodyText.slice(0, 42)}${bodyText.length > 42 ? '…' : ''}`
        : author.email
          ? `Historia de ${author.email.split('@')[0]}`
          : 'Historia SUP');

  const data: Record<string, unknown> = {
    authorUid: uid,
    authorName: displayName || sanitized.title || author.email || null,
    authorEmail: author.email ?? null,
    likes: 0,
    featured: false,
    status: 'published',
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    title: fallbackTitle,
    body: bodyText,
  };

  Object.entries(sanitized).forEach(([key, value]) => {
    data[key] = value;
  });

  await docRef.set(data);
  const snapshot = await docRef.get();
  return serializeStoryDoc(snapshot);
}

export async function listUserStories(uid: string, limit = 10) {
  try {
    const snapshot = await storiesCollection
      .where('authorUid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs
      .map((doc) => serializeStoryDoc(doc, uid))
      .filter((story): story is StoryRecord => story !== null);
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    if (code === 9 || code === 'failed-precondition' || code === 'FAILED_PRECONDITION') {
      console.warn('[stories] composite index unavailable, falling back to unsorted query');
      const fallbackSnapshot = await storiesCollection
        .where('authorUid', '==', uid)
        .limit(limit * 2)
        .get();
      const results = fallbackSnapshot.docs
        .map((doc) => serializeStoryDoc(doc, uid))
        .filter((story): story is StoryRecord => story !== null);
      return results.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }).slice(0, limit);
    }
    throw error;
  }
}

export async function listPublishedStories(limit = 20, currentUid?: string | null) {
  const snapshot = await storiesCollection
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => serializeStoryDoc(doc, currentUid))
    .filter((story): story is StoryRecord => story !== null);
}

export async function listAllStories(status?: StoryStatus) {
  let query: Query<DocumentData> = storiesCollection;
  if (status) {
    query = query.where('status', '==', status);
  }
  query = query.orderBy('updatedAt', 'desc');
  const snapshot = await query.get();
  return snapshot.docs
    .map((doc) => serializeStoryDoc(doc))
    .filter((story): story is StoryRecord => story !== null);
}

export async function updateStoryAdmin(storyId: string, update: StoryAdminUpdate) {
  const docRef = storiesCollection.doc(storyId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return null;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (typeof update.featured === 'boolean') {
    updates.featured = update.featured;
  }

  if (update.status) {
    if (!['pending', 'published', 'archived'].includes(update.status)) {
      throw new Error('Estado de historia inválido.');
    }
    updates.status = update.status;
    updates.publishedAt = update.status === 'published' ? now : null;
  }

  await docRef.set(updates, { merge: true });
  const refreshed = await docRef.get();
  return serializeStoryDoc(refreshed);
}

export async function deleteUserStory(storyId: string, uid: string) {
  const docRef = storiesCollection.doc(storyId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return { removed: false, reason: 'NOT_FOUND' as const };
  }
  const data = snapshot.data();
  if (!data || data.authorUid !== uid) {
    return { removed: false, reason: 'FORBIDDEN' as const };
  }
  await docRef.delete();
  return { removed: true as const };
}

export async function deleteStoryAdmin(storyId: string) {
  const docRef = storiesCollection.doc(storyId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return { removed: false, reason: 'NOT_FOUND' as const };
  }
  await docRef.delete();
  return { removed: true as const };
}

export async function toggleStoryLike(storyId: string, uid: string) {
  const docRef = storiesCollection.doc(storyId);
  const result = await firestore.runTransaction(async (tx) => {
    const snapshot = await tx.get(docRef);
    if (!snapshot.exists) {
      throw new Error('NOT_FOUND');
    }
    const data = snapshot.data() || {};
    const likedBy = (data.likedBy && typeof data.likedBy === 'object') ? (data.likedBy as Record<string, boolean>) : {};
    const alreadyLiked = Boolean(likedBy[uid]);
    const likes = typeof data.likes === 'number' ? data.likes : 0;
    const newLikes = alreadyLiked ? Math.max(likes - 1, 0) : likes + 1;
    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      likes: newLikes,
    };
    updates[`likedBy.${uid}`] = alreadyLiked ? admin.firestore.FieldValue.delete() : true;
    tx.set(docRef, updates, { merge: true });
    return { liked: !alreadyLiked, likes: newLikes };
  });

  const updatedSnap = await docRef.get();
  const story = serializeStoryDoc(updatedSnap, uid);
  if (story) {
    story.likes = result.likes;
    story.liked = result.liked;
  }
  return { story, ...result };
}
