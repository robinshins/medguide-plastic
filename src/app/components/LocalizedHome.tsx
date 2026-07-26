import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site.config';
import { getBaseUrl } from '@/lib/site-url';
import { getLatestArticles, getSpecialtyCounts } from '@/lib/articles';
import { UI, LANG_META, LANGS, localePath, specialtyLabel, type Lang } from '@/lib/i18n';

/**
 * 번역 언어의 홈. 한국어 홈(`src/app/page.tsx`)과 별개다 — 한국어 홈은 진료과목별
 * 아트와 히어로가 사이트마다 완전히 다르게 설계돼 있어 그대로 번역할 수 없다.
 * 이 페이지는 번역본 글로 들어온 방문자가 같은 언어로 다른 글을 찾아갈 수 있게
 * 하는 것이 목적이라, 목록과 진료항목 링크만 담은 단순한 구조로 둔다.
 */

const baseUrl = getBaseUrl();

export function localizedHomeMetadata(lang: Lang): Metadata {
  const meta = LANG_META[lang];
  const languages: Record<string, string> = { ko: baseUrl, 'x-default': baseUrl };
  for (const l of LANGS) languages[LANG_META[l].htmlLang] = `${baseUrl}${localePath(l)}`;

  return {
    // 루트 레이아웃의 template(`%s | 사이트명`)이 붙으므로 사이트명을 중복해 넣지 않는다.
    title: UI[lang].latestArticles,
    description: SITE.siteDescription,
    alternates: { canonical: `${baseUrl}${localePath(lang)}`, languages },
    openGraph: {
      title: SITE.siteName,
      description: SITE.siteDescription,
      locale: meta.ogLocale,
      siteName: SITE.siteName,
      url: `${baseUrl}${localePath(lang)}`,
      images: [{ url: '/og/og.png', width: 1200, height: 630, alt: SITE.siteName }],
    },
  };
}

export default async function LocalizedHome({ lang }: { lang: Lang }) {
  const ui = UI[lang];
  let articles: Awaited<ReturnType<typeof getLatestArticles>> = [];
  let counts: Record<string, number> = {};
  try {
    [articles, counts] = await Promise.all([getLatestArticles(24, lang), getSpecialtyCounts(lang)]);
  } catch { /* build-time without creds */ }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12" lang={LANG_META[lang].htmlLang}>
      <h1 className="text-3xl font-bold text-ink tracking-tight">{SITE.siteName}</h1>
      <p className="mt-3 text-ink-muted leading-relaxed max-w-2xl">{SITE.siteDescription}</p>

      <div className="flex flex-wrap items-center gap-2 mt-6 text-sm">
        <span className="text-ink-soft">{ui.languageLabel}:</span>
        <Link href="/" hrefLang="ko" className="px-2 py-0.5 rounded bg-surface-sunk text-ink-muted hover:text-brand-600">
          {LANG_META.ko.nativeName}
        </Link>
        {LANGS.map(l => (
          l === lang ? (
            <span key={l} className="px-2 py-0.5 rounded bg-brand-600 text-white">{LANG_META[l].nativeName}</span>
          ) : (
            <Link key={l} href={localePath(l)} hrefLang={LANG_META[l].htmlLang}
                  className="px-2 py-0.5 rounded bg-surface-sunk text-ink-muted hover:text-brand-600">
              {LANG_META[l].nativeName}
            </Link>
          )
        ))}
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap gap-2">
          {SITE.specialties.map(s => {
            const slug = s.slug || 'general';
            const n = counts[slug] ?? 0;
            if (!n) return null;
            return (
              <Link key={slug} href={localePath(lang, `s/${slug}`)}
                    className="rounded border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-brand-600 hover:border-brand-400">
                {specialtyLabel(lang, slug, s.label || s.name || SITE.categoryKo)}
                <span className="ml-1.5 text-xs text-ink-soft">{n}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-ink mb-4">{ui.latestArticles}</h2>
        {articles.length === 0 ? (
          <p className="text-sm text-ink-soft">—</p>
        ) : (
          <ul className="space-y-3">
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
      </section>

      <p className="mt-12 text-xs text-ink-soft leading-relaxed">{ui.disclaimer}</p>
    </div>
  );
}
