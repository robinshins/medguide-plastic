import { unstable_cache } from 'next/cache';
import { db } from './firebase';
import { ARTICLES_COLLECTION, INDEX_COLLECTION } from './collections';
import { LATEST_SHARD } from './types';
import type { Article, ArticlesIndex, ArticleSummary } from './types';
import { SITE } from './site.config';

const CACHE_REVALIDATE = 21600; // 6h — invalidated eagerly by /api/revalidate on publish
const CACHE_TAG = 'articles';

export type { ArticleSummary } from './types';

async function readShard(specialtySlug: string): Promise<ArticleSummary[] | null> {
  const snap = await db.collection(INDEX_COLLECTION).doc(specialtySlug).get();
  if (!snap.exists) return null;
  return (snap.data() as ArticlesIndex | undefined)?.items ?? [];
}

/**
 * Latest articles across every specialty. Reads one small shard (`_latest`, capped at
 * 100) rather than the whole index.
 */
export const getLatestArticles = unstable_cache(
  async (limit = 6): Promise<ArticleSummary[]> => {
    const items = (await readShard(LATEST_SHARD)) ?? [];
    return items.slice(0, limit);
  },
  ['getLatestArticles'],
  { revalidate: CACHE_REVALIDATE, tags: [CACHE_TAG] }
);

/**
 * Articles for one specialty, or all specialties merged when `specialtySlug` is omitted.
 * The merged path reads one doc per specialty (≤12 reads) — still far cheaper than the
 * collection scan the previous sites fell back to.
 */
export const getArticles = unstable_cache(
  async (specialtySlug?: string, limit?: number): Promise<ArticleSummary[]> => {
    let items: ArticleSummary[];

    if (specialtySlug) {
      items = (await readShard(specialtySlug)) ?? [];
    } else {
      const shards = await Promise.all(
        SITE.specialties.map(s => readShard(s.slug || 'general'))
      );
      items = shards.flatMap(s => s ?? []);
      items.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    }

    return limit ? items.slice(0, limit) : items;
  },
  ['getArticles'],
  { revalidate: CACHE_REVALIDATE, tags: [CACHE_TAG] }
);

/**
 * One article. The document id IS the slug — no language, no category prefix — so this
 * is a direct doc read rather than a query.
 */
export const getArticle = unstable_cache(
  async (slug: string): Promise<Article | null> => {
    const doc = await db.collection(ARTICLES_COLLECTION).doc(slug).get();
    if (!doc.exists) return null;
    return doc.data() as Article;
  },
  ['getArticle'],
  { revalidate: CACHE_REVALIDATE, tags: [CACHE_TAG] }
);

/** Every published slug, for the sitemap. One read per specialty shard. */
export const getAllArticleSlugs = unstable_cache(
  async (): Promise<{ slug: string; publishedAt?: string }[]> => {
    const shards = await Promise.all(
      SITE.specialties.map(s => readShard(s.slug || 'general'))
    );

    if (shards.every(s => s === null)) {
      // Nothing seeded yet, or every shard is missing — fall back to a scan so the
      // sitemap is never silently empty.
      const snapshot = await db.collection(ARTICLES_COLLECTION).select('slug', 'publishedAt').get();
      return snapshot.docs.map(d => {
        const data = d.data();
        return { slug: data.slug as string, publishedAt: data.publishedAt as string | undefined };
      });
    }

    const seen = new Set<string>();
    const out: { slug: string; publishedAt?: string }[] = [];
    for (const items of shards) {
      for (const a of items ?? []) {
        if (seen.has(a.slug)) continue;
        seen.add(a.slug);
        out.push({ slug: a.slug, publishedAt: a.publishedAt });
      }
    }
    return out;
  },
  ['getAllArticleSlugs'],
  { revalidate: CACHE_REVALIDATE, tags: [CACHE_TAG] }
);

/** Published count per specialty, for nav badges and the home stats bar. */
export const getSpecialtyCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const entries = await Promise.all(
      SITE.specialties.map(async s => {
        const slug = s.slug || 'general';
        const snap = await db.collection(INDEX_COLLECTION).doc(slug).get();
        return [slug, (snap.data() as ArticlesIndex | undefined)?.count ?? 0] as const;
      })
    );
    return Object.fromEntries(entries);
  },
  ['getSpecialtyCounts'],
  { revalidate: CACHE_REVALIDATE, tags: [CACHE_TAG] }
);
