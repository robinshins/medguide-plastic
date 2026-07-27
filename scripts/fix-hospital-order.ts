import './lib/env';
import { db } from '../src/lib/firebase';
import { ARTICLES_COLLECTION } from '../src/lib/collections';
import { SITE } from '../src/lib/site.config';
import type { Article } from '../src/lib/types';
import { orderHospitalsByBody } from './lib/store';
import { revalidateSite } from './lib/revalidate';

/**
 * 이미 발행된 글의 병원 카드 순서를 기사 본문 순위에 맞춘다. 일회성 마이그레이션.
 *
 * 신규 발행분은 saveArticle()이 자동으로 정렬하므로 이 스크립트는 과거 글만 대상이다.
 * LLM을 쓰지 않는다 — 저장된 본문의 <h3>에서 병원명을 찾아 배열 순서만 바꾼다.
 *
 * 번역본은 hospitals를 복사하지 않고 한국어 문서에서 읽으므로(getTranslatedArticle)
 * 한국어 문서만 고치면 6개 언어가 모두 따라온다.
 *
 *   npm run fix:order            # 조회만
 *   npm run fix:order -- --apply
 */
const apply = process.argv.includes('--apply');

async function main() {
  const snap = await db.collection(ARTICLES_COLLECTION).select('content', 'hospitals', 'slug').get();
  const koreans = snap.docs.filter(d => !d.id.includes('__'));

  let changed = 0, unmatched = 0;
  const updates: { ref: FirebaseFirestore.DocumentReference; hospitals: Article['hospitals'] }[] = [];

  for (const doc of koreans) {
    const a = doc.data() as Article;
    const hospitals = a.hospitals || [];
    if (hospitals.length < 2) continue;

    const ordered = orderHospitalsByBody(a.content || '', hospitals);
    const heads = [...(a.content || '').matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map(m => m[1].replace(/<[^>]+>/g, ''));
    const matched = hospitals.filter(h => h.name && heads.some(x => x.includes(h.name))).length;
    if (matched < hospitals.length) unmatched++;

    if (ordered.map(h => h.name).join('|') === hospitals.map(h => h.name).join('|')) continue;
    changed++;
    updates.push({ ref: doc.ref, hospitals: ordered });
  }

  console.log(`[${SITE.key}] 한국어 글 ${koreans.length}편 · 순서 변경 ${changed}편 · 일부 매칭 실패 ${unmatched}편`);

  if (!apply) {
    console.log('  (dry-run — 실제로 바꾸려면 --apply)');
    return;
  }
  for (let i = 0; i < updates.length; i += 450) {
    const batch = db.batch();
    updates.slice(i, i + 450).forEach(u => batch.update(u.ref, { hospitals: u.hospitals }));
    await batch.commit();
  }
  console.log(`  반영 완료: ${updates.length}편`);
  if (updates.length) await revalidateSite();
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
