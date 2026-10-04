import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

// Invalidate caches after a publish. Called by scripts/publish.ts when
// NEXT_PUBLIC_SITE_URL + CRON_SECRET are both configured.
//
// revalidateTag('articles') purges the unstable_cache entries in src/lib/articles.ts,
// which is what makes the home page and specialty listings show a new article
// immediately. /sitemap.xml and /feed.xml are not covered here on purpose: they are
// force-dynamic route handlers that read Firestore uncached behind a 30-minute CDN
// cache (see api/sitemap/route.ts for why the cached version froze).

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag') || 'articles';

  revalidateTag(tag, { expire: 0 });

  return Response.json({ revalidated: tag, now: Date.now() });
}
