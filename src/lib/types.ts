// Single-category sites. Korean is the site's native language and its articles are keyed
// by slug alone (`articles_<key>/gangnam-implant`) — unchanged since launch.
//
// Translations live in the SAME collection under `{slug}__{lang}` and carry only the
// translated prose. They deliberately do NOT copy `hospitals`: that block is most of an
// article document, it is language-independent (names, addresses, review counts), and
// duplicating it five times would both bloat storage and let the copies drift when a
// Korean article is republished. The localized page reads hospitals from the Korean doc.

export interface HospitalInfo {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  businessHours: string;
  specialistsInfo: string;
  facilities: string;
  naverReviewCount: number;
  naverBlogReviewCount: number;
  naverReviews: ReviewItem[];
  kakaoRating: number | null;
  kakaoReviewCount: number;
  kakaoReviews: ReviewItem[];
  googleRating: number | null;
  googleReviewCount: number;
  imageUrls: string[];
  homepage: string;
  blogUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  facebookUrl: string;
  directions: string;
  naverStarRating: number | null;
}

export interface ReviewItem {
  author: string;
  content: string;
  date: string;
  visitCount?: string;
  source: 'naver' | 'kakao';
}

export type KeywordStatus = 'pending' | 'in_progress' | 'published' | 'failed';

export interface KeywordEntry {
  id: string;              // `${SITE.key}-${slug}`
  keyword: string;         // '강남 임플란트 치과'
  region: string;          // '강남'
  regionSlug: string;      // 'gangnam'
  specialty: string;       // '임플란트' | '일반'
  specialtySlug: string;   // 'implant' | 'general'
  slug: string;            // 'gangnam-implant' — the article doc id AND the URL path
  status: KeywordStatus;
  publishedAt: string | null;
  order: number;           // population-tiered; lower publishes first
  retryCount?: number;
  lastError?: string | null;
  lastAttemptAt?: string | null;
}

export interface Article {
  id: string;              // === slug
  keywordId: string;
  keyword: string;
  slug: string;
  specialty: string;
  specialtySlug: string;
  region: string;
  title: string;
  metaDescription: string;
  content: string;         // HTML
  hospitals: HospitalInfo[];
  publishedAt: string;
}

export type ArticleSummary = Pick<
  Article,
  'id' | 'slug' | 'title' | 'metaDescription' | 'publishedAt' | 'specialty' | 'specialtySlug' | 'region'
>;

/**
 * 번역본 문서. `articles_<key>/{slug}__{lang}`.
 * hospitals가 없다 — 한국어 문서에서 읽는다(위 주석 참조).
 */
export interface TranslatedArticle {
  id: string;              // `${slug}__${lang}`
  slug: string;            // 한국어 원문과 동일
  lang: string;            // 'en' | 'ja' | 'zh-CN' | 'zh-TW' | 'th'
  specialty: string;
  specialtySlug: string;
  region: string;
  title: string;
  metaDescription: string;
  content: string;         // 번역된 HTML
  /** 한국어 원문의 publishedAt. 목록 정렬이 언어별로 갈리지 않도록 원문 값을 쓴다. */
  publishedAt: string;
  translatedAt: string;
  translationModel: string;
}

// One document per specialty shard, plus `_latest` for the home page.
// Sharding keeps each doc well under Firestore's 1MB limit — the previous
// single-doc-per-language index was silently truncating at 500 items.
export interface ArticlesIndex {
  specialtySlug: string;
  items: ArticleSummary[];
  updatedAt: string;
  count: number;
}

export const LATEST_SHARD = '_latest';
export const LATEST_SHARD_SIZE = 100;
