import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/site-url';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslatedArticle, getLatestArticles, getAvailableLangs } from '@/lib/articles';
import { SITE } from '@/lib/site.config';
import { looksRestricted } from '@/lib/restricted';
import type { Article, HospitalInfo } from '@/lib/types';
import Comments from '@/app/components/Comments';
import { UI, LANG_META, localePath, type AnyLang, type Lang } from '@/lib/i18n';
import { CARD, localizeHours, localizeSpecialists, romanize, hasHangul } from '@/lib/hospital-i18n';

// 한국어 원문과 5개 번역본이 이 컴포넌트 하나를 공유한다. 라우트 파일
// (`[seg]/page.tsx`, `[seg]/[slug]/page.tsx`)은 lang만 정해서 넘긴다.

const baseUrl = getBaseUrl();

/** 이 slug의 hreflang 목록. 실제로 존재하는 번역만 넣는다. */
async function buildAlternates(slug: string, lang: AnyLang) {
  let available: Lang[] = [];
  try { available = await getAvailableLangs(slug); } catch { /* build-time without creds */ }
  const languages: Record<string, string> = { ko: `${baseUrl}/${slug}` };
  for (const l of available) languages[LANG_META[l].htmlLang] = `${baseUrl}${localePath(l, slug)}`;
  // x-default는 원문(한국어)을 가리킨다 — 어느 언어도 맞지 않는 방문자에게
  // 데이터가 가장 완전한 판본을 준다.
  languages['x-default'] = `${baseUrl}/${slug}`;
  return { canonical: `${baseUrl}${localePath(lang, slug)}`, languages };
}

export async function articleMetadata(slug: string, lang: AnyLang): Promise<Metadata> {
  let article: Awaited<ReturnType<typeof getTranslatedArticle>> = null;
  try { article = await getTranslatedArticle(slug, lang); } catch { /* build-time without creds */ }
  if (!article) return { title: 'Not Found', robots: { index: false } };

  const meta = LANG_META[lang];
  const alternates = await buildAlternates(slug, lang);
  return {
    title: article.title,
    description: article.metaDescription,
    keywords: lang === 'ko'
      ? `${article.region} ${SITE.categoryKo}, ${article.region} ${SITE.categoryKo} 추천, ${article.keyword}, ${article.region} ${article.specialty} 후기`
      : undefined,
    alternates,
    openGraph: {
      title: `${article.title} | ${SITE.siteName}`,
      description: article.metaDescription,
      type: 'article',
      locale: meta.ogLocale,
      publishedTime: article.publishedAt,
      siteName: SITE.siteName,
      url: alternates.canonical,
      images: [{ url: '/og/og.png', width: 1200, height: 630, alt: article.title }],
    },
    other: {
      'article:section': SITE.categoryKo,
      'article:tag': `${article.region},${SITE.categoryKo},${article.specialty}`,
    },
  };
}

function stripEmojis(html: string): string {
  return html.replace(
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1FFFF}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]/gu,
    ''
  );
}


/**
 * AggregateRating에 쓸 평점과 리뷰 수를 한 플랫폼에서 함께 고른다.
 *
 * 두 가지를 고친다.
 * 1. reviewCount가 0이면 aggregateRating을 아예 내보내지 않는다. Google Search
 *    Console이 "속성 'reviewCount'의 값은 양수여야 합니다"를 심각 오류로 보고했고,
 *    심각 오류가 있으면 그 페이지의 리뷰 스니펫이 검색 결과에서 빠진다.
 * 2. 평점과 리뷰 수의 출처를 일치시킨다. 이전에는 카카오 평점에 네이버·구글 리뷰
 *    수까지 더한 값을 붙여서, 500건에 근거한 4.5점을 3,000건에 근거한 것처럼
 *    신고했다. 리뷰 수가 가장 많은 플랫폼 하나를 골라 그 쌍만 쓴다.
 */
