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

export async function getUserStory(uid: string) {
  const snapshot = await storiesCollection.doc(uid).get();
  if (!snapshot.exists) return null;
  return serializeStoryDoc(snapshot);
}

export async function upsertUserStory(uid: string, payload: StoryPayload, author: AuthorMeta) {
  const docRef = storiesCollection.doc(uid);
  const existingSnap = await docRef.get();
  const sanitized = sanitizePayload(payload);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const authorName = author.displayName?.trim() || sanitized.title || author.email || null;
  const bodyText = sanitized.body || payload.body?.trim() || '';
  const fallbackTitle =
    sanitized.title ||
    (author.displayName?.trim()
      ? `${author.displayName.trim()} en La Herradura`
      : bodyText
        ? `${bodyText.slice(0, 42)}${bodyText.length > 42 ? '…' : ''}`
        : author.email
          ? `Historia de ${author.email.split('@')[0]}`
          : 'Historia SUP');
  const nextData: Record<string, unknown> = {
    ...sanitized,
    authorUid: uid,
    authorName,
    authorEmail: author.email ?? null,
    updatedAt: now,
    title: fallbackTitle,
    body: bodyText,
  };

  if (payload.mediaUrl !== undefined) {
    if (typeof payload.mediaUrl === 'string' && payload.mediaUrl.trim().length) {
      nextData.mediaUrl = payload.mediaUrl.trim();
    } else {
      nextData.mediaUrl = admin.firestore.FieldValue.delete();
    }
  }

  if (payload.spot !== undefined) {
    if (typeof payload.spot === 'string' && payload.spot.trim().length) {
      nextData.spot = payload.spot.trim();
    } else {
      nextData.spot = admin.firestore.FieldValue.delete();
    }
  }

  const exists = existingSnap.exists;
  if (!exists) {
    nextData.createdAt = now;
    nextData.likes = 0;
    nextData.featured = false;
    nextData.status = 'published';
    nextData.publishedAt = now;
  } else {
    const existingData = existingSnap.data() || {};
    nextData.likes = typeof existingData.likes === 'number' ? existingData.likes : 0;
    nextData.featured = Boolean(existingData.featured);
    const previousStatus = typeof existingData.status === 'string' ? (existingData.status as StoryStatus) : 'published';
    const shouldPublish = previousStatus !== 'archived';
    nextData.status = shouldPublish ? 'published' : 'archived';
    nextData.publishedAt = shouldPublish ? now : existingData.publishedAt ?? null;
    nextData.createdAt = existingData.createdAt || now;
  }

  await docRef.set(nextData, { merge: true });
  const updatedSnap = await docRef.get();
  return serializeStoryDoc(updatedSnap);
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
