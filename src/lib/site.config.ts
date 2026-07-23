import type { SiteConfig } from './site.types';

// 성형외과 — "Contour". Editorial luxury: near-black + ivory + champagne bronze,
// radius 0, no shadow, type does all the work.
//
// The specialty list deliberately excludes every slug owned by the dermatology site
// (botox, filler, lifting, laser, acne, ulthera, thermage, contouring, hair-removal,
// wrinkle, scar, pore). 안면윤곽 uses `facial-bone`, NOT `contouring`.
export const SITE: SiteConfig = {
  key: 'plastic',

  categoryKo: '성형외과',
  siteName: '컨투어 리포트',
  siteTagline: '성형외과를 리뷰 데이터로 읽다',
  siteDescription:
    '전국 성형외과를 네이버·카카오·구글 리뷰와 건강보험심사평가원 전문의 정보로 교차 분석했습니다. 쌍꺼풀, 눈매교정, 코성형, 안면윤곽, 지방흡입까지 지역별로 정리했습니다.',
  trustBadge: '리뷰 3개 플랫폼 교차검증',
  domain: 'contourreport.co.kr',
  contactEmail: 'nosun3946@gmail.com',

  specialties: [
    { name: '', slug: '', label: '성형외과 전체', blurb: '지역 성형외과를 리뷰·전문의 기준으로 한눈에' },
    { name: '쌍꺼풀', slug: 'double-eyelid', blurb: '매몰·부분절개·절개법의 선택 기준' },
    { name: '눈매교정', slug: 'ptosis-correction', blurb: '눈꺼풀 처짐(안검하수)을 함께 교정' },
    { name: '눈밑지방재배치', slug: 'under-eye-fat', blurb: '다크서클과 눈밑 그늘의 구조적 개선' },
    { name: '눈재수술', slug: 'revision-eye', blurb: '유착·과교정·비대칭의 교정 수술' },
    { name: '코성형', slug: 'rhinoplasty', blurb: '보형물·자가연골을 이용한 코 형태 교정' },
    { name: '코재수술', slug: 'revision-rhinoplasty', blurb: '구축·변형·염증 이후의 재건' },
    { name: '안면윤곽', slug: 'facial-bone', blurb: '광대·사각턱·앞턱의 골격 수술' },
    { name: '양악수술', slug: 'double-jaw', blurb: '교합 이상을 동반한 상하악 골격 교정' },
    { name: '지방흡입', slug: 'liposuction', blurb: '복부·허벅지·팔의 국소 지방 제거' },
    { name: '지방이식', slug: 'fat-graft', blurb: '자가지방을 이용한 얼굴·가슴 볼륨 보강' },
    { name: '가슴성형', slug: 'breast', blurb: '보형물·지방이식을 통한 확대와 교정' },
  ],

  categoryHints: ['성형외과', '미용성형'],
  clinicNameSuffixes: ['성형외과', '성형외과의원', '병원', '의원'],

  credentialLabel: '성형외과 전문의 수',

  priceContext: {
    'double-eyelid':
      '쌍꺼풀 시세(2026년 기준): 매몰법 80~150만원, 부분절개 150~250만원, 절개법 200~350만원. 눈매교정을 함께 하면 100~200만원이 추가됩니다. 전액 비급여이며 부가세 포함 여부를 반드시 확인해야 합니다.',
    'ptosis-correction':
      '눈매교정(안검하수): 150~350만원. 선천성 안검하수로 시야 장애가 진단되면 건강보험 급여가 적용될 수 있어 진단 여부를 먼저 확인하는 것이 좋습니다.',
    rhinoplasty:
      '코성형 시세(2026년 기준): 실리콘+비중격 300~500만원, 자가늑연골 500~900만원, 기증늑연골 400~700만원. 코끝 성형만 단독으로는 200~350만원 선입니다.',
    'revision-rhinoplasty':
      '코재수술: 500~1,200만원으로 1차 수술보다 크게 올라갑니다. 구축 정도와 사용 가능한 연골에 따라 편차가 크고, 재건 난이도상 집도의 경험이 결정적입니다.',
    'facial-bone':
      '안면윤곽: 광대축소 400~700만원, 사각턱 400~700만원, 앞턱(T절골) 400~600만원, 3종 세트 900~1,500만원. 전신마취 수술이라 마취과 전문의 상주 여부와 응급 이송 체계를 확인해야 합니다.',
    liposuction:
      '지방흡입: 복부 250~500만원, 허벅지 300~600만원, 팔 200~350만원. 흡입량과 마취 방식(수면/전신)에 따라 달라지며, 압박복·관리 비용이 포함인지 확인이 필요합니다.',
  },
};
