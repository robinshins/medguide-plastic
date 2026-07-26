import type { Metadata } from 'next';
import { langFromSegment } from '@/lib/i18n';
import { ArticleView, articleMetadata } from '@/app/components/ArticleView';
import LocalizedHome, { localizedHomeMetadata } from '@/app/components/LocalizedHome';

/**
 * 한 세그먼트짜리 경로를 둘로 나눠 처리한다.
 *   /en              → 영어 홈
 *   /busan-cataract  → 한국어 글
 *
 * 한 파일에서 분기하는 이유: Next.js는 같은 레벨에 서로 다른 이름의 동적 세그먼트를
 * 둘 수 없다(`[lang]`과 `[slug]`를 함께 둘 수 없음). 언어 코드는 5개로 고정이고
 * seed.ts가 그 코드와 같은 slug를 예약어로 막으므로 충돌은 발생하지 않는다.
 */
interface PageProps {
  params: Promise<{ seg: string }>;
}

export const dynamicParams = true;
export const revalidate = 21600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { seg } = await params;
  const lang = langFromSegment(seg);
  return lang ? localizedHomeMetadata(lang) : articleMetadata(seg, 'ko');
}

export default async function Page({ params }: PageProps) {
  const { seg } = await params;
  const lang = langFromSegment(seg);
  return lang ? <LocalizedHome lang={lang} /> : <ArticleView slug={seg} lang="ko" />;
}
