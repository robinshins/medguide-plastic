// 성형외과 "Contour" 홈 — 에디토리얼 럭셔리 매거진 구성. 다른 사이트와 구조 자체가 다르다:
// 7/5 비대칭 다크 히어로 + 금색 세로 괘선 + 번호 인덱스, 가로 스크롤 스냅 갤러리(3:4 세로
// 타일, 아이보리/잉크 교차), 풀블리드 인용 밴드, 2단 에디토리얼 번호 리스트, 12컬럼 매거진
// 그리드. 카드도 그림자도 라운드도 없다 — 헤어라인과 타이포그래피로만 구획한다.
import Link from 'next/link';
import { getBaseUrl } from '@/lib/site-url';
import { SITE } from '@/lib/site.config';
import { getLatestArticles } from '@/lib/articles';
import { ProfileHairline } from '@/app/components/decor/ProfileHairline';
import { SpecialtyIcon } from '@/app/components/icons';

export const revalidate = 21600;

const baseUrl = getBaseUrl();

// 히어로 우측 번호 인덱스 — 부위 대분류 4개
const INDEX = [
  { no: '01', title: '눈성형', desc: '쌍꺼풀 · 눈매교정 · 눈밑지방재배치 · 재수술', href: '/s/double-eyelid' },
  { no: '02', title: '코성형', desc: '보형물 · 자가연골 · 재수술', href: '/s/rhinoplasty' },
  { no: '03', title: '안면윤곽', desc: '광대 · 사각턱 · 양악', href: '/s/facial-bone' },
  { no: '04', title: '체형', desc: '지방흡입 · 지방이식 · 가슴성형', href: '/s/liposuction' },
];

const METHOD = [
  { title: '수집', body: '네이버 플레이스 방문자 리뷰, 카카오맵·구글맵 평점을 지역 단위로 수집합니다.' },
  { title: '교차 검증', body: '같은 병원을 세 플랫폼에서 찾아 평점과 리뷰 수를 나란히 놓고 비교합니다.' },
  { title: '공식 정보 확인', body: '건강보험심사평가원에 등록된 성형외과 전문의 수와 진료과목을 확인합니다.' },
  { title: '정리', body: '수집한 데이터만으로 씁니다. 데이터에 없는 경력이나 수상은 쓰지 않습니다.' },
];

const CHECKLIST = [
  {
    title: '상담한 의사가 집도합니까',
    body: '상담 의사와 집도의가 다른 병원이 있습니다. 집도의 이름을 문서로 확인하는 것이 시작입니다.',
  },
  {
    title: '성형외과 전문의입니까',
    body: '간판의 진료과목 표기와 전문의 자격은 다릅니다. 심평원 공개 정보로 확인할 수 있습니다.',
  },
  {
    title: '마취는 누가 관리합니까',
    body: '전신마취 수술이라면 마취통증의학과 전문의가 상주하는지, 회복실 모니터링 체계가 있는지 물어보세요.',
  },
  {
    title: '부작용과 재수술 규정은',
    body: '재수술 보증의 기간과 조건, 비용 부담 주체를 서면으로 받아 두는 것이 안전합니다.',
  },
  {
    title: '견적은 총액입니까',
    body: '미용 목적 수술에는 부가세 10%가 붙습니다. 부가세와 사후관리 비용 포함 여부를 확인하세요.',
  },
  {
    title: '회복 기간은 현실적입니까',
    body: '일상 복귀 시점은 수술마다 다릅니다. 광고 문구가 아니라 실제 후기와 상담 답변으로 판단하세요.',
  },
];

const fmtDate = (iso?: string) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

