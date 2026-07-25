import { NextRequest } from 'next/server';
import { getBaseUrl, getSiteHost } from '@/lib/site-url';
import { getDb } from '@/lib/firebase';
import { INDEX_COLLECTION } from '@/lib/collections';
import { SITE } from '@/lib/site.config';
import { LATEST_SHARD } from '@/lib/types';
import type { ArticlesIndex } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SITE_URL = getBaseUrl();

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://searchadvisor.naver.com/indexnow',
];

// Daily IndexNow sweep: submit every URL published in the last 24h.
// Reads only the `_latest` shard — publishes/day is far below its 100-item cap.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!SITE.indexNowKey) {
    return Response.json({ skipped: 'no indexNowKey configured' });
  }

  const db = getDb();
  const snap = await db.collection(INDEX_COLLECTION).doc(LATEST_SHARD).get();
  const items = snap.exists ? ((snap.data() as ArticlesIndex).items ?? []) : [];

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const urls = items
    .filter(a => a.publishedAt && new Date(a.publishedAt).getTime() >= cutoff)
    .map(a => `${SITE_URL}/${a.slug}`);

  if (urls.length === 0) {
    return Response.json({ submitted: 0 });
  }

  const body = {
    host: getSiteHost(),
    key: SITE.indexNowKey,
    keyLocation: `${SITE_URL}/${SITE.indexNowKey}.txt`,
    urlList: urls,
  };

  const results = await Promise.allSettled(
    INDEXNOW_ENDPOINTS.map(endpoint =>
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      }).then(r => ({ endpoint: new URL(endpoint).host, status: r.status }))
    )
  );

  return Response.json({
    submitted: urls.length,
    endpoints: results.map(r => (r.status === 'fulfilled' ? r.value : { error: String(r.reason) })),
  });
}
