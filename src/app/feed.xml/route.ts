import { getBaseUrl } from '@/lib/site-url';
import { SITE } from '@/lib/site.config';
import { readLatestArticles } from '@/lib/articles';
import { getAllBlogPosts } from '@/lib/blog';

// RSS 2.0 — 한국어 최신 글 + 기초상식 블로그. 번역본은 넣지 않는다(같은 글의 6개 언어가
// 한 피드에 섞이면 리더에서 중복으로 보인다).
//
// sitemap.xml/route.ts와 같은 이유로 force-dynamic + 무캐시 읽기 + CDN 캐시를 쓴다.
// 재생성 1회당 Firestore 읽기는 `_latest` 샤드 1건이다.
export const dynamic = 'force-dynamic';

const CACHE_CONTROL = 'public, s-maxage=1800, stale-while-revalidate=86400';
const MAX_ITEMS = 50;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

interface Item {
  title: string;
  url: string;
  description: string;
  date: Date;
}

export async function GET() {
  const baseUrl = getBaseUrl();

  const articles = await readLatestArticles(MAX_ITEMS);
  const items: Item[] = [
    ...articles.map(a => ({
      title: a.title,
      url: `${baseUrl}/${a.slug}`,
      description: a.metaDescription,
      date: new Date(a.publishedAt),
    })),
    ...getAllBlogPosts().map(p => ({
      title: p.title,
      url: `${baseUrl}/blog/${p.slug}`,
      description: p.description,
      date: new Date(p.publishedAt),
    })),
  ]
    .filter(i => !Number.isNaN(i.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, MAX_ITEMS);

  const lastBuild = items[0]?.date ?? new Date();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(SITE.siteName)}</title>
<link>${baseUrl}</link>
<description>${escapeXml(SITE.siteDescription)}</description>
<language>ko</language>
<lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
<atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${items
  .map(
    i => `<item>
<title>${escapeXml(i.title)}</title>
<link>${escapeXml(i.url)}</link>
<guid isPermaLink="true">${escapeXml(i.url)}</guid>
<pubDate>${i.date.toUTCString()}</pubDate>
<description>${escapeXml(i.description)}</description>
</item>`
  )
  .join('\n')}
</channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': CACHE_CONTROL },
  });
}
