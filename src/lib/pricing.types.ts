// Shared pricing-page types. The DATA lives in src/lib/pricing-data.ts, a per-site
// file installed by sync.sh.

export interface PriceRow {
  item: string;
  /** '급여' | '비급여' | '혼합' — 급여 renders green, 혼합 amber, else neutral. */
  insurance: string;
  range: string;
  note?: string;
}

export interface PriceSection {
  title: string;
  intro?: string;
  rows: PriceRow[];
}

export interface PricingData {
  updated: string;              // '2026년 7월 기준'
  intro: string;
  sections: PriceSection[];
  factors: string[];            // 가격이 달라지는 요인
  sources: string[];            // 근거·출처
}
