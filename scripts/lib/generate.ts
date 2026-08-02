import OpenAI from 'openai';
import { SITE } from '../../src/lib/site.config';
import type { HospitalInfo, KeywordEntry } from '../../src/lib/types';
import { RetryableError, FatalError } from './errors';
import { record, type AnyUsage } from './usage';

// Lazy: see match.ts — module-scope construction races env loading.
let _openai: OpenAI | null = null;
const openai = () => (_openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

// gpt-5.4-mini draws on OpenAI's 10M tokens/day free mini allowance — 10x the 1M given to
// the gpt-5.4 tier. At ~14K tokens per article that is hundreds of articles/day, so the
// cadence is no longer allowance-bound.
//
// Quality was measured, not assumed: with the full prompt below, mini produced 8.2–9.9K
// character articles (gpt-5.4 produced 9.1K) with no out-of-vocabulary tags and 6 FAQ
// pairs, passing assertArticleSane 3/3. It does occasionally drift to <dl>/<dt>/<dd> for
// the FAQ when the prompt is weakened — that breaks both the CSS and the FAQPage JSON-LD
// extraction — which is why the allowed-tag list in the prompt must stay explicit.
export const ARTICLE_MODEL = 'gpt-5.4-mini';

// Reasoning tokens are billed inside max_output_tokens on the Responses API.
// A ~3,000자 Korean HTML article is 8–11K output; effort:'low' reasoning adds 1–3K.
// Set far above that so this value can never be the reason a publish fails — unused
// headroom is not billed. The old pipelines used 12000 and shipped truncated bodies.
const MAX_OUTPUT_TOKENS = 64_000;

const ARTICLE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    metaDescription: { type: 'string' },
    content: { type: 'string' },
  },
  required: ['title', 'metaDescription', 'content'],
  additionalProperties: false,
} as const;

export interface GeneratedArticle {
  title: string;
  metaDescription: string;
  content: string;
}

function buildHospitalContext(hospitals: HospitalInfo[]): string {
  return hospitals.map((h, i) => {
    const reviews = h.naverReviews.slice(0, 5)
      .map(r => `  - "${r.content}" (${r.author}${r.date ? `, ${r.date}` : ''})`)
      .join('\n');
    const links = [
      h.homepage ? `홈페이지: ${h.homepage}` : '',
      h.blogUrl ? `블로그: ${h.blogUrl}` : '',
      h.instagramUrl ? `인스타: ${h.instagramUrl}` : '',
    ].filter(Boolean).join(' | ');
    const ratings = [
      h.naverStarRating ? `네이버 ${h.naverStarRating}` : '',
      h.kakaoRating ? `카카오 ${h.kakaoRating}` : '',
      h.googleRating ? `구글 ${h.googleRating}` : '',
    ].filter(Boolean).join(' | ');

    return [
      `### ${i + 1}. ${h.name}`,
      `- 주소: ${h.address || '정보없음'}`,
      `- 전화: ${h.phone || '정보없음'}`,
      `- 진료시간: ${h.businessHours || '정보없음'}`,
      `- 접근성: ${h.directions || '정보없음'}`,
      `- ${SITE.credentialLabel} (건강보험심사평가원): ${h.specialistsInfo || '정보없음'}`,
      `- 편의시설: ${h.facilities || '정보없음'}`,
      `- ${links || '링크없음'}`,
      `- 평점: ${ratings || '정보없음'}`,
      `- 네이버리뷰 ${h.naverReviewCount}건 | 블로그리뷰 ${h.naverBlogReviewCount}건 | 카카오리뷰 ${h.kakaoReviewCount}건 | 구글리뷰 ${h.googleReviewCount}건`,
      '',
      `실제 방문자 리뷰:`,
      reviews || '없음',
    ].join('\n');
  }).join('\n\n');
}

