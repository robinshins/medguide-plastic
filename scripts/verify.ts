import './lib/env';
import { db } from '../src/lib/firebase';
import {
  ARTICLES_COLLECTION, INDEX_COLLECTION, KEYWORDS_COLLECTION, FORBIDDEN_COLLECTIONS,
} from '../src/lib/collections';
import { SITE } from '../src/lib/site.config';
import { LATEST_SHARD } from '../src/lib/types';
import type { Article, ArticlesIndex } from '../src/lib/types';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

let failures = 0;
const ok = (m: string) => console.log(`  ok    ${m}`);
const bad = (m: string) => { failures++; console.log(`  FAIL  ${m}`); };

/** 5-gram Jaccard. Detects near-duplicate bodies that a sha1 equality check misses. */
function jaccard5(a: string, b: string): number {
  const shingles = (s: string) => {
    const t = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const out = new Set<string>();
    for (let i = 0; i + 5 <= t.length; i++) out.add(t.slice(i, i + 5));
    return out;
  };
  const A = shingles(a), B = shingles(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const s of A) if (B.has(s)) inter++;
  return inter / (A.size + B.size - inter);
}

async function main() {
  const dupeCheck = process.argv.includes('--dupe-check');
  console.log(`\n[verify] ${SITE.key} (${SITE.categoryKo})\n`);

  // 1. collection isolation ------------------------------------------------
  console.log('컬렉션 격리');
  const forbidden = FORBIDDEN_COLLECTIONS as readonly string[];
  for (const name of [ARTICLES_COLLECTION, INDEX_COLLECTION, KEYWORDS_COLLECTION]) {
    if (forbidden.includes(name)) bad(`${name} collides with an existing site's collection`);
  }
  if (!failures) ok(`${KEYWORDS_COLLECTION} / ${ARTICLES_COLLECTION} / ${INDEX_COLLECTION}`);

  // 2. keyword queue -------------------------------------------------------
  console.log('\n키워드 큐');
  const kwSnap = await db.collection(KEYWORDS_COLLECTION).select('status', 'order').get();
  if (kwSnap.empty) { bad(`${KEYWORDS_COLLECTION} is empty — run \`npm run seed\``); }
  else {
    const counts: Record<string, number> = {};
    kwSnap.docs.forEach(d => { const s = d.data().status; counts[s] = (counts[s] || 0) + 1; });
    ok(`${kwSnap.size}건 ${JSON.stringify(counts)}`);
    if (counts.in_progress) bad(`${counts.in_progress}건이 in_progress로 남아 있음`);
  }

  // 3. articles ------------------------------------------------------------
  console.log('\n발행된 글');
  const artSnap = await db.collection(ARTICLES_COLLECTION).get();
  if (artSnap.empty) { bad('아직 발행된 글 없음'); }
  else ok(`${artSnap.size}건`);

  const articles = artSnap.docs.map(d => d.data() as Article);
  for (const a of articles) {
    if (a.id !== a.slug) bad(`${a.id}: id !== slug`);
    if (!a.content || a.content.length < 2000) bad(`${a.slug}: 본문 ${a.content?.length ?? 0}자 — 잘렸을 가능성`);
    if (!a.hospitals?.length) bad(`${a.slug}: hospitals 비어 있음`);
    if (!a.content?.includes(a.region)) bad(`${a.slug}: 본문에 지역명 "${a.region}" 없음`);
    if (/[\u{1F300}-\u{1FAFF}]/u.test(a.content || '')) bad(`${a.slug}: 본문에 이모지 포함`);
  }
  if (articles.length && !failures) ok('본문 길이·지역명·이모지 검사 통과');

  // 4. index shards --------------------------------------------------------
  console.log('\n인덱스 샤드');
  const latest = await db.collection(INDEX_COLLECTION).doc(LATEST_SHARD).get();
  if (!latest.exists) bad(`${LATEST_SHARD} 샤드 없음`);
  else ok(`${LATEST_SHARD}: ${(latest.data() as ArticlesIndex).count}건`);

  const bySpecialty = new Map<string, number>();
  articles.forEach(a => bySpecialty.set(a.specialtySlug, (bySpecialty.get(a.specialtySlug) ?? 0) + 1));
  for (const [slug, n] of bySpecialty) {
    const shard = await db.collection(INDEX_COLLECTION).doc(slug).get();
    const count = shard.exists ? (shard.data() as ArticlesIndex).count : 0;
    if (count < n) bad(`샤드 ${slug}: ${count}건 (글은 ${n}건)`);
    else ok(`샤드 ${slug}: ${count}건`);
  }

  // 5. routes reachable ----------------------------------------------------
  console.log(`\n라우트 응답 (${BASE})`);
  for (const a of articles.slice(0, 5)) {
    try {
      const res = await fetch(`${BASE}/${a.slug}`, { signal: AbortSignal.timeout(20000) });
      if (res.ok) ok(`/${a.slug} → ${res.status}`);
      else bad(`/${a.slug} → ${res.status}`);
    } catch {
      bad(`/${a.slug} → 응답 없음 (dev 서버가 떠 있어야 합니다)`);
    }
  }

  // 6. optional near-duplicate check against the legacy dental site ---------
  if (dupeCheck) {
    console.log('\n기존 사이트와 본문 유사도 (5-gram Jaccard)');
    for (const a of articles) {
      const other = await db.collection('articles').doc(`dental-${a.slug}-ko`).get();
      if (!other.exists) { ok(`/${a.slug}: 기존 사이트에 대응 문서 없음`); continue; }
      const score = jaccard5(a.content, (other.data() as { content: string }).content);
      const line = `/${a.slug}: ${score.toFixed(3)}`;
      if (score >= 0.6) bad(`${line} — 너무 유사함, 프롬프트를 더 벌려야 함`);
      else ok(line);
    }
  }

  console.log(`\n${failures === 0 ? 'PASS' : `FAIL — ${failures}건`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
