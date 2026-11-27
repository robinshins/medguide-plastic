import OpenAI from 'openai';
import { SITE } from '../../src/lib/site.config';
import { LANGS, LANG_META, GEO_HINTS, type Lang } from '../../src/lib/i18n';
import type { Article, TranslatedArticle } from '../../src/lib/types';
import { RetryableError, FatalError, withRetry } from './errors';
import { record, type AnyUsage } from './usage';
import { stripTrailingMarkers } from './generate';

/**
 * gpt-6-luna로 번역한다(2026-11-26부터, 글 생성과 같은 모델).
 *
 * 이력: 2026-09-24에 gpt-5.4-mini → deepseek-flash(DeepSeek-V4.1-Flash). 그때 비교에서
 * mini는 GEO 필수 문구를 영어에서 1회만 넣었고 스페인어 제목에 한글을 남겼다. 이 두 가지는
 * 프롬프트 규칙과 assertTranslationSane이 계속 잡는다.
 * 2026-11-26에 luna로 바꾼 이유는 비용이다. 공식 단가(100만 토큰당) luna 입력 $0.10·출력
 * $0.50, deepseek-flash 정가 $0.30·$1.20. 게다가 이 파일은 DeepSeek의 thinking(기본값 켜짐)을
 * 끄지 않아 언어당 출력이 1.2만~2.5만 토큰이었다.
 * reasoning effort는 'low'다. 2026-11-26 시험에서 'none'은 영어·베트남어 9번 중 3번 필수 GEO
 * 문구를 1회만 넣었고(아래 검수 실패), 'low'는 6번 모두 지켰다. 추론 토큰은 호출당 150개 안팎이다.
 */
export const TRANSLATION_MODEL = 'gpt-6-luna';

// 지연 초기화: 모듈 스코프에서 만들면 env.ts가 .env.local을 읽기 전에 실행된다.
let _client: OpenAI | null = null;
const client = () =>
  (_client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    // SDK 기본 타임아웃(10분)보다 짧게 잡되 느린 언어(태국어)도 통과할 만큼은 준다.
    timeout: 5 * 60 * 1000,
    maxRetries: 0, // 재시도는 withRetry가 담당한다 — 이중 재시도를 만들지 않는다
  }));

/**
 * 마커 형식을 쓴다. JSON은 안 된다.
 *
 * 실측: 같은 글·같은 프롬프트로 3개 언어를 돌렸을 때
 *   순수 JSON            3/3 (다만 별도 실행에서 일본어 1회 파싱 실패 — 간헐적)
 *   response_format JSON 1/3  ← 본문 HTML의 제어문자가 JSON 문자열을 깬다
 *   마커                 3/3
 * 번역은 글 1편당 5회 도는 경로라 간헐적 실패도 비싸다. 마커는 이스케이프가
 * 없어 이 부류의 실패가 구조적으로 생기지 않는다.
 */