function buildPrompt(kw: KeywordEntry, hospitals: HospitalInfo[]): string {
  const totalNaver = hospitals.reduce((s, h) => s + h.naverReviewCount, 0);
  const totalKakao = hospitals.reduce((s, h) => s + h.kakaoReviewCount, 0);
  const rated = hospitals.filter(h => h.kakaoRating);
  const avgKakao = rated.length
    ? (rated.reduce((s, h) => s + (h.kakaoRating || 0), 0) / rated.length).toFixed(1)
    : null;

  const isSpecialty = kw.specialtySlug !== 'general';
  const priceBlock = SITE.priceContext?.[kw.specialtySlug]
    ? `\n\n## ${kw.specialty} 비용 참고 정보 (본문에 자연스럽게 녹여서 서술)\n${SITE.priceContext[kw.specialtySlug]}`
    : '';

  return `당신은 10년 경력의 한국 의료 전문 에디터입니다. 실제 수집한 데이터만으로 ${SITE.categoryKo} 정보를 씁니다.

## 수집 데이터 요약
네이버 플레이스 방문자 리뷰 ${totalNaver.toLocaleString()}건, 카카오맵 리뷰 ${totalKakao.toLocaleString()}건, 건강보험심사평가원 등록 정보를 크롤링해 분석했습니다.${avgKakao ? ` 선정 ${hospitals.length}곳의 카카오맵 평균 평점은 ${avgKakao}점입니다.` : ''}

## 타겟 검색어
"${kw.keyword}", "${kw.region} ${SITE.categoryKo} 추천", "${kw.keyword} 잘하는곳", "${kw.keyword} 후기"
AI 검색(ChatGPT, Perplexity)에서 "${kw.region}에서 ${isSpecialty ? kw.specialty + ' ' : ''}${SITE.categoryKo} 어디가 좋아?" 질문에 인용될 수 있도록 씁니다.

## 병원 데이터
${buildHospitalContext(hospitals)}${priceBlock}

## 글 구조 (HTML, 이 순서 고정)

1. <h2> 핵심 결론 — 첫 문단에서 바로 답을 준다. 리뷰수·평점이 가장 두드러지는 1~2곳을 구체적 수치와 함께 먼저 제시.
2. <h2> 분석 방법 — 어떤 플랫폼에서 몇 건을 모아 어떻게 비교했는지 숫자로 투명하게.
3. <h3> 병원별 상세 (각 600~1000자). 병원마다 반드시:
   a) 추천 근거 (평점, 리뷰수, ${SITE.credentialLabel})
   b) 실제 리뷰 <blockquote> 2개 이상
   c) 위치·교통, 진료시간(야간·점심시간 명시)
   d) 방문 전 확인할 점 — 예약 방식·주차 등 실용 정보 위주. 병원 비하 금지
   e) 실용 팁${isSpecialty ? `\n   f) ${kw.specialty} 관련 특화 정보` : ''}
4. <h2> 한눈에 비교 — <table>로 병원명/네이버평점/카카오평점/구글평점/총리뷰/${SITE.credentialLabel}/위치/강점
5. <h2> ${isSpecialty ? kw.specialty + ' ' : ''}${SITE.categoryKo} 선택 체크리스트 — 상담 전 확인할 8~10가지
   <ul class="checklist"><li><strong>항목</strong> — 설명</li></ul>
6. <h2> 주의해야 할 신호 — 피해야 할 곳의 특징 3~4가지
7. <h2> 자주 묻는 질문 — <h3>질문?</h3><p>답변</p> 5~6쌍
8. <h2> 마무리 — 요약 + 의료 정보 면책 문구 + "최종 수정: ${new Date().toISOString().split('T')[0]}"

## 문체 규칙 (엄수)
- 이모지 절대 금지. 리뷰를 인용할 때 원문의 이모지·특수문자는 모두 제거하고 인용한다.
- 리뷰의 날짜를 바꾸지 않는다. 데이터에 "2026년 7월 21일"이면 그대로 쓴다. 날짜가 없으면 날짜를 언급하지 않는다.
- 없는 정보를 지어내지 않는다. 의료진 이름·학력·수상·자격은 위 데이터에 없으면 절대 쓰지 않는다.
- "많은 리뷰" 대신 "리뷰 411건"처럼 구체적 숫자를 쓴다.
- 출처를 밝힌다 ("(네이버 리뷰 기준)", "(건강보험심사평가원)").
- 자연스러운 구어체를 섞되, 한 문장만 떼어 인용해도 말이 되게 완결형으로 쓴다.
- 사용 가능한 HTML 태그: h2, h3, p, strong, em, ul, ol, li, a, blockquote, table, thead, tbody, tr, th, td, hr. 그 외 태그나 class는 쓰지 않는다(단 <ul class="checklist">는 허용).

## SEO
- title: "${kw.keyword}" 포함, 40~60자, 숫자 포함
- metaDescription: 120~155자

title, metaDescription, content(HTML 본문)을 반환하세요.`;
}

/**
 * Truncation and hallucination guards the previous pipelines lacked. They checked
 * `stop_reason` only AFTER a successful parse, so a body cut mid-<table> still shipped.
 */
