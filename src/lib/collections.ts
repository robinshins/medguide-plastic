import { SITE } from './site.config';

// Every Firestore collection name is DERIVED from SITE.key — never written as a literal.
//
// The two pre-existing sites (medicalkoreaguide / medicalkoreaguide_derma) both hardcoded
// 'articles' and ended up writing the same document ids into the same collection; on
// 2026-07-22 they clobbered 156 documents mid-run. This indirection makes that class of
// collision structurally impossible: two sites cannot share a collection unless they
// share a key, and the key is the project identity.
//
// `sync.sh --check` greps src/ and scripts/ for bare collection literals.

export const KEYWORDS_COLLECTION = `keywords_${SITE.key}`;
export const ARTICLES_COLLECTION = `articles_${SITE.key}`;
export const INDEX_COLLECTION = `artindex_${SITE.key}`;
export const COMMENTS_COLLECTION = `comments_${SITE.key}`;

/**
 * 번역본 문서 id. 한국어는 접미사 없이 `{slug}` 그대로 — 이미 발행된 문서를
 * 옮기지 않기 위해서다.
 *
 * 구분자가 `__`인 이유: slug는 toSlug()가 `[a-z0-9-]`만 통과시키므로 밑줄이
 * 들어갈 수 없다. 따라서 `busan-cataract__en`은 어떤 slug와도 충돌하지 않는다.
 * 하이픈 하나였다면 `busan-cataract-en`이 실제 slug일 가능성을 배제할 수 없다.
 */
export function articleDocId(slug: string, lang: string): string {
  return lang === 'ko' ? slug : `${slug}__${lang}`;
}

/** 인덱스 샤드 id. 언어별로 분리한다. */
export function indexShardId(specialtySlug: string, lang: string): string {
  return lang === 'ko' ? specialtySlug : `${specialtySlug}__${lang}`;
}

/** Collections owned by the two older sites. Writing to any of these is a bug. */
export const FORBIDDEN_COLLECTIONS = [
  'keywords', 'keywords_beauty',
  'articles', 'articles_derma',
  'articles-index', 'articles_index',
  'comments',
] as const;
