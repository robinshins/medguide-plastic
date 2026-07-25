import './lib/env';
import { getBaseUrl, getSiteHost } from '../src/lib/site-url';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { SITE } from '../src/lib/site.config';

// Submits URLs queued by scripts/publish.ts in .indexnow-pending.txt, then deletes
// the file. Safe to run when the file is missing or the site has no IndexNow key.

const PENDING = '.indexnow-pending.txt';
const ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://searchadvisor.naver.com/indexnow',
];

async function main() {
  if (!existsSync(PENDING)) {
    console.log('[indexnow] nothing pending');
    return;
  }
  if (!SITE.indexNowKey) {
    console.log('[indexnow] no indexNowKey configured — clearing queue without submitting');
    unlinkSync(PENDING);
    return;
  }

  const urls = [...new Set(
    readFileSync(PENDING, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
  )];
  if (!urls.length) {
    unlinkSync(PENDING);
    return;
  }

  const siteUrl = getBaseUrl();
  const body = {
    host: getSiteHost(),
    key: SITE.indexNowKey,
    keyLocation: `${siteUrl}/${SITE.indexNowKey}.txt`,
    urlList: urls,
  };

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
      console.log(`[indexnow] ${new URL(endpoint).host}: ${res.status}`);
    } catch (e) {
      console.log(`[indexnow] ${new URL(endpoint).host} failed: ${(e as Error).message}`);
    }
    await new Promise(r => setTimeout(r, 250));
  }

  unlinkSync(PENDING);
  console.log(`[indexnow] submitted ${urls.length} url(s)`);
}

main().catch(e => { console.error(e); process.exit(1); });
