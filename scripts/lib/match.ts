import OpenAI from 'openai';
import type { KakaoPlace } from './scrape';
import { record, type AnyUsage } from './usage';

// Lazy: constructing the client at module scope throws before env.ts has loaded
// .env.local, and import order is easy to get wrong.
let _openai: OpenAI | null = null;
const openai = () => (_openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

// Cheap classification work. Same model as the article now, but kept as its own constant
// so matching can be moved off if the article model ever changes tier.
const MATCH_MODEL = 'gpt-5.4-mini';

export interface PendingMatch {
  placeId: string;
  hospitalName: string;
  address: string;
  phone: string;
  candidates: KakaoPlace[];
}

/**
 * Resolve "is this Kakao result the same clinic as this Naver place?" for several
 * hospitals in one call. Returns placeId → matched KakaoPlace.
 * A wrong match is worse than no match, so the confidence floor is deliberately high.
 */
export async function batchMatchKakao(
  pending: PendingMatch[]
): Promise<Map<string, KakaoPlace>> {
  const out = new Map<string, KakaoPlace>();
  if (!pending.length) return out;

  const block = pending.map((m, idx) => {
    const list = m.candidates
      .map((c, i) => `  [${i}] "${c.name}" | 주소: ${c.address || '?'} | 전화: ${c.phone || '?'} | 평점: ${c.rating ?? '없음'}`)
      .join('\n');
    return `[병원 ${idx}] 네이버: "${m.hospitalName}" (주소: ${m.address || '?'}, 전화: ${m.phone || '?'})\n카카오 후보:\n${list}`;
  }).join('\n\n');

  try {
    const res = await openai().responses.create({
      model: MATCH_MODEL,
      reasoning: { effort: 'low' },
      input: [
        { role: 'developer', content: '병원 매칭 전문가. JSON 배열로만 응답.' },
        {
          role: 'user',
          content: `아래 ${pending.length}개 병원 각각에 대해 카카오 후보 중 동일한 병원을 찾으세요. 이름이 조금 다를 수 있으니 주소·전화로 교차확인하세요. 확신이 없으면 matchIndex를 -1로 두세요(잘못된 매칭보다 매칭 없음이 낫습니다).\n\n${block}\n\n응답 형식: [{"matchIndex": 번호, "confidence": 0.0~1.0}, ...]`,
        },
      ],
    });

    record('match', (res as { usage?: AnyUsage }).usage);

    const arr = (res as { output_text?: string }).output_text?.match(/\[[\s\S]*\]/);
    if (!arr) return out;
    const results = JSON.parse(arr[0]) as { matchIndex: number; confidence: number }[];
    results.forEach((r, idx) => {
      const m = pending[idx];
      if (!m) return;
      if (r.matchIndex >= 0 && r.confidence >= 0.6 && m.candidates[r.matchIndex]) {
        out.set(m.placeId, m.candidates[r.matchIndex]);
      }
    });
  } catch (e) {
    // Matching is an enrichment step; losing it costs a rating, not the article.
    console.log(`  [match] batch match failed: ${(e as Error).message.slice(0, 100)}`);
  }
  return out;
}
