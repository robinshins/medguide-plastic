import { db } from '../../src/lib/firebase';
import {
  ARTICLES_COLLECTION, INDEX_COLLECTION, KEYWORDS_COLLECTION,
} from '../../src/lib/collections';
import { LATEST_SHARD, LATEST_SHARD_SIZE } from '../../src/lib/types';
import type { Article, ArticleSummary, ArticlesIndex, KeywordEntry } from '../../src/lib/types';

export function toSummary(a: Article): ArticleSummary {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    metaDescription: a.metaDescription,
    publishedAt: a.publishedAt,
    specialty: a.specialty,
    specialtySlug: a.specialtySlug,
    region: a.region,
  };
}

/**
 * Upsert one summary into a shard, newest first. `cap` bounds `_latest`; specialty
 * shards are uncapped (~450 items ≈ 180KB, well under Firestore's 1MB doc limit).
 * The previous sites kept ALL articles in a single doc per language and silently
 * truncated at 500, which left the sitemap missing thousands of URLs.
 */
async function upsertShard(shard: string, summary: ArticleSummary, cap?: number): Promise<void> {
  const ref = db.collection(INDEX_COLLECTION).doc(shard);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? ((snap.data() as ArticlesIndex).items ?? []) : [];
    const filtered = existing.filter(s => s.id !== summary.id);
    filtered.push(summary);
    filtered.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    const items = cap ? filtered.slice(0, cap) : filtered;
    tx.set(ref, {
      specialtySlug: shard,
      items,
      count: items.length,
      updatedAt: new Date().toISOString(),
    } satisfies ArticlesIndex);
  });
}

export async function saveArticle(article: Article): Promise<void> {
  // Document id IS the slug — no language, no category prefix.
  await db.collection(ARTICLES_COLLECTION).doc(article.slug).set(article);
  const summary = toSummary(article);
  await upsertShard(article.specialtySlug, summary);
  await upsertShard(LATEST_SHARD, summary, LATEST_SHARD_SIZE);
}

export async function markPublished(kw: KeywordEntry, publishedAt: string): Promise<void> {
  await db.collection(KEYWORDS_COLLECTION).doc(kw.id).set({
    ...kw,
    status: 'published',
    publishedAt,
    retryCount: 0,
    lastError: null,
    lastAttemptAt: publishedAt,
  });
}

export const MAX_ATTEMPTS = 3;

/**
 * A failure used to set status='failed' permanently while the queue only read
 * 'pending' — so any transient error removed a keyword from the queue forever. That
 * is how the older dental site ended up with its highest-population keywords
 * unpublished while lower-priority ones shipped.
 */
export async function giveUp(kw: KeywordEntry, reason: string): Promise<'failed' | 'pending'> {
  const attempt = (kw.retryCount ?? 0) + 1;
  const status = attempt >= MAX_ATTEMPTS ? 'failed' : 'pending';
  await db.collection(KEYWORDS_COLLECTION).doc(kw.id).update({
    status,
    retryCount: attempt,
    lastError: String(reason).slice(0, 300),
    lastAttemptAt: new Date().toISOString(),
  });
  return status;
}

export async function markInProgress(kw: KeywordEntry): Promise<void> {
  await db.collection(KEYWORDS_COLLECTION).doc(kw.id).update({
    status: 'in_progress',
    lastAttemptAt: new Date().toISOString(),
  });
}

const STALE_IN_PROGRESS_MS = 60 * 60 * 1000;

/** A runner killed mid-publish leaves the keyword at in_progress forever. Reclaim it. */
export async function reclaimStaleInProgress(): Promise<number> {
  const snap = await db.collection(KEYWORDS_COLLECTION).where('status', '==', 'in_progress').get();
  if (snap.empty) return 0;
  const cutoff = Date.now() - STALE_IN_PROGRESS_MS;
  const stale = snap.docs.filter(d => {
    const at = d.data().lastAttemptAt as string | undefined;
    return !at || new Date(at).getTime() < cutoff; // missing timestamp ⇒ predates the field ⇒ stale
  });
  if (!stale.length) return 0;

  // Chunked: a single batch caps at 500 writes.
  for (let i = 0; i < stale.length; i += 450) {
    const batch = db.batch();
    stale.slice(i, i + 450).forEach(d => batch.update(d.ref, { status: 'pending' }));
    await batch.commit();
  }
  return stale.length;
}

export interface PickOptions {
  /** Skip keywords whose regionSlug is already in this set (for --distinct-region). */
  excludeRegions?: Set<string>;
  /** Publish one specific keyword id regardless of queue order. */
  keywordId?: string;
}

/**
 * Next keyword by (status, order) — WITHOUT a composite index. The shared Firebase
 * project's service account cannot create indexes (403), and this repo family's
 * long-standing convention is "avoid composite indexes; sort in JS". A status-only
 * query with .select() pulls just {order, regionSlug} per doc (~5K light reads per
 * publish), then the single winner is fetched in full by id.
 */
export async function pickNext(opts: PickOptions = {}): Promise<KeywordEntry | null> {
  if (opts.keywordId) {
    const doc = await db.collection(KEYWORDS_COLLECTION).doc(opts.keywordId).get();
    if (!doc.exists) throw new Error(`keyword "${opts.keywordId}" not found`);
    return { ...(doc.data() as KeywordEntry), id: doc.id };
  }

  for (const status of ['pending', 'failed'] as const) {
    const snap = await db.collection(KEYWORDS_COLLECTION)
      .where('status', '==', status)
      .select('order', 'regionSlug')
      .get();

    let bestId: string | null = null;
    let bestOrder = Infinity;
    for (const doc of snap.docs) {
      const { order, regionSlug } = doc.data() as { order?: number; regionSlug?: string };
      if (opts.excludeRegions?.has(regionSlug ?? '')) continue;
      const o = order ?? Number.MAX_SAFE_INTEGER;
      if (o < bestOrder) { bestOrder = o; bestId = doc.id; }
    }
    if (bestId) {
      const doc = await db.collection(KEYWORDS_COLLECTION).doc(bestId).get();
      return { ...(doc.data() as KeywordEntry), id: doc.id };
    }
  }
  return null;
}
