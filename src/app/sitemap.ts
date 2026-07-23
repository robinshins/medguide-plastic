import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site.config';
import { getAllArticleSlugs } from '@/lib/articles';
import { getAllBlogPosts } from '@/lib/blog';

// 1h ISR floor. scripts/publish.ts also POSTs /api/revalidate?tag=articles right after
// each publish, and revalidateTag('articles') purges this route's cache too — so a new
// article normally lands in the sitemap within seconds, not an hour.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${SITE.domain}`;

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
