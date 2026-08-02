import OpenAI from 'openai';
import { SITE } from '../../src/lib/site.config';
import { LANGS, LANG_META, GEO_HINTS, type Lang } from '../../src/lib/i18n';
import type { Article, TranslatedArticle } from '../../src/lib/types';
import { RetryableError, FatalError } from './errors';
import { record, type AnyUsage } from './usage';
import { stripTrailingMarkers } from './generate';

/**
 * DeepSeek V4-Flash로 번역한다. gpt-5.4-mini 대비 출력 단가가 1/16($0.28 vs $4.50)이고,
 * 실측 비교에서 품질은 오히려 나았다 — GEO 필수 문구를 본문에 3~4회 넣은 반면
 * gpt-5.4-mini는 영어에서 1회에 그쳐 요구(2회 이상)를 어겼고, 스페인어 제목에는
 * 한글을 남겼다. HTML 구조 보존과 수치 일치는 두 모델이 동등했다.
 */
export const TRANSLATION_MODEL = 'deepseek-v4-flash';

// 지연 초기화: 모듈 스코프에서 만들면 env.ts가 .env.local을 읽기 전에 실행된다.
let _client: OpenAI | null = null;
const client = () => {
  // 명시적으로 막는다. DEEPSEEK_API_KEY가 없으면 OpenAI SDK가 조용히
  // OPENAI_API_KEY로 폴백해 DeepSeek 엔드포인트에 OpenAI 키를 보내고,
  // 원인을 알 수 없는 401 다섯 개가 뜬다.
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new FatalError('DEEPSEEK_API_KEY is not set — translation cannot run');
  }
  return (_client ??= new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
    // 번역 1건이 50~70초 걸린다. SDK 기본 타임아웃(10분)보다 짧게 잡되
    // 느린 언어(태국어)도 통과할 만큼은 준다.
    timeout: 5 * 60 * 1000,
    maxRetries: 0, // 재시도는 withRetry가 담당한다 — 이중 재시도를 만들지 않는다
  }));
};

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
  const res = await client().chat.completions.create({
    model: TRANSLATION_MODEL,
    messages: [{ role: 'user', content: buildPrompt(article, lang) }],
    max_tokens: 16000,
  });

  record(`tr:${lang}`, res.usage as AnyUsage);

  const choice = res.choices[0];
  if (!choice) throw new RetryableError(`${lang}: no choices returned`);
  if (choice.finish_reason === 'length') {
    throw new RetryableError(`${lang}: truncated (finish_reason=length)`);
  }
  const text = choice.message?.content;
  if (!text?.trim()) throw new RetryableError(`${lang}: empty content`);
  if (choice.message?.refusal) throw new FatalError(`${lang}: refusal — ${choice.message.refusal}`);

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
 * 가장 느린 언어 하나만큼(약 70초)이다. DeepSeek 쪽 동시 요청 제한에 걸릴 수 있으므로
 * 한 언어가 실패해도 나머지는 저장되도록 allSettled를 쓴다 — 실패한 언어는
 * translate-backfill.ts가 나중에 채운다.
 */
export async function translateAll(
  article: Article,
  langs: readonly Lang[] = LANGS
): Promise<{ ok: TranslatedArticle[]; failed: { lang: Lang; error: string }[] }> {
  const results = await Promise.allSettled(langs.map(l => translateOne(article, l)));

  const ok: TranslatedArticle[] = [];
  const failed: { lang: Lang; error: string }[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') ok.push(r.value);
    else failed.push({ lang: langs[i], error: (r.reason as Error).message.slice(0, 120) });
  });
  return { ok, failed };
}
