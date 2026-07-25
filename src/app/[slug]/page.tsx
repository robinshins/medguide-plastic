import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/site-url';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getArticle, getLatestArticles } from '@/lib/articles';
import { SITE } from '@/lib/site.config';
import { looksRestricted } from '@/lib/restricted';
import type { HospitalInfo } from '@/lib/types';
import Comments from '@/app/components/Comments';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true;
export const revalidate = 21600;

const baseUrl = getBaseUrl();

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  let article: Awaited<ReturnType<typeof getArticle>> = null;
  try { article = await getArticle(slug); } catch { /* build-time without creds */ }
  if (!article) return { title: 'Not Found' };

  const canonicalUrl = `${baseUrl}/${slug}`;
  return {
    title: article.title,
    description: article.metaDescription,
    keywords: `${article.region} ${SITE.categoryKo}, ${article.region} ${SITE.categoryKo} 추천, ${article.keyword}, ${article.region} ${article.specialty} 후기`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${article.title} | ${SITE.siteName}`,
      description: article.metaDescription,
      type: 'article',
      locale: 'ko_KR',
      publishedTime: article.publishedAt,
      siteName: SITE.siteName,
      url: canonicalUrl,
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

function buildJsonLd(article: NonNullable<Awaited<ReturnType<typeof getArticle>>>, hospitals: HospitalInfo[]) {
  const pageUrl = `${baseUrl}/${article.slug}`;
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
      inLanguage: 'ko',
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
        ...(h.kakaoRating || h.googleRating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: h.kakaoRating || h.googleRating,
                reviewCount: (h.kakaoReviewCount || 0) + (h.naverReviewCount || 0) + (h.googleReviewCount || 0),
                bestRating: 5,
              },
            }
          : {}),
      };
    }),
  ];

  // FAQPage from the generated <h3>…?</h3><p>…</p> pairs
  const faqItems = article.content.match(/<h3[^>]*>([^<]*\?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g);
  const faqEntries = (faqItems ?? [])
    .map(item => {
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

function RatingChip({ label, value, count, kind }: { label: string; value: number | null; count: number; kind: 'naver' | 'kakao' | 'google' }) {
  if (!value && !count) return null;
  const styles = {
    naver: 'bg-platform-naverBg text-platform-naverFg',
    kakao: 'bg-platform-kakaoBg text-platform-kakaoFg',
    google: 'bg-platform-googleBg text-platform-googleFg',
  }[kind];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {label} {value ? value.toFixed(1) : '-'}
      <span className="opacity-70 font-normal">({count.toLocaleString()})</span>
    </span>
  );
}

function HospitalCard({ hospital, rank }: { hospital: HospitalInfo; rank: number }) {
  const mapUrl = hospital.id ? `https://m.place.naver.com/place/${hospital.id}` : hospital.homepage;
  return (
    <div className="bg-surface-card rounded-lg shadow-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex-none w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center text-sm font-bold">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-ink truncate">{hospital.name}</h4>
          {hospital.address ? <p className="text-sm text-ink-soft mt-0.5">{hospital.address}</p> : null}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <RatingChip label="네이버" value={hospital.naverStarRating} count={hospital.naverReviewCount} kind="naver" />
            <RatingChip label="카카오" value={hospital.kakaoRating} count={hospital.kakaoReviewCount} kind="kakao" />
            <RatingChip label="구글" value={hospital.googleRating} count={hospital.googleReviewCount} kind="google" />
          </div>
          <dl className="mt-3 space-y-1 text-sm text-ink-muted">
            {hospital.businessHours ? (
              <div className="flex gap-2"><dt className="flex-none text-ink-soft">진료시간</dt><dd>{hospital.businessHours}</dd></div>
            ) : null}
            {hospital.phone ? (
              <div className="flex gap-2"><dt className="flex-none text-ink-soft">전화</dt><dd><a href={`tel:${hospital.phone}`} className="text-brand-600">{hospital.phone}</a></dd></div>
            ) : null}
            {hospital.specialistsInfo ? (
              <div className="flex gap-2"><dt className="flex-none text-ink-soft">{SITE.credentialLabel}</dt><dd className="line-clamp-2">{hospital.specialistsInfo}</dd></div>
            ) : null}
          </dl>
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-brand-600 hover:text-brand-800"
            >
              네이버 지도에서 보기 →
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  let article: Awaited<ReturnType<typeof getArticle>> = null;
  try { article = await getArticle(slug); } catch { /* */ }
  if (!article) notFound();

  const hospitals = (article.hospitals || []).filter(h => !looksRestricted(h.name));
  const schemas = buildJsonLd(article, hospitals);
  const specialtyLabel = article.specialtySlug === 'general' ? SITE.categoryKo : article.specialty;
  const related = (await getLatestArticles(7)).filter(a => a.slug !== article.slug).slice(0, 4);

  return (
    <div>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <div className="border-b border-line bg-surface-card">
        <div className="max-w-3xl mx-auto px-4 pt-8 pb-10">
          <nav className="text-sm text-ink-soft mb-6 flex items-center gap-2">
            <Link href="/" className="hover:text-brand-600">홈</Link>
            <span>›</span>
            <Link href={`/s/${article.specialtySlug}`} className="hover:text-brand-600">{specialtyLabel}</Link>
            <span>›</span>
            <span className="text-ink-muted">{article.region}</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold text-ink leading-snug tracking-tight">
            {article.title}
          </h1>
          <div className="flex items-center gap-3 mt-4 text-sm text-ink-soft">
            <span>{SITE.siteName}</span>
            <span>·</span>
            <time dateTime={article.publishedAt}>
              {new Date(article.publishedAt).toLocaleDateString('ko')}
            </time>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <article
          className="article-content"
          dangerouslySetInnerHTML={{ __html: stripEmojis(article.content) }}
        />

        {hospitals.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-ink mb-5">이 글에서 다룬 {SITE.categoryKo} {hospitals.length}곳</h2>
            <div className="space-y-4">
              {hospitals.map((h, i) => (
                <HospitalCard key={h.id || i} hospital={h} rank={i + 1} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12 rounded-lg bg-surface-sunk p-5 text-sm text-ink-muted leading-relaxed">
          <p className="font-semibold text-ink mb-1.5">데이터 출처와 한계</p>
          <p>
            이 글은 네이버 플레이스 방문자 리뷰, 카카오맵·구글맵 평점, 건강보험심사평가원 공개 정보를
            수집해 작성했습니다. 리뷰와 평점은 수집 시점({new Date(article.publishedAt).toLocaleDateString('ko')})
            기준이며 이후 변동될 수 있습니다. 의료 선택은 반드시 전문의 상담을 거치시기 바랍니다.
          </p>
        </section>

        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-ink mb-4">함께 볼 만한 글</h2>
            <ul className="space-y-2.5">
              {related.map(a => (
                <li key={a.slug}>
                  <Link href={`/${a.slug}`} className="text-brand-600 hover:text-brand-800 underline underline-offset-2">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-14">
          <Comments articleId={article.slug} />
        </div>
      </div>
    </div>
  );
}
