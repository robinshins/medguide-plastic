import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { langFromSegment } from '@/lib/i18n';
import { ArticleView, articleMetadata } from '@/app/components/ArticleView';

/** /en/busan-cataract — 번역본 상세. seg가 언어가 아니면 404. */
interface PageProps {
  params: Promise<{ seg: string; slug: string }>;
}

export const dynamicParams = true;
export const revalidate = 21600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { seg, slug } = await params;
  const lang = langFromSegment(seg);
  if (!lang) return { title: 'Not Found', robots: { index: false } };
  return articleMetadata(slug, lang);
}

export default async function Page({ params }: PageProps) {
  const { seg, slug } = await params;
  const lang = langFromSegment(seg);
  if (!lang) notFound();
  return <ArticleView slug={slug} lang={lang} />;
}
