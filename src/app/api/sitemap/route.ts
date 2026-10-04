import { getBaseUrl } from '@/lib/site-url';
import { SITE } from '@/lib/site.config';
import { getAllArticleSlugs } from '@/lib/articles';
import { getAllBlogPosts } from '@/lib/blog';
import { LANGS, localePath } from '@/lib/i18n';

// /sitemap.xml의 실제 구현. next.config.ts의 rewrite가 /sitemap.xml을 여기로 보낸다.
//
// metadata route(app/sitemap.ts)로 두었을 때는 `revalidate`도
// revalidatePath('/sitemap.xml')도 듣지 않아 배포 시점의 글 목록이 다음 배포까지
// 그대로 나갔다(2026-10-04 실측: eye·komed·ortho·plastic은 9/24 배포 이후 글 0건).
// app/sitemap.xml/route.ts로 옮기는 것도 안 된다 — 로컬 dev에서는 동작하지만 Vercel
// 프로덕션 빌드에서는 라우트가 잡히지 않아 /[seg]로 떨어지며 404가 났다(같은 날 실측).
// 그래서 경로명이 특별 취급되지 않는 /api/sitemap에 두고 rewrite로 연결한다.
//
// 요청마다 Firestore를 읽되 CDN이 30분간 응답을 들고 있으므로 재생성은 많아야
// 하루 48회, 회당 읽기는 (진료항목 수 × 언어 6개)건이다. 새 글은 늦어도 30분 안에
// 사이트맵에 오른다.
export const dynamic = 'force-dynamic';

const CACHE_CONTROL = 'public, s-maxage=1800, stale-while-revalidate=86400';

interface Entry {
  url: string;
  lastModified?: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function isoDate(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export async function GET() {
  const baseUrl = getBaseUrl();

  const entries: Entry[] = [
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
      lastModified: isoDate(post.publishedAt),
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  }

  // 한국어 + 번역본. 언어별 인덱스 샤드를 읽으므로 실제로 번역이 존재하는 URL만
  // 올라간다(getAllArticleSlugs는 번역 언어에서 컬렉션 스캔으로 폴백하지 않는다).
  // Firestore 조회가 실패하면 throw되어 500이 나간다 — 빈 사이트맵을 200으로 내보내
  // 검색엔진이 전체 URL을 잃게 하는 것보다 낫고, CDN은 직전 정상 응답을 계속 쓴다.
  const [articles, ...perLang] = await Promise.all([
    getAllArticleSlugs(),
    ...LANGS.map(l => getAllArticleSlugs(l)),
  ]);

  for (const a of articles) {
    entries.push({
      url: `${baseUrl}/${a.slug}`,
      lastModified: isoDate(a.publishedAt),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // 번역 홈·진료항목 목록도 함께 넣는다 — 글만 넣으면 진입점이 색인되지 않는다.
  LANGS.forEach((lang, i) => {
    const slugs = perLang[i];
    if (!slugs.length) return;
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
        lastModified: isoDate(a.publishedAt),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  });

  const body = entries
    .map(e =>
      [
        '<url>',
        `<loc>${escapeXml(e.url)}</loc>`,
        e.lastModified ? `<lastmod>${e.lastModified}</lastmod>` : '',
        `<changefreq>${e.changeFrequency}</changefreq>`,
        `<priority>${e.priority.toFixed(1)}</priority>`,
        '</url>',
      ].join('')
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_CONTROL },
  });
}
