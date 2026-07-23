import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site.config';
import { getAllBlogPosts, getBlogPost } from '@/lib/blog';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${SITE.domain}`;

export function generateStaticParams() {
  return getAllBlogPosts().map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Not Found' };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${baseUrl}/blog/${slug}` },
    openGraph: {
      title: `${post.title} | ${SITE.siteName}`,
      description: post.description,
      type: 'article',
      locale: 'ko_KR',
      publishedTime: post.publishedAt,
      siteName: SITE.siteName,
      url: `${baseUrl}/blog/${slug}`,
      images: [{ url: '/og/og.png', width: 1200, height: 630, alt: post.title }],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const related = getAllBlogPosts().filter(p => p.slug !== slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: SITE.siteName, url: baseUrl },
    publisher: {
      '@type': 'Organization',
      name: SITE.siteName,
      url: baseUrl,
      logo: { '@type': 'ImageObject', url: `${baseUrl}/logo-512.png` },
    },
    mainEntityOfPage: `${baseUrl}/blog/${slug}`,
    inLanguage: 'ko',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="text-sm text-ink-soft mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-brand-600">홈</Link>
        <span>›</span>
        <Link href="/blog" className="hover:text-brand-600">블로그</Link>
      </nav>
      <h1 className="text-3xl font-bold text-ink tracking-tight leading-snug">{post.title}</h1>
      <time dateTime={post.publishedAt} className="block text-sm text-ink-soft mt-3 mb-10">
        {new Date(post.publishedAt).toLocaleDateString('ko')} · {SITE.siteName}
      </time>

      <article className="article-content" dangerouslySetInnerHTML={{ __html: post.html }} />

      {related.length > 0 ? (
        <section className="mt-14 pt-8 border-t border-line">
          <h2 className="text-lg font-bold text-ink mb-4">다른 글도 읽어보세요</h2>
          <ul className="space-y-2.5">
            {related.map(p => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="text-brand-600 hover:text-brand-800 underline underline-offset-2">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
