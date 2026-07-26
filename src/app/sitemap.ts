import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/site-url';
import { SITE } from '@/lib/site.config';
import { getAllArticleSlugs } from '@/lib/articles';
import { getAllBlogPosts } from '@/lib/blog';
import { LANGS, localePath } from '@/lib/i18n';

// 5-minute route cache. Do NOT set `dynamic = 'force-dynamic'` here — tried in
// production and Next.js served a 404 for /sitemap.xml; metadata routes must stay
// statically rendered.
//
// Also verified: neither revalidateTag('articles') nor revalidatePath('/sitemap.xml')
// purges a metadata route's cache, so this interval is the real freshness bound —
// a new article appears in the sitemap within 5 minutes of publishing, while the home
// page and listings update instantly via the tag.
//
// Cost is negligible: getAllArticleSlugs() is wrapped in unstable_cache tagged
// 'articles', so a regeneration only hits Firestore when a publish has purged that
// tag; otherwise it re-renders from cached data.
//
// Search engines are not waiting on this anyway — scripts/publish.ts queues each new
// URL for IndexNow, which notifies Bing/Naver directly at publish time.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/pricing`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog`, changeFrequency: 'weekly', priority: 0.6 },
  ];

  for (const s of SITE.specialties) {
    entries.push({
      url: `${baseUrl}/s/${s.slug || 'general'}`,
      changeFrequency: 'daily',
      priority: 0.9,
    });
  }

  for (const key of ['about', 'privacy', 'terms', 'contact']) {
    entries.push({ url: `${baseUrl}/${key}`, changeFrequency: 'yearly', priority: 0.3 });
  }

  for (const post of getAllBlogPosts()) {
    entries.push({
      url: `${baseUrl}/blog/${post.slug}`,
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  }

  const articles = await getAllArticleSlugs();
  for (const a of articles) {
    entries.push({
      url: `${baseUrl}/${a.slug}`,
      lastModified: a.publishedAt ? new Date(a.publishedAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // 번역본. 언어별 인덱스 샤드를 읽으므로 실제로 번역이 존재하는 URL만 올라간다
  // (getAllArticleSlugs는 번역 언어에서 컬렉션 스캔으로 폴백하지 않는다).
  // 번역 홈·진료항목 목록도 함께 넣는다 — 글만 넣으면 진입점이 색인되지 않는다.
  const perLang = await Promise.all(
    LANGS.map(async l => [l, await getAllArticleSlugs(l)] as const)
  );
  for (const [lang, slugs] of perLang) {
    if (!slugs.length) continue;
    entries.push({ url: `${baseUrl}${localePath(lang)}`, changeFrequency: 'daily', priority: 0.7 });
    for (const s of SITE.specialties) {
      entries.push({
        url: `${baseUrl}${localePath(lang, `s/${s.slug || 'general'}`)}`,
        changeFrequency: 'daily',
        priority: 0.6,
      });
    }
    for (const a of slugs) {
      entries.push({
        url: `${baseUrl}${localePath(lang, a.slug)}`,
        lastModified: a.publishedAt ? new Date(a.publishedAt) : undefined,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
