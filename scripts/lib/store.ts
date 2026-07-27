import { db } from '../../src/lib/firebase';
import {
  ARTICLES_COLLECTION, INDEX_COLLECTION, KEYWORDS_COLLECTION,
  articleDocId, indexShardId,
} from '../../src/lib/collections';
import { LATEST_SHARD, LATEST_SHARD_SIZE } from '../../src/lib/types';
import { LANGS } from '../../src/lib/i18n';
import type {
  Article, ArticleSummary, ArticlesIndex, HospitalInfo, KeywordEntry, TranslatedArticle,
} from '../../src/lib/types';

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

/**
 * 병원 카드 순서를 기사 본문의 순위에 맞춘다.
 *
 * hospitals 배열은 네이버 검색 결과 순서일 뿐인데 카드에는 1~5 번호가 붙고 제목도
 * "추천"이라 독자는 순위로 읽는다. 글이 1위로 꼽은 병원이 카드에서 4번으로 나오는
 * 일이 실제로 있었다.
 *
 * 본문 <h3>에 병원명이 그대로 들어가므로 그 등장 순서로 재정렬한다. 매칭하지 못한
 * 병원은 뒤에 원래 순서로 남겨, 못 맞춘 글이 지금보다 나빠지지 않게 한다.
 *
 * 번역본은 hospitals를 복사하지 않고 한국어 문서에서 읽으므로(articles.ts의
 * getTranslatedArticle) 여기서 한 번 정렬하면 6개 언어가 모두 같은 순서를 갖는다.
 */
export function orderHospitalsByBody(content: string, hospitals: HospitalInfo[]): HospitalInfo[] {
  if (!content || hospitals.length < 2) return hospitals;
  const heads = [...content.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map(m => m[1].replace(/<[^>]+>/g, ''));
  const used = new Set<number>();
  const ordered: HospitalInfo[] = [];
  for (const head of heads) {
    // 같은 브랜드 분점이 섞일 수 있으므로 가장 긴 일치를 고른다.
    let best = -1, bestLen = 0;
    hospitals.forEach((h, i) => {
      if (used.has(i) || !h.name) return;
      if (head.includes(h.name) && h.name.length > bestLen) { best = i; bestLen = h.name.length; }
    });
    if (best >= 0) { used.add(best); ordered.push(hospitals[best]); }
  }
  hospitals.forEach((h, i) => { if (!used.has(i)) ordered.push(h); });
  return ordered;
}

export async function saveArticle(article: Article): Promise<void> {
  // 저장 직전에 정렬한다 — 호출부가 잊을 수 없도록 여기에 둔다.
  article = { ...article, hospitals: orderHospitalsByBody(article.content, article.hospitals || []) };
  // Document id IS the slug — no language, no category prefix.
  await db.collection(ARTICLES_COLLECTION).doc(article.slug).set(article);
  const summary = toSummary(article);
  await upsertShard(article.specialtySlug, summary);
  await upsertShard(LATEST_SHARD, summary, LATEST_SHARD_SIZE);
}

/**
 * 번역본 저장 + 해당 언어의 인덱스 샤드 갱신.
 *
 * 샤드가 언어별로 분리돼 있어(`implant__en`) 한국어 목록에 번역본이 섞이지 않고,
 * 그 반대도 마찬가지다. 언어별 목록·사이트맵이 샤드 1회 읽기로 끝난다.
 */
export async function saveTranslation(t: TranslatedArticle): Promise<void> {
  await db.collection(ARTICLES_COLLECTION).doc(t.id).set(t);
  const summary: ArticleSummary = {
    id: t.id,
    slug: t.slug,
    title: t.title,
    metaDescription: t.metaDescription,
    publishedAt: t.publishedAt,
    specialty: t.specialty,
    specialtySlug: t.specialtySlug,
    region: t.region,
  };
  await upsertShard(indexShardId(t.specialtySlug, t.lang), summary);
  await upsertShard(indexShardId(LATEST_SHARD, t.lang), summary, LATEST_SHARD_SIZE);
}

/** 이미 번역본이 있는 언어 목록. 백필이 중복 작업을 하지 않도록. */
export async function existingTranslationLangs(slug: string): Promise<Set<string>> {
  const ids = LANGS.map(l => articleDocId(slug, l));
  const refs = ids.map(id => db.collection(ARTICLES_COLLECTION).doc(id));
  const snaps = await db.getAll(...refs);
  const out = new Set<string>();
  snaps.forEach((s, i) => { if (s.exists) out.add(LANGS[i]); });
  return out;
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