function buildPrompt(article: Article, lang: Lang): string {
  const geo = GEO_HINTS[lang];
  const langName = LANG_META[lang].promptName;
  const region = article.region;
  const nativeQuery = geo.nativeQuery.replace(/\{region\}/g, region);

  return `You are localizing a Korean medical article about ${region} ${SITE.categoryKo} clinics for ${langName} readers.

This is LOCALIZATION, not literal translation. The audience is:
${geo.angle}

Requirements:
1. Translate into natural, native-quality ${langName}. Keep the HTML structure EXACTLY — same tags, same order, same number of <h2>/<h3>/<table> elements. No emojis. Use only these tags: h2, h3, p, ul, ol, li, table, thead, tbody, tr, th, td, blockquote, strong.
2. Keep Korean clinic names and addresses in Korean script, and add a romanized or translated form in parentheses the FIRST time each clinic name appears, e.g. 강남서울치과 (Gangnam Seoul Dental). A reader must be able to show the Korean to a taxi driver and also pronounce it.
3. THE PLACE NAME "${region}" must appear in a form this audience can read and type into a search box.
   - Latin-script languages: use the standard romanization as the primary form.
   - Japanese: katakana or the Japanese reading (カンナム / 江南).
   - Chinese: the Chinese reading of the place name.
   - Thai: Thai transcription.
   NEVER leave raw Hangul as the ONLY form of the place name in the title or meta description.
4. Add ONE short paragraph (2-3 sentences) immediately after the first </h2> section, written for this audience: what a foreign patient should know about visiting a clinic in ${region} — language support, how to book, what to bring. Be honest: say language support varies by clinic and must be confirmed by phone or the clinic's booking page.
5. REQUIRED PHRASE — the single most important instruction. This audience searches with phrases like:
     ${nativeQuery}
   The exact string "${geo.mustInclude}" MUST appear verbatim at least TWICE in the article body, AND at least once in the title or the meta description. Write it into sentences that read naturally; if a sentence sounds forced, rewrite the sentence — but the phrase must be present.
   Reason: AI assistants receive questions phrased exactly this way. An article that only paraphrases never becomes a candidate answer.
6. In the FAQ section, replace ONE existing question with a question this audience would actually ask about language support or visiting as a foreigner, and answer it honestly from the article's data.

CRITICAL — do not invent facts:
- NEVER claim a specific clinic has English/Japanese/Chinese/Thai-speaking staff. The source data does not contain that information. Write about how to CHECK, not that it exists.
- Do not invent prices, certifications, doctor names, or international patient departments.
- Every number (review counts, ratings, specialist counts) must match the Korean source exactly.

Title: ${article.title}
Meta: ${article.metaDescription}
Content: ${article.content}

Respond using EXACTLY these three markers and nothing else. Do not wrap the response in JSON or code fences.
===TITLE===
(translated title)
===META===
(translated meta description)
===CONTENT===
(translated HTML content)`;
}

function parseMarkers(text: string) {
  const m = text.match(
    /===TITLE===\s*([\s\S]*?)\s*===META===\s*([\s\S]*?)\s*===CONTENT===\s*([\s\S]*?)\s*$/
  );
  if (!m) throw new RetryableError('markers not found in translation output');
  return { title: m[1].trim(), metaDescription: m[2].trim(), content: stripTrailingMarkers(m[3]) };
}

const countTag = (html: string, t: string) =>
  (html.match(new RegExp(`<${t}[ >]`, 'g')) || []).length;

/**
 * 번역본 검수. 통과하지 못하면 던져서 재시도시킨다.
 *
 * 원문보다 짧아지는 것은 정상이 아니다(한국어 → 영어는 보통 길어진다). 구조가
 * 깨지거나 GEO 문구가 빠진 번역은 발행해도 목적을 달성하지 못하므로 저장하지 않는다.
 */
export function assertTranslationSane(
  src: Article,
  out: { title: string; metaDescription: string; content: string },
  lang: Lang
): void {
  const must = GEO_HINTS[lang].mustInclude;
  const body = out.content;

  if (!out.title.trim()) throw new RetryableError(`${lang}: empty title`);
  if (!out.metaDescription.trim()) throw new RetryableError(`${lang}: empty metaDescription`);
  if (body.length < src.content.length * 0.5) {
    throw new RetryableError(
      `${lang}: body too short — ${body.length} vs source ${src.content.length}`
    );
  }
  if (!/<\/(h2|h3|p|ul|ol|table|blockquote)>$/.test(body.trimEnd())) {
    throw new RetryableError(`${lang}: does not end on a closed block tag`);
  }
  for (const tag of ['h2', 'table'] as const) {
    const a = countTag(body, tag);
    const b = countTag(src.content, tag);
    if (a !== b) throw new RetryableError(`${lang}: <${tag}> count ${a} ≠ source ${b}`);
  }

  const inBody = body.split(must).length - 1;
  if (inBody < 2) {
    throw new RetryableError(`${lang}: required phrase "${must}" appears ${inBody}× in body (need 2)`);
  }
  // 제목/메타의 필수 문구는 두 모델 모두 자주 놓치는 항목이라 경고만 남긴다.
  // 이것 때문에 번역 전체를 버리면 재시도 비용이 이득보다 크다.
  if (!`${out.title} ${out.metaDescription}`.includes(must)) {
    console.log(`    [warn] ${lang}: "${must}" missing from title/meta`);
  }
}

