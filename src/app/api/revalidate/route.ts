import { NextRequest } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

// Invalidate caches after a publish. Called by scripts/publish.ts when
// NEXT_PUBLIC_SITE_URL + CRON_SECRET are both configured.
//
// revalidateTag('articles') alone is NOT enough: it purges the unstable_cache entries
// in src/lib/articles.ts, which is what makes the home page and specialty listings
// show a new article immediately — but the metadata route /sitemap.xml keeps serving
// its previously generated XML until its own `revalidate = 3600` expires. Verified
// against production: after a publish the home page updated instantly while the
// sitemap still listed the old set. So purge that route by path as well.
const METADATA_PATHS = ['/sitemap.xml'];

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag') || 'articles';

  revalidateTag(tag, { expire: 0 });
  for (const path of METADATA_PATHS) {
    revalidatePath(path);
  }

  return Response.json({ revalidated: tag, paths: METADATA_PATHS, now: Date.now() });
}
