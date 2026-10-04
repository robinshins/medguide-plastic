/**
 * 발행/번역 후 라이브 사이트의 캐시를 무효화한다.
 *
 * 목록·홈은 unstable_cache의 'articles' 태그를 6시간 주기로 들고 있어서, 이 호출이
 * 없으면 새 번역이 최대 6시간 동안 사이트에 나타나지 않는다. 백필처럼 수백 건을
 * 한 번에 쓰는 경로에서 특히 중요하다.
 *
 * (사이트맵·피드는 이 태그와 무관하다 — Firestore를 캐시 없이 읽고 CDN이 30분간
 *  들고 있으므로 최대 30분 뒤 갱신된다. src/app/sitemap.xml/route.ts 주석 참조.)
 */
export async function revalidateSite(label = 'revalidate'): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;
  if (!baseUrl || !secret) {
    console.log(`  [${label}] skipped (NEXT_PUBLIC_SITE_URL or CRON_SECRET unset)`);
    return;
  }
  try {
    const res = await fetch(`${baseUrl}/api/revalidate?tag=articles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(15000),
    });
    console.log(`  [${label}] ${res.status} ${baseUrl}`);
  } catch (e) {
    console.log(`  [${label}] failed (non-fatal): ${(e as Error).message.slice(0, 80)}`);
  }
}