function pickRating(h: HospitalInfo): { rating: number; count: number } | null {
  const sources = [
    { rating: h.kakaoRating, count: h.kakaoReviewCount || 0 },
    { rating: h.googleRating, count: h.googleReviewCount || 0 },
    { rating: h.naverStarRating, count: h.naverReviewCount || 0 },
  ].filter((s): s is { rating: number; count: number } => !!s.rating && s.count > 0);
  if (!sources.length) return null;
  return sources.sort((a, b) => b.count - a.count)[0];
}

function buildJsonLd(article: Article, hospitals: HospitalInfo[], lang: AnyLang) {
  const pageUrl = `${baseUrl}${localePath(lang, article.slug)}`;
  const clinicType = SITE.clinicSchemaType ?? 'MedicalClinic';
  const specialtyLabel = article.specialtySlug === 'general' ? SITE.categoryKo : article.specialty;

  const schemas: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'MedicalWebPage',
      headline: article.title,
      description: article.metaDescription,
      keywords: [article.keyword, article.region, article.specialty].filter(Boolean).join(', '),
      datePublished: article.publishedAt,
      dateModified: article.publishedAt,
      author: { '@type': 'Organization', name: SITE.siteName, url: baseUrl },
      publisher: {
        '@type': 'Organization',
        name: SITE.siteName,
        url: baseUrl,
        logo: { '@type': 'ImageObject', url: `${baseUrl}/logo-512.png` },
      },
      mainEntityOfPage: pageUrl,
      inLanguage: LANG_META[lang].htmlLang,
      image: `${baseUrl}/og/og.png`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, item: { '@id': baseUrl, name: SITE.siteName } },
        { '@type': 'ListItem', position: 2, item: { '@id': `${baseUrl}/s/${article.specialtySlug}`, name: specialtyLabel } },
        { '@type': 'ListItem', position: 3, item: { '@id': pageUrl, name: `${article.region} ${specialtyLabel}` } },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      description: `${article.region} ${specialtyLabel} ${hospitals.length}곳 비교 정보`,
      numberOfItems: hospitals.length,
      itemListElement: hospitals.map((h, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: h.name,
        url: h.id ? `https://m.place.naver.com/place/${h.id}` : undefined,
        image: `${baseUrl}/og/rank-${Math.min(i + 1, 7)}.png`,
      })),
    },
    ...hospitals.map(h => {
      const addressParts = (h.address || '').split(' ');
      return {
        '@context': 'https://schema.org',
        '@type': clinicType,
        name: h.name,
        url: h.id ? `https://m.place.naver.com/place/${h.id}` : h.homepage || undefined,
        telephone: h.phone || undefined,
        address: {
          '@type': 'PostalAddress',
          streetAddress: addressParts.slice(2).join(' '),
          addressLocality: addressParts[1] || '',
          addressRegion: addressParts[0] || '',
          addressCountry: 'KR',
        },
        ...(() => {
          const r = pickRating(h);
          return r ? { aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: r.rating,
            reviewCount: r.count,
            bestRating: 5,
          } } : {};
        })(),
      };
    }),
  ];

  // FAQPage from the generated <h3>…?</h3><p>…</p> pairs
  const faqItems = article.content.match(/<h3[^>]*>([^<]*\?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g);
  const faqEntries = (faqItems ?? [])
    .map((item: string) => {
      const q = item.match(/<h3[^>]*>([^<]+)<\/h3>/);
      const a = item.match(/<p>([\s\S]*?)<\/p>/);
      if (!q || !a) return null;
      return {
        '@type': 'Question',
        name: q[1],
        acceptedAnswer: { '@type': 'Answer', text: a[1].replace(/<[^>]*>/g, '') },
      };
    })
    .filter(Boolean);
  if (faqEntries.length > 0) {
    schemas.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqEntries });
  }

  return schemas;
}

function RatingChip({ label, value, count, kind, fmt }: { label: string; value: number | null; count: number; kind: 'naver' | 'kakao' | 'google'; fmt: (n: number) => string }) {
  if (!value && !count) return null;
  const styles = {
    naver: 'bg-platform-naverBg text-platform-naverFg',
    kakao: 'bg-platform-kakaoBg text-platform-kakaoFg',
    google: 'bg-platform-googleBg text-platform-googleFg',
  }[kind];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {label} {value ? value.toFixed(1) : '-'}
      <span className="opacity-70 font-normal">({fmt(count)})</span>
    </span>
  );
}

