'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ArticleSummary } from '@/lib/types';

const PAGE_SIZE = 30;

export default function ArticleGrid({ articles }: { articles: ArticleSummary[] }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return articles;
    return articles.filter(a => a.title.includes(q) || a.region.includes(q));
  }, [articles, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="search"
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          placeholder="지역명으로 검색 (예: 강남, 수원)"
          className="w-full sm:w-72 rounded-full border border-line bg-surface-card px-4 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-brand-400"
        />
        <span className="text-sm text-ink-soft">{filtered.length.toLocaleString()}건</span>
      </div>

      {slice.length === 0 ? (
        <p className="text-sm text-ink-soft py-16 text-center">
          {query ? '검색 결과가 없습니다.' : '아직 발행된 글이 없습니다.'}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slice.map(a => (
            <Link
              key={a.slug}
              href={`/${a.slug}`}
              className="group rounded-lg bg-surface-card shadow-card p-5 hover:shadow-lift transition-shadow"
            >
              <div className="flex items-center gap-2 text-xs text-ink-soft mb-2.5">
                <span className="rounded-full bg-brand-50 text-brand-700 font-semibold px-2 py-0.5">
                  {a.region}
                </span>
                <time dateTime={a.publishedAt}>{new Date(a.publishedAt).toLocaleDateString('ko')}</time>
              </div>
              <h3 className="font-bold text-ink leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
                {a.title}
              </h3>
              <p className="text-sm text-ink-soft mt-2 line-clamp-2">{a.metaDescription}</p>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-1 mt-10">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - current) <= 2)
            .reduce<(number | '…')[]>((acc, p) => {
              const prev = acc[acc.length - 1];
              if (typeof prev === 'number' && p - prev > 1) acc.push('…');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} className="px-2 text-ink-soft">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                    p === current
                      ? 'bg-brand-600 text-white'
                      : 'text-ink-muted hover:bg-brand-50 hover:text-brand-700'
                  }`}
                >
                  {p}
                </button>
              )
            )}
        </nav>
      ) : null}
    </div>
  );
}
