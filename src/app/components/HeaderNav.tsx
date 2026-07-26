'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/site.config';
import { langFromSegment, localePath, specialtyLabel } from '@/lib/i18n';

/**
 * 헤더 진료항목 내비게이션. 현재 경로의 언어에 맞춰 링크를 만든다.
 *
 * 클라이언트 컴포넌트인 이유: 헤더는 루트 레이아웃에 있고 루트 레이아웃은 라우트
 * 파라미터를 받을 수 없다. 그대로 두면 일본어 글에서 헤더를 눌렀을 때 한국어
 * 목록으로 떨어지고, 크롤러도 번역 목록 페이지 대신 한국어로 흘러가 번역본의
 * 내부 링크가 끊긴다. usePathname()은 파라미터 없이 현재 언어를 알 수 있는
 * 유일한 방법이다.
 */
const NAV = SITE.specialties.slice(0, 6);

export default function HeaderNav() {
  const pathname = usePathname() || '/';
  const first = pathname.split('/')[1] ?? '';
  const lang = langFromSegment(first) ?? 'ko';

  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-sm">
      {NAV.map(s => {
        const slug = s.slug || 'general';
        return (
          <Link
            key={slug}
            href={localePath(lang, `s/${slug}`)}
            className="px-3 py-1.5 rounded-full text-ink-muted hover:text-brand-700 hover:bg-brand-50 whitespace-nowrap transition-colors"
          >
            {specialtyLabel(lang, slug, s.label || s.name || SITE.categoryKo)}
          </Link>
        );
      })}
    </nav>
  );
}

/** 헤더 로고 링크. 번역 페이지에서는 해당 언어 홈으로. */
export function HomeHref({ children, className }: { children: React.ReactNode; className?: string }) {
  const pathname = usePathname() || '/';
  const lang = langFromSegment(pathname.split('/')[1] ?? '') ?? 'ko';
  return <Link href={localePath(lang)} className={className}>{children}</Link>;
}