export default async function HomePage() {
  let latest: Awaited<ReturnType<typeof getLatestArticles>> = [];
  try { latest = await getLatestArticles(5); } catch { /* not seeded yet */ }
  const feature = latest[0];
  const rest = latest.slice(1, 5);

  const gallery = SITE.specialties.filter(s => s.slug);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE.siteName,
      url: baseUrl,
      description: SITE.siteDescription,
      inLanguage: 'ko',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE.siteName,
      url: baseUrl,
      logo: { '@type': 'ImageObject', url: `${baseUrl}/logo-512.png` },
    },
  ];

  return (
    <div>
      {jsonLd.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      {/* ── 7/5 비대칭 히어로: 잉크 블랙, 금색 세로 괘선, 번호 인덱스 ── */}
      <section className="relative overflow-hidden bg-surface-inverse text-ink-onDark">
        <ProfileHairline className="pointer-events-none absolute -right-10 top-1/2 hidden h-[560px] w-auto -translate-y-1/2 text-accent-500 opacity-[0.16] lg:block" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-12 gap-y-14 px-4 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="col-span-12 md:col-span-7 md:pr-12">
            <p className="text-label uppercase text-accent-400">{SITE.trustBadge}</p>
            <h1 className="mt-8 text-display-1 font-light">
              데이터로 읽는
              <br />
              성형외과
            </h1>
            <p className="mt-8 max-w-md leading-relaxed text-ink-onDark/60">
              광고 문구가 아니라 세 플랫폼의 리뷰와 심사평가원 공개 정보로 성형외과를 비교합니다.
            </p>
            <Link
              href="/s/general"
              className="mt-10 inline-flex items-center gap-3 border border-accent-500 px-7 py-3.5 text-sm tracking-wide text-accent-300 transition-colors hover:bg-accent-500 hover:text-surface-inverse"
            >
              지역별 데이터 보기 <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="col-span-12 md:col-span-5 md:border-l md:border-accent-500/40 md:pl-12">
            <p className="text-label uppercase text-ink-onDark/40">Index</p>
            <ol className="mt-3">
              {INDEX.map(item => (
                <li key={item.no} className="border-b border-ink-onDark/10 last:border-b-0">
                  <Link href={item.href} className="group flex items-baseline gap-5 py-5">
                    <span className="text-2xl font-light text-accent-400">{item.no}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-light tracking-tight transition-colors group-hover:text-accent-300">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs text-ink-onDark/45">{item.desc}</span>
                    </span>
                    <span className="text-accent-500 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── 가로 스크롤 스냅 갤러리: 3:4 세로 타일, 아이보리/잉크 교차 ── */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pt-20">
          <div className="flex items-end justify-between border-b border-accent-500/30 pb-5">
            <div>
              <p className="text-label uppercase text-accent-600">Procedures</p>
              <h2 className="mt-3 text-display-2 font-light text-ink">부위별 시술 리포트</h2>
            </div>
            <p className="hidden pb-1 text-xs text-ink-soft sm:block">옆으로 넘겨 보세요 →</p>
          </div>
        </div>
        <div className="flex snap-x snap-mandatory gap-px overflow-x-auto bg-line">
          {gallery.map((s, i) => {
            const dark = i % 2 === 1;
            return (
              <Link
                key={s.slug}
                href={`/s/${s.slug}`}
                className={`group relative flex aspect-[3/4] min-w-[240px] snap-start flex-col justify-between p-6 ${
                  dark ? 'bg-surface-inverse text-ink-onDark' : 'bg-surface-card text-ink'
                }`}
              >
                <span className={`text-5xl font-light leading-none ${dark ? 'text-accent-400' : 'text-brand-200'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>
                  <SpecialtyIcon slug={s.slug} className={`h-7 w-7 ${dark ? 'text-accent-400' : 'text-accent-600'}`} />
                  <span className="mt-4 block text-xl font-light tracking-tight">{s.name}</span>
                  <span className={`mt-2 block text-xs leading-relaxed ${dark ? 'text-ink-onDark/50' : 'text-ink-soft'}`}>
                    {s.blurb}
                  </span>
                  <span
                    className={`mt-5 block text-label uppercase opacity-0 transition-opacity group-hover:opacity-100 ${
                      dark ? 'text-accent-400' : 'text-accent-600'
                    }`}
                  >
                    Report →
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 풀블리드 인용 밴드 ── */}
      <section className="bg-surface-inverse py-24 text-center text-ink-onDark md:py-32">
        <div className="mx-auto max-w-3xl px-4">
          <span aria-hidden className="block text-5xl font-light leading-none text-accent-500">
            &ldquo;
          </span>
          <p className="mt-6 text-[1.75rem] font-light leading-snug tracking-tight md:text-[2.5rem]">
            리뷰 데이터는 광고보다
            <br className="sm:hidden" /> 정직합니다.
          </p>
          <p className="mt-9 text-label uppercase text-accent-400">Contour Report Editorial</p>
        </div>
      </section>

      {/* ── 분석 방법: 금색 헤어라인 위 4단 스트립 ── */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-label uppercase text-accent-600">Method</p>
        <h2 className="mt-3 text-display-2 font-light text-ink">이렇게 분석합니다</h2>
        <div className="mt-10 grid gap-x-10 gap-y-9 border-t border-accent-500/30 pt-9 sm:grid-cols-2 lg:grid-cols-4">
          {METHOD.map((m, i) => (
            <div key={m.title}>
              <span className="text-label uppercase text-accent-600">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-3 text-lg font-light tracking-tight text-ink">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 상담 전 알아야 할 것: 2단 에디토리얼 번호 리스트 ── */}
      <section className="border-y border-line bg-surface-sunk py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="md:flex md:items-end md:justify-between">
            <div>
              <p className="text-label uppercase text-accent-600">Before Consultation</p>
              <h2 className="mt-3 text-display-2 font-light text-ink">상담 전 알아야 할 것</h2>
            </div>
            <p className="mt-4 max-w-sm text-sm text-ink-soft md:mt-0 md:text-right">
              수술을 권하는 말보다, 확인해야 할 사실이 먼저입니다.
            </p>
          </div>
          <ol className="mt-12 grid gap-x-16 md:grid-cols-2">
            {CHECKLIST.map((c, i) => (
              <li key={c.title} className="border-t border-accent-500/30 py-6">
                <div className="flex gap-6">
                  <span className="text-2xl font-light leading-none text-accent-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-medium text-ink">{c.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{c.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 최신 리포트: 12컬럼 매거진 그리드 (8컬럼 피처 + 4컬럼 스택) ── */}
      {feature ? (
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex items-end justify-between border-b border-accent-500/30 pb-5">
            <div>
              <p className="text-label uppercase text-accent-600">Latest</p>
              <h2 className="mt-3 text-display-2 font-light text-ink">최신 리포트</h2>
            </div>
            <Link href="/s/general" className="pb-1 text-sm text-ink-muted transition-colors hover:text-accent-700">
              전체 보기 →
            </Link>
          </div>
          <div className="grid grid-cols-12">
            <Link
              href={`/${feature.slug}`}
              className="group col-span-12 border-b border-line py-8 md:col-span-8 md:border-b-0 md:border-r md:py-10 md:pr-12"
            >
              <time dateTime={feature.publishedAt} className="text-label uppercase text-accent-600">
                {fmtDate(feature.publishedAt)}
              </time>
              <h3 className="mt-4 text-2xl font-light leading-snug tracking-tight text-ink transition-colors group-hover:text-accent-700 md:text-4xl">
                {feature.title}
              </h3>
              {feature.metaDescription ? (
                <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-ink-muted">
                  {feature.metaDescription}
                </p>
              ) : null}
              <p className="mt-6 text-xs text-ink-soft">
                {feature.region} · {feature.specialty}
              </p>
            </Link>
            <div className="col-span-12 md:col-span-4 md:py-4 md:pl-12">
              {rest.map(a => (
                <Link key={a.slug} href={`/${a.slug}`} className="group block border-b border-line py-6 last:border-b-0">
                  <time dateTime={a.publishedAt} className="text-label uppercase text-accent-600">
                    {fmtDate(a.publishedAt)}
                  </time>
                  <h3 className="mt-2 font-light leading-snug text-ink transition-colors group-hover:text-accent-700">
                    {a.title}
                  </h3>
                  <p className="mt-2 text-xs text-ink-soft">
                    {a.region} · {a.specialty}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── 모바일 전용 하단 고정 CTA (홈에서만) ── */}
      <div className="h-14 md:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-accent-500/40 bg-surface-inverse md:hidden">
        <Link
          href="/s/general"
          className="flex items-center justify-between px-5 py-4 text-sm tracking-wide text-accent-300"
        >
          <span>지역별 성형외과 데이터 보기</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
