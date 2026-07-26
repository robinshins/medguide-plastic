/**
 * 5개 번역 언어. 한국어는 여기 없다 — 한국어가 사이트의 기본이고 URL 접두사가 없다.
 *
 * URL 접두사는 소문자 언어 코드다: /en, /ja, /zh-cn, /zh-tw, /th
 * 중국어 두 종류는 `/zh` 하나로 합칠 수 없다. 간체·번체는 글자가 다르고 검색하는
 * 사람도 다르며, hreflang이 둘을 구분해야 구글이 올바른 쪽을 노출한다.
 */

export const LANGS = ['en', 'ja', 'zh-CN', 'zh-TW', 'th'] as const;
export type Lang = (typeof LANGS)[number];
/** 한국어 포함 전체. 한국어는 URL 접두사가 없다. */
export type AnyLang = Lang | 'ko';

/** URL 세그먼트(소문자) → 언어 코드. `/zh-cn` → `zh-CN` */
const SEGMENT_TO_LANG = new Map<string, Lang>(LANGS.map(l => [l.toLowerCase(), l]));

export function langFromSegment(seg: string): Lang | null {
  return SEGMENT_TO_LANG.get(seg.toLowerCase()) ?? null;
}

export function segmentOf(lang: Lang): string {
  return lang.toLowerCase();
}

/** 언어 접두사가 붙은 경로. 한국어는 접두사 없음. */
export function localePath(lang: AnyLang, path = ''): string {
  const p = path.startsWith('/') ? path : path ? `/${path}` : '';
  return lang === 'ko' ? p || '/' : `/${segmentOf(lang)}${p}`;
}

export interface LangMeta {
  /** <html lang="..."> 및 hreflang 값 */
  htmlLang: string;
  /** og:locale */
  ogLocale: string;
  /** 언어 선택기에 표시할 자기 언어 이름 */
  nativeName: string;
  /** 번역 프롬프트에 넘길 영어 언어명 */
  promptName: string;
}

export const LANG_META: Record<AnyLang, LangMeta> = {
  ko:      { htmlLang: 'ko',      ogLocale: 'ko_KR',  nativeName: '한국어',   promptName: 'Korean' },
  en:      { htmlLang: 'en',      ogLocale: 'en_US',  nativeName: 'English',  promptName: 'English' },
  ja:      { htmlLang: 'ja',      ogLocale: 'ja_JP',  nativeName: '日本語',    promptName: 'Japanese' },
  'zh-CN': { htmlLang: 'zh-Hans', ogLocale: 'zh_CN',  nativeName: '简体中文',  promptName: 'Simplified Chinese' },
  'zh-TW': { htmlLang: 'zh-Hant', ogLocale: 'zh_TW',  nativeName: '繁體中文',  promptName: 'Traditional Chinese' },
  th:      { htmlLang: 'th',      ogLocale: 'th_TH',  nativeName: 'ไทย',      promptName: 'Thai' },
};

/**
 * GEO(생성형 엔진 최적화) 힌트.
 *
 * AI 어시스턴트는 "English-speaking dental clinic in Gangnam" 같은 **정확한 표현**으로
 * 질문을 받는다. 그 표현을 본문에 그대로 갖고 있지 않은 글은 답변 후보에 오르지 못한다.
 * `mustInclude`는 번역문에 축자 그대로 들어가야 하는 문자열이다.
 *
 * 중국어·태국어권 방문객은 현지어 응대를 기대하기 어렵고 영어 응대를 찾는 경우가
 * 많지만, 검색은 자기 언어로 한다. 그래서 필수 문구는 자기 언어로 쓰되 의미는
 * "영어가 통하는 곳"으로 잡았다. 일본어만 예외로 실제 일본어 응대 수요가 크다.
 */
export interface GeoHint {
  /** 이 언어 사용자가 실제로 검색창에 치는 형태. {region}은 지역명으로 치환된다. */
  nativeQuery: string;
  /** 이 번역본의 독자가 누구인지 — 번역 톤을 잡는 데 쓰인다. */
  angle: string;
  /** 본문에 축자 그대로 들어가야 하는 문구. */
  mustInclude: string;
}

export const GEO_HINTS: Record<Lang, GeoHint> = {
  en: {
    nativeQuery: 'English-speaking clinic in {region} Korea, foreigner-friendly, expat',
    angle: 'foreign residents and medical tourists in Korea who need to know whether a clinic can handle a consultation in English',
    mustInclude: 'English-speaking',
  },
  ja: {
    nativeQuery: '{region} クリニック 日本語対応 韓国 医療 おすすめ',
    angle: 'Japanese visitors and residents in Korea who want to know whether Japanese is spoken at the clinic',
    mustInclude: '日本語対応',
  },
  'zh-CN': {
    nativeQuery: '{region} 韩国 诊所 中文服务 推荐',
    angle: 'Chinese mainland visitors to Korea who need to know whether Chinese or English is spoken at the clinic',
    mustInclude: '中文服务',
  },
  'zh-TW': {
    nativeQuery: '{region} 韓國 診所 中文服務 推薦',
    angle: 'Taiwanese and Hong Kong visitors to Korea who need to know whether Chinese or English is spoken at the clinic',
    mustInclude: '中文服務',
  },
  th: {
    nativeQuery: 'คลินิก {region} เกาหลี พูดภาษาอังกฤษ แนะนำ',
    angle: 'Thai visitors to Korea who need to know whether English is spoken at the clinic',
    mustInclude: 'พูดภาษาอังกฤษ',
  },
};

