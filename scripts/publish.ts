import './lib/env';
import { appendFileSync } from 'node:fs';
import type { Browser } from 'puppeteer-core';
import { SITE } from '../src/lib/site.config';
import { getBaseUrl } from '../src/lib/site-url';
import type { Article, HospitalInfo, KeywordEntry } from '../src/lib/types';
import { launchBrowser, delay } from './lib/browser';
import {
  searchNaver, getPlaceInfo, searchKakao, searchGoogle,
  prefilterKakaoCandidates, matchesSpecialty,
} from './lib/scrape';
import { batchMatchKakao, type PendingMatch } from './lib/match';
import { generateArticle } from './lib/generate';
import { withRetry } from './lib/errors';
import {
  pickNext, markInProgress, markPublished, giveUp, reclaimStaleInProgress, MAX_ATTEMPTS,
} from './lib/store';
import { saveArticle } from './lib/store';
import { looksRestricted } from '../src/lib/restricted';

// --- CLI ------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const value = (name: string) => {
  const hit = argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const OPTS = {
  count: Number(value('count') ?? 1),
  noDelay: flag('no-delay'),
  distinctRegion: flag('distinct-region'),
  keyword: value('keyword'),
  noIndexNow: flag('no-indexnow'),
  dryRun: flag('dry-run'),
};

const MIN_HOSPITALS = 3;
const TARGET_HOSPITALS = 5;

// --- scraping -------------------------------------------------------------
async function collectHospitals(browser: Browser, kw: KeywordEntry): Promise<HospitalInfo[]> {
  const queries = [kw.keyword];
  // Specialty queries can come back thin or off-specialty; fall back to the bare
  // region query rather than failing the keyword outright. (The older production
  // runner never had this fallback — only the unused lib path did.)
  if (kw.specialtySlug !== 'general') queries.push(`${kw.region} ${SITE.categoryKo}`);

  const hospitals: HospitalInfo[] = [];
  const seen = new Set<string>();
  const pending: PendingMatch[] = [];

  for (const query of queries) {
    if (hospitals.length >= TARGET_HOSPITALS) break;
    console.log(`  [scrape] "${query}"`);
    const places = await searchNaver(browser, query);
    console.log(`  [scrape] ${places.length} places`);

    for (const place of places) {
      if (hospitals.length >= TARGET_HOSPITALS) break;
      if (seen.has(place.id)) continue;
      seen.add(place.id);

      try {
        await delay(1500);
        const { detail, reviews } = await getPlaceInfo(browser, place.id);
        const name = detail.name || place.name;

        if (looksRestricted(name)) {
          console.log(`    skip ${name}: Naver restriction banner`);
          continue;
        }
        // Naver returns 재활의학과/통증의학과 for an 정형외과 query, 안과 for a
        // 성형외과 query, and so on. Reject anything whose own category line does
        // not match this site's specialty.
        if (!matchesSpecialty(detail.category)) {
          console.log(`    skip ${name}: category "${detail.category}" not in [${SITE.categoryHints}]`);
          continue;
        }

        const [kakaoRes, googleRes] = await Promise.allSettled([
          searchKakao(browser, name),
          searchGoogle(browser, name, kw.region),
        ]);

        let kakaoRating: number | null = null;
        let kakaoReviewCount = 0;
        if (kakaoRes.status === 'fulfilled') {
          const filtered = prefilterKakaoCandidates(name, kakaoRes.value);
          if (filtered.length === 1) {
            kakaoRating = filtered[0].rating;
            kakaoReviewCount = filtered[0].reviewCount;
          } else if (filtered.length > 1) {
            pending.push({
              placeId: place.id, hospitalName: name,
              address: detail.address, phone: detail.phone, candidates: filtered,
            });
          }
        }
        const google = googleRes.status === 'fulfilled'
          ? googleRes.value
          : { rating: null, reviewCount: 0 };

        hospitals.push({
          id: place.id,
          name,
          category: detail.category || '',
          address: detail.address || '',
          phone: detail.phone || '',
          businessHours: detail.businessHours || '',
          specialistsInfo: detail.specialistsInfo || '',
          facilities: detail.facilities || '',
          directions: detail.directions || '',
          naverReviewCount: detail.naverReviewCount || 0,
          naverBlogReviewCount: detail.naverBlogReviewCount || 0,
          naverStarRating: detail.naverStarRating ?? null,
          naverReviews: reviews,
          kakaoRating,
          kakaoReviewCount,
          kakaoReviews: [],
          googleRating: google.rating,
          googleReviewCount: google.reviewCount,
          imageUrls: detail.imageUrls || [],
          homepage: detail.homepage || '',
          blogUrl: detail.blogUrl || '',
          instagramUrl: detail.instagramUrl || '',
          youtubeUrl: detail.youtubeUrl || '',
          facebookUrl: detail.facebookUrl || '',
        });
        console.log(`    + ${name} (naver ${detail.naverReviewCount})`);
      } catch (e) {
        console.log(`    ! ${place.name}: ${(e as Error).message.slice(0, 90)}`);
      }
    }
  }

  if (pending.length) {
    const matched = await batchMatchKakao(pending);
    for (const [placeId, kakao] of matched) {
      const h = hospitals.find(x => x.id === placeId);
      if (h) {
        h.kakaoRating = kakao.rating;
        h.kakaoReviewCount = kakao.reviewCount;
      }
    }
    console.log(`  [match] resolved ${matched.size}/${pending.length}`);
  }

  return hospitals;
}

