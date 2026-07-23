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

/** Collections owned by the two older sites. Writing to any of these is a bug. */
export const FORBIDDEN_COLLECTIONS = [
  'keywords', 'keywords_beauty',
  'articles', 'articles_derma',
  'articles-index', 'articles_index',
  'comments',
] as const;
