import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site.config';
import { PRICING } from '@/lib/pricing-data';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${SITE.domain}`;

export const metadata: Metadata = {
  title: `${SITE.categoryKo} 비용 가이드 — 시술별 가격과 보험 적용`,
  description: `${SITE.categoryKo} 주요 시술의 가격 범위와 건강보험·실손보험 적용 기준을 정리했습니다. ${PRICING.updated}.`,
  alternates: { canonical: `${baseUrl}/pricing` },
};

function insuranceBadge(v: string) {
  if (v.includes('급여') && !v.includes('비급여') && !v.includes('혼합')) {
    return 'bg-green-50 text-green-700';
  }
  if (v.includes('혼합')) return 'bg-amber-50 text-amber-700';
  return 'bg-surface-sunk text-ink-soft';
}

export default function PricingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <nav className="text-sm text-ink-soft mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-brand-600">홈</Link>
        <span>›</span>
        <span className="text-ink-muted">{SITE.categoryKo} 비용</span>
      </nav>

      <h1 className="text-3xl font-bold text-ink tracking-tight">
        {SITE.categoryKo} 비용 가이드
      </h1>
      <p className="text-sm text-ink-soft mt-2">{PRICING.updated}</p>
      <p className="text-ink-muted mt-5 max-w-2xl leading-relaxed">{PRICING.intro}</p>

      {PRICING.sections.map((section, i) => (
        <section key={i} className="mt-12">
          <h2 className="text-xl font-bold text-ink mb-1.5">
            {i + 1}. {section.title}
          </h2>
          {section.intro ? <p className="text-sm text-ink-muted mb-4">{section.intro}</p> : null}
          <div className="overflow-x-auto rounded-lg shadow-card bg-surface-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-brand-200">
                  <th className="text-left px-4 py-3 text-brand-600 text-xs font-bold uppercase tracking-wider">항목</th>
                  <th className="text-left px-4 py-3 text-brand-600 text-xs font-bold uppercase tracking-wider">보험</th>
                  <th className="text-left px-4 py-3 text-brand-600 text-xs font-bold uppercase tracking-wider">가격 범위</th>
                  <th className="text-left px-4 py-3 text-brand-600 text-xs font-bold uppercase tracking-wider hidden sm:table-cell">비고</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, j) => (
                  <tr key={j} className="border-b border-line last:border-0 hover:bg-surface-sunk">
                    <td className="px-4 py-3 font-medium text-ink">{row.item}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${insuranceBadge(row.insurance)}`}>
                        {row.insurance}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{row.range}</td>
                    <td className="px-4 py-3 text-ink-soft hidden sm:table-cell">{row.note || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-xl font-bold text-ink mb-4">가격이 달라지는 요인</h2>
        <ul className="space-y-2.5">
          {PRICING.factors.map((f, i) => (
            <li key={i} className="flex gap-2.5 text-ink-muted text-sm leading-relaxed">
              <span className="flex-none mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-lg bg-surface-sunk p-5">
        <h2 className="text-sm font-bold text-ink mb-2.5">근거·출처</h2>
        <ul className="space-y-1 text-xs text-ink-soft">
          {PRICING.sources.map((s, i) => <li key={i}>· {s}</li>)}
        </ul>
        <p className="text-xs text-ink-soft mt-4 leading-relaxed">
          가격은 시장 일반 시세의 참고치입니다. 개별 병원·개인 상태에 따라 달라지며,
          정확한 비용은 반드시 해당 의료기관 상담을 통해 확인하세요.
        </p>
      </section>
    </div>
  );
}
