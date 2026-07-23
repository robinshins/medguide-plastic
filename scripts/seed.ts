import './lib/env';
import { db } from '../src/lib/firebase';
import { KEYWORDS_COLLECTION } from '../src/lib/collections';
import { SITE } from '../src/lib/site.config';
import { generateAllKeywords } from '../src/lib/keywords';

/**
 * Idempotent queue seeding.
 *
 * The version this replaces (medicalkoreaguide_derma/src/lib/publish.ts) had two bugs:
 * the WriteBatch was created once outside the loop and never re-created after commit
 * (a committed batch throws on reuse), and it issued one sequential .get() per keyword —
 * ~5,400 round trips. Here: one id-only query, and a fresh batch after every commit.
 */
async function main() {
  const keywords = generateAllKeywords();
  console.log(`[seed] ${SITE.key}: generated ${keywords.length} keywords (${SITE.specialties.length} specialties)`);

  const col = db.collection(KEYWORDS_COLLECTION);
  const existing = new Set((await col.select().get()).docs.map(d => d.id));
  console.log(`[seed] ${existing.size} already in ${KEYWORDS_COLLECTION}`);

  let batch = db.batch();
  let ops = 0;
  let created = 0;

  for (const kw of keywords) {
    if (existing.has(kw.id)) continue;
    batch.set(col.doc(kw.id), kw);
    ops++; created++;
    if (ops === 450) {
      await batch.commit();
      batch = db.batch(); // ← must re-instantiate; a committed batch cannot be reused
      ops = 0;
      process.stdout.write(`\r[seed] committed ${created}...`);
    }
  }
  if (ops > 0) await batch.commit();

  console.log(`\n[seed] created ${created}, total ${keywords.length} in ${KEYWORDS_COLLECTION}`);
  console.log('[seed] queue head:');
  keywords.slice(0, 5).forEach(k => console.log(`   order=${k.order} ${k.id}  (${k.keyword})`));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