// --- one keyword ----------------------------------------------------------
async function publishOne(browser: Browser, kw: KeywordEntry): Promise<Article | null> {
  const attempt = (kw.retryCount ?? 0) + 1;
  console.log(`\n${'='.repeat(64)}`);
  console.log(`[publish] ${kw.keyword}  (order ${kw.order}, attempt ${attempt}/${MAX_ATTEMPTS})`);
  console.log('='.repeat(64));

  await markInProgress(kw);

  const hospitals = await collectHospitals(browser, kw);
  if (hospitals.length < MIN_HOSPITALS) {
    const status = await giveUp(kw, `only ${hospitals.length} hospitals (min ${MIN_HOSPITALS})`);
    console.log(`  [skip] ${hospitals.length} hospitals → ${status}`);
    return null;
  }

  console.log(`  [generate] ${ hospitals.length} hospitals → ${SITE.categoryKo} article`);
  const generated = await withRetry(() => generateArticle(kw, hospitals), { label: 'generate' });

  const now = new Date().toISOString();
  const article: Article = {
    id: kw.slug,
    keywordId: kw.id,
    keyword: kw.keyword,
    slug: kw.slug,
    specialty: kw.specialty,
    specialtySlug: kw.specialtySlug,
    region: kw.region,
    title: generated.title,
    metaDescription: generated.metaDescription,
    content: generated.content,
    hospitals,
    publishedAt: now,
  };

  if (OPTS.dryRun) {
    console.log(`  [dry-run] would save /${article.slug}`);
    console.log(`  title: ${article.title}`);
    console.log(`  content: ${article.content.length} chars`);
    return article;
  }

  await saveArticle(article);
  await markPublished(kw, now);
  console.log(`  [saved] /${article.slug} — ${article.title}`);

  await revalidateSite();

  if (!OPTS.noIndexNow) {
    appendFileSync('.indexnow-pending.txt', `${getBaseUrl()}/${article.slug}\n`);
  }
  return article;
}

/**
 * Purge the deployed site's data cache so the new article shows up in listings and
 * the sitemap immediately.
 *
 * Without this, `getArticles` / `getLatestArticles` / `getAllArticleSlugs` stay stale
 * for up to CACHE_REVALIDATE (6h) — the article URL itself resolves right away (its
 * cache key is new), but the home page, the specialty listing, and crucially the
 * sitemap keep serving the old set, which delays search-engine discovery.
 *
 * Best-effort: a failure here must never fail an otherwise-good publish, and it is
 * expected to fail locally when no dev server is running on NEXT_PUBLIC_SITE_URL.
 */
async function revalidateSite(): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;
  if (!baseUrl || !secret) {
    console.log('  [revalidate] skipped (NEXT_PUBLIC_SITE_URL or CRON_SECRET unset)');
    return;
  }
  try {
    const res = await fetch(`${baseUrl}/api/revalidate?tag=articles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(15000),
    });
    console.log(`  [revalidate] ${res.status} ${baseUrl}`);
  } catch (e) {
    console.log(`  [revalidate] failed (non-fatal): ${(e as Error).message.slice(0, 80)}`);
  }
}

// --- main -----------------------------------------------------------------
async function main() {
  console.log(`[${SITE.key}] publish — count=${OPTS.count}${OPTS.dryRun ? ' (dry-run)' : ''}`);

  const reclaimed = await reclaimStaleInProgress();
  if (reclaimed) console.log(`[queue] reclaimed ${reclaimed} stale in_progress → pending`);

  if (!OPTS.noDelay && !OPTS.keyword) {
    // 0-3 min, not 0-10. On GitHub Actions this sleep happens ON a billable runner,
    // so a 10-minute jitter averaged 5 idle minutes per run — across 5 sites × 8
    // runs/day that was ~200 wasted runner-minutes a day. GitHub's cron is already
    // imprecise (frequently minutes late under load), so a smaller jitter still
    // avoids hitting Naver on an exact clock tick.
    const ms = Math.floor(Math.random() * 3 * 60 * 1000);
    console.log(`[queue] jitter ${(ms / 60000).toFixed(1)}min`);
    await delay(ms);
  }

  const browser = await launchBrowser();
  const usedRegions = new Set<string>();
  let ok = 0;

  try {
    for (let i = 0; i < OPTS.count; i++) {
      const kw = await pickNext({
        keywordId: OPTS.keyword,
        excludeRegions: OPTS.distinctRegion ? usedRegions : undefined,
      });
      if (!kw) { console.log('[queue] empty — nothing to publish'); break; }

      try {
        const article = await publishOne(browser, kw);
        if (article) { ok++; usedRegions.add(kw.regionSlug); }
      } catch (e) {
        const status = await giveUp(kw, (e as Error).message);
        console.error(`  [fail] ${kw.keyword}: ${(e as Error).message.slice(0, 160)} → ${status}`);
      }
      if (OPTS.keyword) break;
    }
  } finally {
    await browser.close().catch(() => {});
  }

  console.log(`\n[${SITE.key}] done: ${ok}/${OPTS.count} published`);
  process.exit(ok > 0 || OPTS.count === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
