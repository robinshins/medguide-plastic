import { SITE } from './site.config';
import { getSiteHost, getContactEmail } from './site-url';

// Korean-only legal/informational documents, interpolated from SITE so the same file
// serves all five sites. Required for AdSense review (about/privacy/terms/contact).

export type LegalKey = 'about' | 'privacy' | 'terms' | 'contact';

export interface LegalDoc {
  title: string;
  description: string;
  html: string;
}

const UPDATED = '2026년 7월 23일';

const contactLine = () => {
  const e = getContactEmail();
  return `<a href="mailto:${e}">${e}</a>`;
};

export function getLegalDoc(key: LegalKey): LegalDoc {
  switch (key) {
    case 'about':
      return {
        title: '사이트 소개',
        description: `${SITE.siteName}가 ${SITE.categoryKo} 정보를 수집·분석하는 방법을 소개합니다.`,
        html: `
<h2>${SITE.siteName}는 이런 사이트입니다</h2>
<p>${SITE.siteName}는 ${SITE.categoryKo} 선택에 필요한 정보를 데이터로 정리하는 사이트입니다. 특정 병원의 광고비를 받고 순위를 매기지 않습니다. 대신 누구나 볼 수 있는 공개 데이터 — 네이버 플레이스 방문자 리뷰, 카카오맵 평점, 구글맵 평점, 건강보험심사평가원 등록 정보 — 를 수집해 지역별로 비교합니다.</p>
<h2>정보를 만드는 과정</h2>
<ul>
<li><strong>수집</strong> — 네이버 플레이스, 카카오맵, 구글맵에서 해당 지역 ${SITE.categoryKo}의 리뷰 수, 평점, 진료시간, 위치 정보를 수집합니다.</li>
<li><strong>교차 검증</strong> — 같은 병원을 세 플랫폼에서 찾아 평점과 리뷰 수를 나란히 놓습니다. 한 플랫폼의 평점만으로는 알 수 없는 것이 보입니다.</li>
<li><strong>공식 정보 확인</strong> — 건강보험심사평가원에 등록된 ${SITE.credentialLabel}, 진료과목, 보유 장비를 확인합니다.</li>
<li><strong>정리</strong> — 수집한 데이터만으로 글을 작성합니다. 데이터에 없는 의료진 경력이나 수상 이력은 쓰지 않습니다.</li>
</ul>
<h2>이 사이트가 하지 않는 것</h2>
<ul>
<li>특정 병원으로부터 광고비를 받고 순위를 조정하지 않습니다.</li>
<li>의학적 진단이나 치료 권고를 하지 않습니다. 모든 의료 결정은 반드시 의료 전문가와 상담하세요.</li>
<li>리뷰를 창작하지 않습니다. 인용된 리뷰는 모두 실제 플랫폼에 게시된 리뷰입니다.</li>
</ul>
<h2>데이터의 한계</h2>
<p>리뷰와 평점은 수집 시점의 스냅샷입니다. 이후 변동될 수 있고, 플랫폼 정책에 따라 일부 리뷰가 반영되지 않을 수 있습니다. 각 글에 수집 시점을 명시합니다.</p>
<p>최종 수정: ${UPDATED}</p>`,
      };

    case 'privacy':
      return {
        title: '개인정보처리방침',
        description: `${SITE.siteName} 개인정보처리방침입니다.`,
        html: `
<h2>1. 수집하는 정보</h2>
<p>${SITE.siteName}(${getSiteHost()})는 회원가입 없이 이용하는 사이트로, 다음 정보만을 처리합니다.</p>
<ul>
<li><strong>댓글</strong> — 이용자가 직접 입력한 닉네임과 댓글 내용. 이메일·연락처는 수집하지 않습니다.</li>
<li><strong>접속 기록</strong> — 서비스 운영과 트래픽 분석을 위한 쿠키 및 유사 기술(Google Analytics). IP는 통계 목적으로만 처리됩니다.</li>
<li><strong>광고</strong> — Google AdSense가 관심 기반 광고 제공을 위해 쿠키를 사용할 수 있습니다. 광고 쿠키는 <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Google 광고 설정</a>에서 관리할 수 있습니다.</li>
</ul>
<h2>2. 이용 목적</h2>
<ul>
<li>댓글 표시 및 스팸 방지</li>
<li>서비스 이용 통계 분석 및 개선</li>
</ul>
<h2>3. 보관과 파기</h2>
<p>댓글은 이용자가 삭제를 요청하거나 사이트 운영이 종료될 때까지 보관됩니다. 삭제 요청은 ${contactLine()}로 보내주시면 확인 후 지체 없이 처리합니다.</p>
<h2>4. 제3자 제공</h2>
<p>법령에 근거한 요청을 제외하고 수집한 정보를 제3자에게 제공하지 않습니다. 데이터 보관은 Google Firebase(미국 소재)를 이용합니다.</p>
<h2>5. 문의</h2>
<p>개인정보 관련 문의: ${contactLine()}</p>
<p>최종 수정: ${UPDATED}</p>`,
      };

    case 'terms':
      return {
        title: '이용약관',
        description: `${SITE.siteName} 이용약관입니다.`,
        html: `
<h2>1. 서비스의 성격</h2>
<p>${SITE.siteName}는 공개된 데이터를 수집·정리해 제공하는 정보 서비스입니다. 본 사이트의 어떤 내용도 의학적 진단, 치료 권고, 특정 의료기관의 보증으로 해석되어서는 안 됩니다.</p>
<h2>2. 의료 정보 면책</h2>
<ul>
<li>본 사이트의 정보는 참고용이며, 실제 진료·시술 결정은 반드시 해당 분야 의료 전문가와의 상담을 거쳐야 합니다.</li>
<li>수집된 리뷰·평점은 각 플랫폼 이용자의 주관적 의견으로, 의료 서비스의 품질을 객관적으로 보증하지 않습니다.</li>
<li>가격 정보는 시장 일반 시세의 참고치이며 개별 병원·개인 상태에 따라 달라집니다.</li>
</ul>
<h2>3. 콘텐츠의 이용</h2>
<p>본 사이트의 글을 출처 표기 없이 복제·재배포할 수 없습니다. 인용 시 출처(${getSiteHost()})를 명시해 주세요.</p>
<h2>4. 책임의 한계</h2>
<p>본 사이트는 제공된 정보의 정확성을 위해 노력하지만, 정보 이용으로 발생한 결과에 대해 법적 책임을 지지 않습니다. 외부 플랫폼(네이버·카카오·구글)의 데이터 변동, 의료기관의 폐업·이전 등은 실시간으로 반영되지 않을 수 있습니다.</p>
<h2>5. 게시물 관리</h2>
<p>비방, 허위사실, 광고성 댓글은 사전 통보 없이 삭제될 수 있습니다.</p>
<p>최종 수정: ${UPDATED}</p>`,
      };

    case 'contact':
      return {
        title: '문의',
        description: `${SITE.siteName}에 문의하는 방법입니다.`,
        html: `
<h2>문의 안내</h2>
<p>사이트 이용, 데이터 정정, 제안/협업 관련 문의는 아래 이메일로 보내주세요.</p>
<p><strong>제안/협업</strong> — ${contactLine()}</p>
<h2>정정 요청</h2>
<p>병원 정보(진료시간·전화번호·위치 등)가 실제와 다르거나, 폐업·이전한 병원이 남아 있다면 알려주세요. 확인 후 반영합니다.</p>
<h2>의료기관 관계자분께</h2>
<p>본 사이트의 병원 정보는 공개 플랫폼에서 수집한 것입니다. 소속 기관의 정보 수정·삭제를 원하시면 기관명과 확인 가능한 연락처를 포함해 이메일 주시기 바랍니다.</p>
<p>최종 수정: ${UPDATED}</p>`,
      };
  }
}
