import './lib/env';
import { db } from '../src/lib/firebase';
import { ARTICLES_COLLECTION } from '../src/lib/collections';
import { SITE } from '../src/lib/site.config';
import { LANGS, type Lang } from '../src/lib/i18n';
import type { Article } from '../src/lib/types';
import { translateOne } from './lib/translate';
import { saveTranslation, existingTranslationLangs } from './lib/store';
import { summary as usageSummary } from './lib/usage';
import { withRetry } from './lib/errors';

/**
 * 이미 발행된 한국어 글에 번역본을 채운다. 멱등 — 이미 있는 언어는 건너뛴다.
 *
 *   npm run translate:backfill                  # 전체
 *   npm run translate:backfill -- --limit=5     # 5편만
 *   npm run translate:backfill -- --langs=en,ja
 *   npm run translate:backfill -- --dry-run
 *
 * 동시 실행 폭을 두 축으로 나눈다: 글 CONCURRENCY편을 동시에, 각 글 안에서
 * 언어 5개를 동시에. 즉 최대 CONCURRENCY×5개의 요청이 뜬다. 직렬이면 글 1편에
 * 5분이라 117편에 10시간이 걸린다.
 */

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const value = (n: string) => {
  const hit = argv.find(a => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : undefined;
};

const LIMIT = Number(value('limit') ?? 0);
const DRY = flag('dry-run');
const TARGET_LANGS: Lang[] = (() => {
  const raw = value('langs');
  if (!raw) return [...LANGS];
  const picked = raw.split(',').map(s => s.trim());
  const bad = picked.filter(p => !LANGS.includes(p as Lang));
  if (bad.length) throw new Error(`unknown langs: ${bad.join(', ')} (valid: ${LANGS.join(', ')})`);
  return picked as Lang[];
})();

// 글 동시 실행 폭. 언어 5개가 각각 안에서 또 동시에 돌므로 실제 동시 요청은 이 값×5다.
// 4×5=20이 DeepSeek 쪽에서 안정적으로 통과하는 선이었다. 올리면 429가 난다.
const CONCURRENCY = Number(value('concurrency') ?? 4);

async function pool<T>(items: T[], width: number, fn: (item: T, i: number) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(width, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

async function main() {
  console.log(`[${SITE.key}] translate-backfill — langs=${TARGET_LANGS.join(',')} concurrency=${CONCURRENCY}${DRY ? ' (dry-run)' : ''}`);

  // 한국어 원문만 고른다. 번역본은 문서 id에 '__'가 들어간다.
  const snap = await db.collection(ARTICLES_COLLECTION).get();
  const koreans = snap.docs
    .filter(d => !d.id.includes('__'))
    .map(d => d.data() as Article)
    .filter(a => a.content && a.slug)
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));

  console.log(`  한국어 글 ${koreans.length}편`);

  // 무엇이 빠졌는지 먼저 전부 조사한다 — 진행률을 정확히 보여주기 위해서.
  const work: { article: Article; langs: Lang[] }[] = [];
  await pool(koreans, 10, async article => {
    const have = await existingTranslationLangs(article.slug);
    const missing = TARGET_LANGS.filter(l => !have.has(l));
    if (missing.length) work.push({ article, langs: missing });
  });
  // pool은 순서를 보장하지 않으므로 최신순으로 다시 정렬한 뒤 자른다 —
  // --limit이 매번 다른 글을 고르면 재실행이 진행되지 않는다.
  work.sort((a, b) => (b.article.publishedAt || '').localeCompare(a.article.publishedAt || ''));
  if (LIMIT > 0) work.splice(LIMIT);

  const totalJobs = work.reduce((s, w) => s + w.langs.length, 0);
  console.log(`  번역 필요: ${work.length}편 / ${totalJobs}건\n`);
  if (!totalJobs) { console.log('  이미 전부 번역됨'); return; }
  if (DRY) {
    work.slice(0, 20).forEach(w => console.log(`    ${w.article.slug} → ${w.langs.join(',')}`));
    if (work.length > 20) console.log(`    ... 외 ${work.length - 20}편`);
    return;
  }

  let done = 0, failed = 0;
  const t0 = Date.now();

  await pool(work, CONCURRENCY, async ({ article, langs }) => {
    const results = await Promise.allSettled(
      langs.map(lang =>
        withRetry(() => translateOne(article, lang), { label: `tr:${lang}`, attempts: 3 })
          .then(saveTranslation)
      )
    );
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') done++;
      else {
        failed++;
        console.log(`  [fail] ${article.slug} ${langs[i]}: ${(r.reason as Error).message.slice(0, 100)}`);
      }
    });
    const pct = (((done + failed) / totalJobs) * 100).toFixed(0);
    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    console.log(`  [${pct}%] ${article.slug} (+${langs.length})  누적 성공 ${done} 실패 ${failed}  ${mins}분`);
  });

  console.log(`\n[${SITE.key}] 완료: 성공 ${done} / 실패 ${failed} / ${((Date.now() - t0) / 60000).toFixed(1)}분`);
  console.log(`[deepseek] token usage:\n${usageSummary()}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
