import Link from 'next/link';
import { getBaseUrl } from '@/lib/site-url';
import type { Metadata } from 'next';
import { getLegalDoc, type LegalKey } from '@/lib/legal';

const baseUrl = getBaseUrl();

export function buildLegalMetadata(key: LegalKey): Metadata {
  const doc = getLegalDoc(key);
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: `${baseUrl}/${key}` },
    robots: { index: key === 'about', follow: true },
  };
}

export default function LegalPage({ pageKey }: { pageKey: LegalKey }) {
  const doc = getLegalDoc(pageKey);
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <nav className="text-sm text-ink-soft mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-brand-600">홈</Link>
        <span>›</span>
        <span className="text-ink-muted">{doc.title}</span>
      </nav>
      <h1 className="text-3xl font-bold text-ink tracking-tight mb-8">{doc.title}</h1>
      <article className="article-content" dangerouslySetInnerHTML={{ __html: doc.html }} />
    </div>
  );
}
