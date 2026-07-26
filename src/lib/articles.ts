import { unstable_cache } from 'next/cache';
import { db } from './firebase';
import { ARTICLES_COLLECTION, INDEX_COLLECTION, articleDocId, indexShardId } from './collections';
import { LATEST_SHARD } from './types';
import type { Article, ArticlesIndex, ArticleSummary, TranslatedArticle } from './types';
import { SITE } from './site.config';
import { LANGS, type AnyLang, type Lang } from './i18n';

const CACHE_REVALIDATE = 21600; // 6h — invalidated eagerly by /api/revalidate on publish
const CACHE_TAG = 'articles';

export type { ArticleSummary } from './types';

async function readShard(specialtySlug: string, lang: AnyLang = 'ko'): Promise<ArticleSummary[] | null> {
  const snap = await db.collection(INDEX_COLLECTION).doc(indexShardId(specialtySlug, lang)).get();
  if (!snap.exists) return null;
  return (snap.data() as ArticlesIndex | undefined)?.items ?? [];
}

/**
 * Latest articles across every specialty. Reads one small shard (`_latest`, capped at
 * 100) rather than the whole index.
 */
export const getLatestArticles = unstable_cache(
  async (limit = 6, lang: AnyLang = 'ko'): Promise<ArticleSummary[]> => {
    const items = (await readShard(LATEST_SHARD, lang)) ?? [];
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
  async (specialtySlug?: string, limit?: number, lang: AnyLang = 'ko'): Promise<ArticleSummary[]> => {
    let items: ArticleSummary[];

    if (specialtySlug) {
      items = (await readShard(specialtySlug, lang)) ?? [];
    } else {
      const shards = await Promise.all(
        SITE.specialties.map(s => readShard(s.slug || 'general', lang))
      );
      items = shards.flatMap(s => s ?? []);
      items.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    }

    return limit ? items.slice(0, limit) : items;
  },
  ['getArticles'],
  { revalidate: CACHE_REVALIDATE, tags: [CACHE_TAG] }
);

/** One Korean article. The document id IS the slug, so this is a direct doc read. */
export const getArticle = unstable_cache(
  async (slug: string): Promise<Article | null> => {
    const doc = await db.collection(ARTICLES_COLLECTION).doc(slug).get();
    if (!doc.exists) return null;
    return doc.data() as Article;
  },
  ['getArticle'],
  { revalidate: CACHE_REVALIDATE, tags: [CACHE_TAG] }
);

/**
 * 번역본 + 그 원문의 병원 데이터.
 *
 * 번역 문서에는 hospitals가 없다(types.ts 참조). 두 문서를 동시에 읽어 합친다.
 * 번역본이 없으면 null — 호출부가 404를 낸다. 한국어 글로 대신 보여주지 않는다:
 * /en/... 경로에서 한국어 본문이 나오면 그 URL이 영어 페이지로 색인된 뒤 읽을 수
 * 없는 내용을 담게 되고 hreflang과도 어긋난다.
 */
export const getTranslatedArticle = unstable_cache(
  async (slug: string, lang: AnyLang): Promise<Article | null> => {
    if (lang === 'ko') {
      const doc = await db.collection(ARTICLES_COLLECTION).doc(slug).get();
      return doc.exists ? (doc.data() as Article) : null;
    }
    const [tr, ko] = await Promise.all([
      db.collection(ARTICLES_COLLECTION).doc(articleDocId(slug, lang)).get(),
      db.collection(ARTICLES_COLLECTION).doc(slug).get(),
    ]);
    if (!tr.exists || !ko.exists) return null;
    const t = tr.data() as TranslatedArticle;
    const k = ko.data() as Article;
    return { ...k, id: t.id, title: t.title, metaDescription: t.metaDescription, content: t.content };
  },
  ['getTranslatedArticle'],
  { revalidate: CACHE_REVALIDATE, tags: [CACHE_TAG] }
);

/** 이 slug에 번역본이 존재하는 언어들. hreflang alternates 생성에 쓴다. */
export const getAvailableLangs = unstable_cache(
  async (slug: string): Promise<Lang[]> => {
    const snaps = await db.getAll(
      ...LANGS.map(l => db.collection(ARTICLES_COLLECTION).doc(articleDocId(slug, l)))
    );
    return LANGS.filter((_, i) => snaps[i].exists);
  },
  ['getAvailableLangs'],
  { revalidate: CACHE_REVALIDATE, tags: [CACHE_TAG] }
);

/** Every published slug, for the sitemap. One read per specialty shard. */
export const getAllArticleSlugs = unstable_cache(
  async (lang: AnyLang = 'ko'): Promise<{ slug: string; publishedAt?: string }[]> => {
    const shards = await Promise.all(
      SITE.specialties.map(s => readShard(s.slug || 'general', lang))
    );

    if (shards.every(s => s === null)) {
      // 샤드가 하나도 없으면 사이트맵이 조용히 비는 것을 막기 위해 스캔으로 폴백한다.
      // 번역 언어는 폴백하지 않는다 — 샤드가 없다는 건 아직 그 언어 번역이 없다는
      // 뜻이고, 스캔하면 번역이 없는 URL까지 사이트맵에 올라가 404를 색인시킨다.
      if (lang !== 'ko') return [];
      const snapshot = await db.collection(ARTICLES_COLLECTION).select('slug', 'publishedAt').get();
      return snapshot.docs
        .filter(d => !d.id.includes('__'))
        .map(d => {
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
  async (lang: AnyLang = 'ko'): Promise<Record<string, number>> => {
    const entries = await Promise.all(
      SITE.specialties.map(async s => {
        const slug = s.slug || 'general';
        const snap = await db.collection(INDEX_COLLECTION).doc(indexShardId(slug, lang)).get();
        return [slug, (snap.data() as ArticlesIndex | undefined)?.count ?? 0] as const;
      })
    );
    return Object.fromEntries(entries);
  },
  ['getSpecialtyCounts'],
  { revalidate: CACHE_REVALIDATE, tags: [CACHE_TAG] }
);