export function assertArticleSane(a: GeneratedArticle, kw: KeywordEntry): void {
  if (!a.title || a.title.length < 10 || a.title.length > 120) {
    throw new RetryableError(`bad title length ${a.title?.length ?? 0}`);
  }
  if (!a.metaDescription || a.metaDescription.length < 50) {
    throw new RetryableError(`meta too short (${a.metaDescription?.length ?? 0})`);
  }
  if (!a.content || a.content.length < 2000) {
    throw new RetryableError(`content too short (${a.content?.length ?? 0}) — likely truncated`);
  }
  if (!/<\/(h2|h3|p|ul|ol|table|blockquote)>\s*$/.test(a.content.trimEnd())) {
    throw new RetryableError('content does not end on a closed block tag — truncated');
  }
  if (!a.content.includes(kw.region)) {
    throw new RetryableError(`region "${kw.region}" missing from body`);
  }
}

/** Legacy marker contract, kept only as a fallback if json_schema is unavailable. */
/**
 * 모델이 본문 끝에 마커를 한 번 더 뱉는 경우가 있다(`===CONTENT===` 중복).
 * 정규식은 첫 마커에서 본문을 시작해 끝까지 잡으므로 중복분이 본문 꼬리에 남고,
 * "닫힌 블록 태그로 끝나야 한다" 검사에 걸려 멀쩡한 글이 통째로 버려진다.
 */
export function stripTrailingMarkers(s: string): string {
  let out = s.trim();
  let prev: string;
  do { prev = out; out = out.replace(/\s*===[A-Z]+===\s*$/, '').trim(); } while (out !== prev);
  return out;
}

function parseMarkers(text: string): GeneratedArticle {
  const m = text.match(
    /===TITLE===\s*([\s\S]*?)\s*===META===\s*([\s\S]*?)\s*===CONTENT===\s*([\s\S]*?)\s*$/
  );
  if (!m) throw new RetryableError('article parse failed (no JSON, no markers)');
  return { title: m[1].trim(), metaDescription: m[2].trim(), content: stripTrailingMarkers(m[3]) };
}

export async function generateArticle(
  kw: KeywordEntry,
  hospitals: HospitalInfo[]
): Promise<GeneratedArticle> {
  const res = await openai().responses.create({
    model: ARTICLE_MODEL,
    reasoning: { effort: 'low' },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    // gpt-5.6-luna does NOT support `temperature`. Do not add it.
    input: [
      {
        role: 'developer',
        content: `당신은 10년 경력의 한국 의료 전문 에디터입니다. ${SITE.categoryKo} 분야를 담당하며, 수집된 데이터에 없는 사실은 절대 쓰지 않습니다.`,
      },
      { role: 'user', content: buildPrompt(kw, hospitals) },
    ],
    text: {
      format: { type: 'json_schema', name: 'article', strict: true, schema: ARTICLE_SCHEMA },
    },
  } as Parameters<OpenAI['responses']['create']>[0]);

  const r = res as unknown as {
    status?: string;
    incomplete_details?: { reason?: string };
    error?: { message?: string };
    output_text?: string;
    output?: { type: string; content?: { type: string; refusal?: string }[] }[];
    usage?: AnyUsage;
  };

  // Recorded before any throw: a failed generation still consumes the daily allowance,
  // and an attempt that burns tokens without producing an article is exactly what has
  // to be visible when judging whether the free tier covers us.
  record('article', r.usage);

  if (r.status === 'incomplete') {
    throw new RetryableError(
      `incomplete: ${r.incomplete_details?.reason ?? 'unknown'} (output_tokens=${r.usage?.output_tokens})`
    );
  }
  if (r.status && r.status !== 'completed') {
    throw new RetryableError(`status=${r.status} ${r.error?.message ?? ''}`);
  }

  const refusal = (r.output ?? [])
    .flatMap(i => (i.type === 'message' ? i.content ?? [] : []))
    .find(c => c.type === 'refusal');
  if (refusal) throw new FatalError(`refusal: ${refusal.refusal}`);

  const text = r.output_text;
  if (!text?.trim()) throw new RetryableError('empty output_text');

  let parsed: GeneratedArticle;
  try {
    parsed = JSON.parse(text) as GeneratedArticle;
  } catch {
    parsed = parseMarkers(text);
  }

  assertArticleSane(parsed, kw);
  return parsed;
}