function HospitalCard({ hospital, rank, lang }: { hospital: HospitalInfo; rank: number; lang: AnyLang }) {
  const mapUrl = hospital.id ? `https://m.place.naver.com/place/${hospital.id}` : hospital.homepage;
  const c = CARD[lang];
  const showRoman = lang !== 'ko';
  const specialists = localizeSpecialists(hospital.specialistsInfo, lang);
  return (
    <div className="bg-surface-card rounded-lg shadow-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex-none w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center text-sm font-bold">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          {/* 병원명·주소는 한글을 유지한다 — 지도 앱 입력과 택시 기사에게 보여주기
              위해서다. 그 아래 로마자를 덧붙여 읽고 발음할 수 있게 한다. */}
          <h4 className="font-bold text-ink truncate">{hospital.name}</h4>
          {showRoman && hasHangul(hospital.name) ? (
            <p className="text-xs text-ink-soft mt-0.5">{romanize(hospital.name)}</p>
          ) : null}
          {hospital.address ? <p className="text-sm text-ink-soft mt-0.5">{hospital.address}</p> : null}
          {showRoman && hasHangul(hospital.address) ? (
            <p className="text-xs text-ink-soft">{romanize(hospital.address)}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <RatingChip label={c.naver} value={hospital.naverStarRating} count={hospital.naverReviewCount} kind="naver" fmt={c.reviews} />
            <RatingChip label={c.kakao} value={hospital.kakaoRating} count={hospital.kakaoReviewCount} kind="kakao" fmt={c.reviews} />
            <RatingChip label={c.google} value={hospital.googleRating} count={hospital.googleReviewCount} kind="google" fmt={c.reviews} />
          </div>
          <dl className="mt-3 space-y-1 text-sm text-ink-muted">
            {hospital.businessHours ? (
              <div className="flex gap-2"><dt className="flex-none text-ink-soft">{c.hours}</dt><dd>{localizeHours(hospital.businessHours, lang)}</dd></div>
            ) : null}
            {hospital.phone ? (
              <div className="flex gap-2"><dt className="flex-none text-ink-soft">{c.phone}</dt><dd><a href={`tel:${hospital.phone}`} className="text-brand-600">{hospital.phone}</a></dd></div>
            ) : null}
            {specialists ? (
              <div className="flex gap-2">
                <dt className="flex-none text-ink-soft">{lang === 'ko' ? SITE.credentialLabel : c.specialists}</dt>
                <dd className="line-clamp-2">{specialists}</dd>
              </div>
            ) : null}
          </dl>
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-brand-600 hover:text-brand-800"
            >
              {c.viewOnMap}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export async function ArticleView({ slug, lang }: { slug: string; lang: AnyLang }) {
  let article: Awaited<ReturnType<typeof getTranslatedArticle>> = null;
  try { article = await getTranslatedArticle(slug, lang); } catch { /* */ }
  if (!article) notFound();

  const ui = UI[lang];
  const meta = LANG_META[lang];
  const hospitals = (article.hospitals || []).filter(h => !looksRestricted(h.name));
  const schemas = buildJsonLd(article, hospitals, lang);
  const specialtyLabel = article.specialtySlug === 'general' ? SITE.categoryKo : article.specialty;
  const related = (await getLatestArticles(7, lang)).filter(a => a.slug !== article.slug).slice(0, 4);

  let available: Lang[] = [];
  try { available = await getAvailableLangs(slug); } catch { /* */ }
  const published = new Date(article.publishedAt).toLocaleDateString(meta.htmlLang);

  // <html lang>은 루트 레이아웃이 "ko"로 고정한다 — 루트 레이아웃은 라우트 파라미터를
  // 받을 수 없고, 헤더로 우회하면 정적 생성이 통째로 풀린다. 대신 번역 본문 트리에
  // lang을 걸어 스크린리더와 브라우저 번역이 올바른 언어를 인식하게 한다.
  // 검색엔진에 대한 언어 신호는 metadata의 hreflang alternates가 담당한다.
  return (
    <div lang={meta.htmlLang}>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <div className="border-b border-line bg-surface-card">
        <div className="max-w-3xl mx-auto px-4 pt-8 pb-10">
          <nav className="text-sm text-ink-soft mb-6 flex items-center gap-2">
            <Link href={localePath(lang)} className="hover:text-brand-600">{ui.home}</Link>
            <span>›</span>
            <Link href={localePath(lang, `s/${article.specialtySlug}`)} className="hover:text-brand-600">{specialtyLabel}</Link>
            <span>›</span>
            <span className="text-ink-muted">{article.region}</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold text-ink leading-snug tracking-tight">
            {article.title}
          </h1>
          <div className="flex items-center gap-3 mt-4 text-sm text-ink-soft">
            <span>{SITE.siteName}</span>
            <span>·</span>
            <time dateTime={article.publishedAt}>{published}</time>
          </div>

          {(available.length > 0 || lang !== 'ko') ? (
            <div className="flex flex-wrap items-center gap-2 mt-5 text-sm">
              <span className="text-ink-soft">{ui.languageLabel}:</span>
              {(['ko', ...available] as AnyLang[]).map(l => (
                l === lang ? (
                  <span key={l} className="px-2 py-0.5 rounded bg-brand-600 text-white">{LANG_META[l].nativeName}</span>
                ) : (
                  <Link key={l} href={localePath(l, slug)} hrefLang={LANG_META[l].htmlLang}
                        className="px-2 py-0.5 rounded bg-surface-sunk text-ink-muted hover:text-brand-600">
                    {LANG_META[l].nativeName}
                  </Link>
                )
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {lang !== 'ko' ? (
          <p className="mb-8 rounded-lg bg-surface-sunk px-4 py-3 text-sm text-ink-muted leading-relaxed">
            {ui.translatedNotice}
          </p>
        ) : null}

        <article
          className="article-content"
          dangerouslySetInnerHTML={{ __html: stripEmojis(article.content) }}
        />

        {hospitals.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-ink mb-5">
              {lang === 'ko'
                ? `이 글에서 다룬 ${SITE.categoryKo} ${hospitals.length}곳`
                : `${hospitals.length} clinics covered`}
            </h2>
            <div className="space-y-4">
              {hospitals.map((h, i) => (
                <HospitalCard key={h.id || i} hospital={h} rank={i + 1} lang={lang} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12 rounded-lg bg-surface-sunk p-5 text-sm text-ink-muted leading-relaxed">
          <p className="font-semibold text-ink mb-1.5">
            {lang === 'ko' ? '데이터 출처와 한계' : 'Sources and limitations'}
          </p>
          <p>
            {lang === 'ko' ? (
              <>이 글은 네이버 플레이스 방문자 리뷰, 카카오맵·구글맵 평점, 건강보험심사평가원 공개 정보를
              수집해 작성했습니다. 리뷰와 평점은 수집 시점({published})
              기준이며 이후 변동될 수 있습니다. 의료 선택은 반드시 전문의 상담을 거치시기 바랍니다.</>
            ) : (
              <>Compiled from Naver Place visitor reviews, KakaoMap and Google Maps ratings, and public
              HIRA records, as of {published}. Ratings and review counts change over time.
              {' '}{ui.disclaimer}</>
            )}
          </p>
        </section>

        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-ink mb-4">
              {lang === 'ko' ? '함께 볼 만한 글' : ui.latestArticles}
            </h2>
            <ul className="space-y-2.5">
              {related.map(a => (
                <li key={a.slug}>
                  <Link href={localePath(lang, a.slug)} className="text-brand-600 hover:text-brand-800 underline underline-offset-2">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-14">
          {/* 댓글은 언어별로 분리한다 — 한국어 독자와 영어 독자가 같은 스레드를 보면
              서로 읽지 못하는 글이 섞인다. */}
          <Comments articleId={lang === 'ko' ? article.slug : `${article.slug}__${lang}`} />
        </div>
      </div>
    </div>
  );
}
