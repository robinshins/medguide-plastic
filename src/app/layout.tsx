import type { Metadata } from 'next';
import { getBaseUrl, getContactEmail } from '@/lib/site-url';
import Link from 'next/link';
import { GoogleAnalytics } from '@next/third-parties/google';
import { SITE } from '@/lib/site.config';
import { LogoMark, Wordmark } from '@/app/components/brand/Logo';
import './globals.css';

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: `${SITE.siteName} — ${SITE.siteTagline}`, template: `%s | ${SITE.siteName}` },
  description: SITE.siteDescription,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: SITE.siteName,
    title: `${SITE.siteName} — ${SITE.siteTagline}`,
    description: SITE.siteDescription,
    images: [{ url: '/og/og.png', width: 1200, height: 630, alt: SITE.siteName }],
  },
  robots: { index: true, follow: true },
};

const NAV = SITE.specialties.slice(0, 6);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" dir="ltr">
      <body className="font-sans">
        <header className="sticky top-0 z-40 h-14 bg-surface-page/85 backdrop-blur border-b border-line">
          <div className="max-w-6xl mx-auto px-4 h-full flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <LogoMark className="w-8 h-8" />
              <Wordmark className="hidden sm:block h-4 w-auto text-ink" />
              <span className="sr-only">{SITE.siteName}</span>
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto text-sm">
              {NAV.map(s => (
                <Link
                  key={s.slug || 'general'}
                  href={`/s/${s.slug || 'general'}`}
                  className="px-3 py-1.5 rounded-full text-ink-muted hover:text-brand-700 hover:bg-brand-50 whitespace-nowrap transition-colors"
                >
                  {s.label || s.name || SITE.categoryKo}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-24 border-t border-line bg-surface-sunk">
          <div className="max-w-6xl mx-auto px-4 py-14">
            <div className="flex items-center gap-2 mb-5">
              <LogoMark className="w-7 h-7" />
              <Wordmark className="h-4 w-auto text-ink" />
            </div>
            <p className="text-sm text-ink-soft max-w-2xl leading-relaxed mb-8">
              {SITE.siteDescription}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted mb-8">
              <Link href="/about" className="hover:text-brand-600">사이트 소개</Link>
              <Link href="/pricing" className="hover:text-brand-600">시술 비용</Link>
              <Link href="/blog" className="hover:text-brand-600">블로그</Link>
              <Link href="/privacy" className="hover:text-brand-600">개인정보처리방침</Link>
              <Link href="/terms" className="hover:text-brand-600">이용약관</Link>
              <Link href="/contact" className="hover:text-brand-600">문의</Link>
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              본 사이트의 정보는 네이버 플레이스·카카오맵·구글맵의 공개 리뷰와 건강보험심사평가원 공개 정보를
              수집·정리한 것으로, 의학적 진단이나 치료를 대신하지 않습니다. 실제 진료는 반드시 의료 전문가와
              상담하시기 바랍니다.
            </p>
            <p className="text-xs text-ink-soft mt-4">
              © {new Date().getFullYear()} {SITE.siteName}
              <span className="mx-2">·</span>
              제안/협업{' '}
              <a href={`mailto:${getContactEmail()}`} className="hover:text-brand-600">
                {getContactEmail()}
              </a>
            </p>
          </div>
        </footer>

        {SITE.gaId ? <GoogleAnalytics gaId={SITE.gaId} /> : null}
      </body>
    </html>
  );
}