/** 한 언어 번역. 실패는 던진다 — 호출부의 withRetry가 받는다. */
export async function translateOne(article: Article, lang: Lang): Promise<TranslatedArticle> {
  const res = await client().responses.create({
    model: TRANSLATION_MODEL,
    reasoning: { effort: 'low' },
    // 번역문은 원문보다 길어진다 — 한국어 11,000자가 영어 22,000자가 된다. 실측 언어당
    // 출력은 4.5~6.2K 토큰(2026-11-26, 한국어 8,600자 글)이라 32000이면 넉넉하다. 이 값은 OpenAI 분당 토큰 한도
    // 계산에 그대로 들어가고 언어 5개가 동시에 뜨므로 필요 이상으로 키우지 않는다.
    // luna는 temperature를 지원하지 않는다.
    max_output_tokens: 32000,
    input: [{ role: 'user', content: buildPrompt(article, lang) }],
  });

  const r = res as unknown as {
    status?: string;
    incomplete_details?: { reason?: string };
    error?: { message?: string };
    output_text?: string;
    output?: { type: string; content?: { type: string; refusal?: string }[] }[];
    usage?: AnyUsage;
  };

  record(`tr:${lang}`, r.usage);

  if (r.status === 'incomplete') {
    throw new RetryableError(`${lang}: incomplete — ${r.incomplete_details?.reason ?? 'unknown'}`);
  }
  if (r.status && r.status !== 'completed') {
    throw new RetryableError(`${lang}: status=${r.status} ${r.error?.message ?? ''}`);
  }
  const refusal = (r.output ?? [])
    .flatMap(i => (i.type === 'message' ? i.content ?? [] : []))
    .find(c => c.type === 'refusal');
  if (refusal) throw new FatalError(`${lang}: refusal — ${refusal.refusal}`);
  const text = r.output_text;
  if (!text?.trim()) throw new RetryableError(`${lang}: empty output_text`);

  const out = parseMarkers(text);
  assertTranslationSane(article, out, lang);

  return {
    id: `${article.slug}__${lang}`,
    slug: article.slug,
    lang,
    specialty: article.specialty,
    specialtySlug: article.specialtySlug,
    region: article.region,
    title: out.title,
    metaDescription: out.metaDescription,
    content: out.content,
    publishedAt: article.publishedAt,
    translatedAt: new Date().toISOString(),
    translationModel: TRANSLATION_MODEL,
  };
}

/**
 * 5개 언어를 동시에 번역한다.
 *
 * 직렬로 돌리면 언어당 50~70초 × 5 = 4~6분이 발행 1건에 그대로 붙는다. 동시 실행이면
 * 가장 느린 언어 하나만큼(약 70초)이다. API 동시 요청 제한에 걸릴 수 있으므로
 * 한 언어가 실패해도 나머지는 저장되도록 allSettled를 쓴다 — 끝내 실패한 언어는
 * translate-backfill.ts가 나중에 채운다.
 *
 * 언어마다 withRetry로 3번까지 시도한다. luna로 바꾼 뒤(2026-11-26) 필수 GEO 문구를 본문에
 * 1회만 넣어 assertTranslationSane에서 떨어지는 언어가 발행 1건당 0~2개씩 나왔는데, 재시도가
 * 없어 그대로 빠졌다(11/27 확인). 다시 부르면 대개 통과하고, 1회 비용은 0.3센트 안팎이다.
 */
export async function translateAll(
  article: Article,
  langs: readonly Lang[] = LANGS
): Promise<{ ok: TranslatedArticle[]; failed: { lang: Lang; error: string }[] }> {
  const results = await Promise.allSettled(
    langs.map(l => withRetry(() => translateOne(article, l), { label: `tr:${l}`, attempts: 3 }))
  );

  const ok: TranslatedArticle[] = [];
  const failed: { lang: Lang; error: string }[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') ok.push(r.value);
    else failed.push({ lang: langs[i], error: (r.reason as Error).message.slice(0, 120) });
  });
  return { ok, failed };
}
