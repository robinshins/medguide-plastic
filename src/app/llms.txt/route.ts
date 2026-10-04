import { getBaseUrl, getContactEmail } from '@/lib/site-url';
import { SITE } from '@/lib/site.config';
import { getAllBlogPosts } from '@/lib/blog';
import { LANGS, LANG_META, localePath } from '@/lib/i18n';

// /llms.txt — AI 검색·답변 엔진에게 주는 사이트 안내서(마크다운).
//
// 전부 site.config와 블로그 목록에서 만든다. Firestore를 읽지 않으므로 빌드 때 한 번
// 생성되는 정적 응답이다. 순위 보증은 쓰지 않는다. 작성 주체는 밝히지 않고,
// 공개 출처를 모아 정리한 뒤 해당 분야 전문의(한의원은 한의사)가 감수한다는 사실만 적는다.
export const dynamic = 'force-static';

export function GET() {
  const baseUrl = getBaseUrl();

  const specialtyLines = SITE.specialties.map(s => {
    const label = s.label || s.name || `${SITE.categoryKo} 전체`;
    const blurb = s.blurb ? `: ${s.blurb}` : '';
    return `- [${label}](${baseUrl}/s/${s.slug || 'general'})${blurb}`;
  });

  const blogLines = getAllBlogPosts().map(
    p => `- [${p.title}](${baseUrl}/blog/${p.slug}): ${p.description}`
  );

  const langLines = LANGS.map(l => `- [${LANG_META[l].nativeName}](${baseUrl}${localePath(l)})`);
  const reviewer =
    SITE.categoryKo === '한의원' ? '한의사' :
    SITE.categoryKo === '병원' ? '해당 분야 전문의' :
    `${SITE.categoryKo} 전문의`;

  const text = `# ${SITE.siteName}

> ${SITE.siteDescription}

${SITE.siteName}는 네이버 플레이스, 카카오맵, 구글맵, 건강보험심사평가원에 공개된 정보를 모아 지역별 ${SITE.categoryKo}를 비교하는 한국어 사이트입니다. 글은 ${reviewer} 감수를 거쳐 게시합니다. 글 하나는 "지역 + 진료항목" 하나를 다루며, 해당 지역 ${SITE.categoryKo} 여러 곳의 리뷰 수·평점·진료시간·위치를 표로 비교합니다.

## 진료항목별 목록

${specialtyLines.join('\n')}

## 참고 자료

- [비용 안내](${baseUrl}/pricing): ${SITE.categoryKo} 주요 진료의 시세 범위
- [블로그](${baseUrl}/blog): ${SITE.categoryKo} 진료 기초상식
${blogLines.join('\n')}

## 데이터 출처와 한계

- 리뷰 수·평점: 네이버 플레이스, 카카오맵, 구글맵에 공개된 수치를 글 발행 시점에 수집한 값입니다. 각 글의 발행일이 수집 기준일이며, 이후 변동은 반영되지 않을 수 있습니다.
- 의료기관 등록 정보: 건강보험심사평가원 공개 정보를 참고합니다.
- 글은 위 출처의 공개 정보를 조합해 정리하고, ${reviewer}가 감수합니다. 평점과 리뷰 수는 진료 결과를 보장하지 않으며, 진단·치료 판단은 의료진 상담이 필요합니다.
- 인용 시 출처 표기: ${SITE.siteName} (${baseUrl})

## 다른 언어

${langLines.join('\n')}

## 기계 가독 진입점

- [사이트맵](${baseUrl}/sitemap.xml)
- [RSS 피드](${baseUrl}/feed.xml)

## 운영 정보

- [소개](${baseUrl}/about)
- [문의](${baseUrl}/contact): ${getContactEmail()}
`;

  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
