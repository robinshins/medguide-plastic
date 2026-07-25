// The contract every site's `site.config.ts` must satisfy.
// This file is shared (synced from medguide-core/template); `site.config.ts` is NOT —
// it is installed per project by sync.sh from medguide-core/sites/<key>.ts.

export interface SpecialtyDef {
  /** '' = the catch-all. Produces `{region} {categoryKo}` with specialty '일반'. */
  name: string;
  /** '' = the catch-all. Produces a bare `{regionSlug}` URL with specialtySlug 'general'. */
  slug: string;
  /** Shown in nav/tiles. Falls back to `name` when omitted. */
  label?: string;
  /** One-line description used on the specialty listing page and home tiles. */
  blurb?: string;
}

export interface SiteConfig {
  /** Namespace for every Firestore collection. Never hardcode a collection name. */
  key: string;

  // --- identity -----------------------------------------------------------
  categoryKo: string;        // '안과'
  siteName: string;          // '아이케어 가이드'
  siteTagline: string;
  siteDescription: string;
  trustBadge: string;
  // NOTE: no `domain` and no `contactEmail` here on purpose. These repositories are
  // public (public repos get unlimited free Actions minutes), so nothing that ties a
  // repo to a live site or to a person is committed. Both come from the environment
  // via src/lib/site-url.ts:
  //   NEXT_PUBLIC_SITE_URL      → canonical, sitemap, OG, IndexNow host
  //   NEXT_PUBLIC_CONTACT_EMAIL → footer and legal pages
  gaId?: string;
  adsenseId?: string;
  /** IndexNow key; the matching `public/<key>.txt` must exist. */
  indexNowKey?: string;

  // --- taxonomy -----------------------------------------------------------
  specialties: SpecialtyDef[];

  // --- scraping -----------------------------------------------------------
  /**
   * Substrings that identify a clinic of this specialty in Naver Place's category line.
   * Also used to reject off-specialty results (e.g. 재활의학과 clinics leaking into an
   * 정형외과 query). Passed INTO page.evaluate as an argument — it runs in the browser
   * context and cannot close over module scope.
   */
  categoryHints: string[];
  /** Name suffixes used to spot clinic rows in KakaoMap's flat innerText. */
  clinicNameSuffixes: string[];

  /** schema.org type for hospital JSON-LD. 'Dentist' for 치과, else 'MedicalClinic'. */
  clinicSchemaType?: 'MedicalClinic' | 'Dentist';

  // --- generation ---------------------------------------------------------
  /**
   * How practitioner credentials are described in the article prompt.
   * 한의원 has no HIRA 전문의 records, so it must not be asked for them.
   */
  credentialLabel: string;
  /** Optional per-specialty 시세/보험 context injected into the prompt. */
  priceContext?: Record<string, string>;
}
