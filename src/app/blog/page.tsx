import Link from 'next/link';
import { getBaseUrl } from '@/lib/site-url';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site.config';
import { getAllBlogPosts } from '@/lib/blog';

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: `블로그 — ${SITE.categoryKo} 상식과 가이드`,
  description: `${SITE.categoryKo} 치료를 알아보기 전에 읽어두면 좋은 기초 상식과 선택 가이드를 정리했습니다.`,
  alternates: { canonical: `${baseUrl}/blog` },
};

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <nav className="text-sm text-ink-soft mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-brand-600">홈</Link>
        <span>›</span>
        <span className="text-ink-muted">블로그</span>
      </nav>
      <h1 className="text-3xl font-bold text-ink tracking-tight mb-2">블로그</h1>
      <p className="text-ink-muted mb-10">{SITE.categoryKo} 치료를 알아보기 전에 읽어두면 좋은 글들입니다.</p>

      <ul className="space-y-6">
        {posts.map(post => (
          <li key={post.slug} className="rounded-lg bg-surface-card shadow-card p-6">
            <time dateTime={post.publishedAt} className="text-xs text-ink-soft">
              {new Date(post.publishedAt).toLocaleDateString('ko')}
            </time>
            <h2 className="text-lg font-bold text-ink mt-1.5 leading-snug">
              <Link href={`/blog/${post.slug}`} className="hover:text-brand-700 transition-colors">
                {post.title}
              </Link>
            </h2>
            <p className="text-sm text-ink-muted mt-2 line-clamp-2">{post.description}</p>
            <Link href={`/blog/${post.slug}`} className="inline-block mt-3 text-sm font-semibold text-brand-600 hover:text-brand-800">
              계속 읽기 →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
