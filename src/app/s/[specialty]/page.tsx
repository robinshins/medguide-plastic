import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site.config';
import { getArticles } from '@/lib/articles';
import ArticleGrid from '@/app/components/ArticleGrid';

interface PageProps {
  params: Promise<{ specialty: string }>;
}

export const dynamicParams = false;
export const revalidate = 21600;

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${SITE.domain}`;

function findSpecialty(slug: string) {
  return SITE.specialties.find(s => (s.slug || 'general') === slug) ?? null;
}

export function generateStaticParams() {
  return SITE.specialties.map(s => ({ specialty: s.slug || 'general' }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { specialty } = await params;
  const def = findSpecialty(specialty);
  if (!def) return { title: 'Not Found' };
  const label = def.label || def.name || SITE.categoryKo;
  return {
    title: `${label} — 지역별 ${SITE.categoryKo} 비교`,
    description: def.blurb
      ? `${def.blurb}. ${SITE.siteDescription}`
      : SITE.siteDescription,
    alternates: { canonical: `${baseUrl}/s/${specialty}` },
  };
}

export default async function SpecialtyPage({ params }: PageProps) {
  const { specialty } = await params;
  const def = findSpecialty(specialty);
  if (!def) notFound();

  const label = def.label || def.name || SITE.categoryKo;
  let articles: Awaited<ReturnType<typeof getArticles>> = [];
  try { articles = await getArticles(specialty); } catch { /* */ }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${label} — ${SITE.siteName}`,
    description: def.blurb || SITE.siteDescription,
    url: `${baseUrl}/s/${specialty}`,
    isPartOf: { '@type': 'WebSite', name: SITE.siteName, url: baseUrl },
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="border-b border-line bg-surface-card">
        <div className="max-w-6xl mx-auto px-4 pt-10 pb-12">
          <nav className="text-sm text-ink-soft mb-5 flex items-center gap-2">
            <Link href="/" className="hover:text-brand-600">홈</Link>
            <span>›</span>
            <span className="text-ink-muted">{label}</span>
          </nav>
          <h1 className="text-3xl font-bold text-ink tracking-tight">{label}</h1>
          {def.blurb ? <p className="text-ink-muted mt-2.5 max-w-2xl">{def.blurb}</p> : null}

          <div className="flex flex-wrap gap-1.5 mt-6">
            {SITE.specialties.map(s => {
              const slug = s.slug || 'general';
              const active = slug === specialty;
              return (
                <Link
                  key={slug}
                  href={`/s/${slug}`}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'bg-surface-sunk text-ink-muted hover:bg-brand-50 hover:text-brand-700'
                  }`}
                >
                  {s.label || s.name || SITE.categoryKo}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <ArticleGrid articles={articles} />
      </div>
    </div>
  );
}
