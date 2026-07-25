import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/site-url';
import { SITE } from '@/lib/site.config';
import { getAllArticleSlugs } from '@/lib/articles';
import { getAllBlogPosts } from '@/lib/blog';

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

  return entries;
}
