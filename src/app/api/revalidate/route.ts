import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

// Invalidate the 'articles' cache (unstable_cache wrappers in src/lib/articles.ts)
// after a publish. Called by scripts/publish.ts when NEXT_PUBLIC_SITE_URL + CRON_SECRET
// are both configured.
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
