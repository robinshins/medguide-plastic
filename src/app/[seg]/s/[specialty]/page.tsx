import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site.config';
import { getBaseUrl } from '@/lib/site-url';
import { getArticles } from '@/lib/articles';
import { UI, LANG_META, langFromSegment, localePath, specialtyLabel } from '@/lib/i18n';

/** /en/s/lasik — 번역 언어의 진료항목 목록. */
interface PageProps {
  params: Promise<{ seg: string; specialty: string }>;
}

export const dynamicParams = true;
export const revalidate = 21600;

const baseUrl = getBaseUrl();

const findSpecialty = (slug: string) =>
  SITE.specialties.find(s => (s.slug || 'general') === slug) ?? null;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { seg, specialty } = await params;
  const lang = langFromSegment(seg);
  const def = findSpecialty(specialty);
  if (!lang || !def) return { title: 'Not Found', robots: { index: false } };
  const label = specialtyLabel(lang, specialty, def.label || def.name || SITE.categoryKo);
  return {
    title: label,
    description: def.blurb ? `${def.blurb}. ${SITE.siteDescription}` : SITE.siteDescription,
    alternates: {
      canonical: `${baseUrl}${localePath(lang, `s/${specialty}`)}`,
      languages: { ko: `${baseUrl}/s/${specialty}` },
    },
    openGraph: { locale: LANG_META[lang].ogLocale, siteName: SITE.siteName },
  };
}

export default async function Page({ params }: PageProps) {
  const { seg, specialty } = await params;
  const lang = langFromSegment(seg);
  const def = findSpecialty(specialty);
  if (!lang || !def) notFound();

  const ui = UI[lang];
  const label = specialtyLabel(lang, specialty, def.label || def.name || SITE.categoryKo);
  let articles: Awaited<ReturnType<typeof getArticles>> = [];
  try { articles = await getArticles(specialty, undefined, lang); } catch { /* */ }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12" lang={LANG_META[lang].htmlLang}>
      <nav className="text-sm text-ink-soft mb-6 flex items-center gap-2">
        <Link href={localePath(lang)} className="hover:text-brand-600">{ui.home}</Link>
        <span>›</span>
        <span className="text-ink-muted">{label}</span>
      </nav>

      <h1 className="text-3xl font-bold text-ink tracking-tight">{label}</h1>
      <p className="mt-2 text-sm text-ink-soft">{ui.articleCount(articles.length)}</p>
      {def.blurb ? <p className="mt-4 text-ink-muted leading-relaxed max-w-2xl">{def.blurb}</p> : null}

      {articles.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">—</p>
      ) : (
        <ul className="mt-10 space-y-3">
          {articles.map(a => (
            <li key={a.id} className="border-b border-line pb-3 last:border-0">
              <Link href={localePath(lang, a.slug)} className="text-ink hover:text-brand-600 font-medium">
                {a.title}
              </Link>
              <p className="text-sm text-ink-soft mt-1 line-clamp-2">{a.metaDescription}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-12 text-xs text-ink-soft leading-relaxed">{ui.disclaimer}</p>
    </div>
  );
}