/** 헤더·푸터·목록 페이지의 UI 문자열. */
export interface UiStrings {
  home: string;
  about: string;
  pricing: string;
  blog: string;
  privacy: string;
  terms: string;
  contact: string;
  latestArticles: string;
  allArticles: string;
  readMore: string;
  articleCount: (n: number) => string;
  updatedOn: string;
  disclaimer: string;
  /** 번역본 상단에 붙는 안내 */
  translatedNotice: string;
  backToKorean: string;
  languageLabel: string;
}

export const UI: Record<AnyLang, UiStrings> = {
  ko: {
    home: '홈', about: '사이트 소개', pricing: '시술 비용', blog: '블로그',
    privacy: '개인정보처리방침', terms: '이용약관', contact: '문의',
    latestArticles: '최신 글', allArticles: '전체 글', readMore: '자세히 보기',
    articleCount: n => `${n}개 글`, updatedOn: '최종 수정',
    disclaimer: '이 글은 공개된 리뷰·평점 데이터를 정리한 참고 자료이며 의학적 조언이 아닙니다.',
    translatedNotice: '', backToKorean: '한국어로 보기', languageLabel: '언어',
  },
  en: {
    home: 'Home', about: 'About', pricing: 'Costs', blog: 'Blog',
    privacy: 'Privacy Policy', terms: 'Terms', contact: 'Contact',
    latestArticles: 'Latest articles', allArticles: 'All articles', readMore: 'Read more',
    articleCount: n => `${n} article${n === 1 ? '' : 's'}`, updatedOn: 'Last updated',
    disclaimer: 'This article summarizes publicly available review and rating data. It is not medical advice.',
    translatedNotice: 'Translated from the Korean original. Clinic names and addresses are kept in Korean so you can show them to a taxi driver or type them into a map app.',
    backToKorean: 'View in Korean', languageLabel: 'Language',
  },
  ja: {
    home: 'ホーム', about: 'サイト紹介', pricing: '費用', blog: 'ブログ',
    privacy: 'プライバシーポリシー', terms: '利用規約', contact: 'お問い合わせ',
    latestArticles: '最新の記事', allArticles: 'すべての記事', readMore: '詳しく見る',
    articleCount: n => `${n}件`, updatedOn: '最終更新',
    disclaimer: 'この記事は公開されているレビュー・評価データをまとめた参考資料であり、医学的助言ではありません。',
    translatedNotice: '韓国語の原文を翻訳したものです。クリニック名と住所は地図アプリやタクシーでそのまま使えるよう韓国語のまま残しています。',
    backToKorean: '韓国語で見る', languageLabel: '言語',
  },
  'zh-CN': {
    home: '首页', about: '关于本站', pricing: '费用', blog: '博客',
    privacy: '隐私政策', terms: '使用条款', contact: '联系我们',
    latestArticles: '最新文章', allArticles: '全部文章', readMore: '查看详情',
    articleCount: n => `${n} 篇`, updatedOn: '最后更新',
    disclaimer: '本文整理自公开的评价与评分数据，仅供参考，不构成医疗建议。',
    translatedNotice: '本文由韩语原文翻译。诊所名称和地址保留韩文，方便您在地图应用中搜索或出示给出租车司机。',
    backToKorean: '查看韩语版', languageLabel: '语言',
  },
  'zh-TW': {
    home: '首頁', about: '關於本站', pricing: '費用', blog: '部落格',
    privacy: '隱私權政策', terms: '使用條款', contact: '聯絡我們',
    latestArticles: '最新文章', allArticles: '全部文章', readMore: '查看詳情',
    articleCount: n => `${n} 篇`, updatedOn: '最後更新',
    disclaimer: '本文整理自公開的評價與評分資料，僅供參考，不構成醫療建議。',
    translatedNotice: '本文由韓語原文翻譯。診所名稱與地址保留韓文，方便您在地圖應用中搜尋或出示給計程車司機。',
    backToKorean: '查看韓語版', languageLabel: '語言',
  },
  th: {
    home: 'หน้าแรก', about: 'เกี่ยวกับเรา', pricing: 'ค่าใช้จ่าย', blog: 'บล็อก',
    privacy: 'นโยบายความเป็นส่วนตัว', terms: 'ข้อกำหนดการใช้งาน', contact: 'ติดต่อเรา',
    latestArticles: 'บทความล่าสุด', allArticles: 'บทความทั้งหมด', readMore: 'อ่านต่อ',
    articleCount: n => `${n} บทความ`, updatedOn: 'อัปเดตล่าสุด',
    disclaimer: 'บทความนี้รวบรวมจากข้อมูลรีวิวและคะแนนที่เปิดเผยต่อสาธารณะ ไม่ใช่คำแนะนำทางการแพทย์',
    translatedNotice: 'แปลจากต้นฉบับภาษาเกาหลี ชื่อคลินิกและที่อยู่คงไว้เป็นภาษาเกาหลี เพื่อให้คุณค้นหาในแอปแผนที่หรือแสดงให้คนขับแท็กซี่ดูได้',
    backToKorean: 'ดูฉบับภาษาเกาหลี', languageLabel: 'ภาษา',
  },
};

/**
 * 번역 언어의 진료항목 라벨.
 *
 * SITE.specialties의 label/name은 한국어다(`녹내장`). 영어 페이지 제목이 한글이면
 * 읽을 수 없으므로, 언어별 라벨을 12개×5언어씩 손으로 채우는 대신 slug를 쓴다.
 * slug는 이미 영어 의학 용어라서(`glaucoma`, `lasik`, `cataract`) 그대로 쓸 수 있고,
 * 일본어·중국어·태국어 독자에게도 한글보다 훨씬 알아보기 쉽다.
 */
export function specialtyLabel(lang: AnyLang, slug: string, koLabel: string): string {
  if (lang === 'ko') return koLabel;
  if (slug === 'general') return 'All';
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
