import type { AnyLang } from './i18n';

/**
 * 병원 카드의 구조화 데이터 현지화.
 *
 * 본문은 LLM이 번역하지만 병원 카드는 Firestore의 구조화 필드를 그대로 렌더링하므로
 * 번역문에 포함되지 않는다. 영어 페이지에서 "진료시간 월 10:00 - 19:00 / 화 ..."가
 * 그대로 나오던 문제.
 *
 * 여기서는 LLM을 쓰지 않는다. 대상이 요일 7개, 고정 라벨 몇 개, 그리고
 * `전문의 N명` 한 가지 패턴뿐이라 결정론적 변환이 더 정확하고, 공짜이며, 즉시
 * 반영된다(이미 저장된 번역본을 다시 만들 필요가 없다).
 */

// ── 요일 ────────────────────────────────────────────────────────────────
const WEEKDAYS: Record<AnyLang, Record<string, string>> = {
  ko:      { 월: '월', 화: '화', 수: '수', 목: '목', 금: '금', 토: '토', 일: '일' },
  en:      { 월: 'Mon', 화: 'Tue', 수: 'Wed', 목: 'Thu', 금: 'Fri', 토: 'Sat', 일: 'Sun' },
  ja:      { 월: '月', 화: '火', 수: '水', 목: '木', 금: '金', 토: '土', 일: '日' },
  'zh-CN': { 월: '周一', 화: '周二', 수: '周三', 목: '周四', 금: '周五', 토: '周六', 일: '周日' },
  'zh-TW': { 월: '週一', 화: '週二', 수: '週三', 목: '週四', 금: '週五', 토: '週六', 일: '週日' },
  th:      { 월: 'จ.', 화: 'อ.', 수: 'พ.', 목: 'พฤ.', 금: 'ศ.', 토: 'ส.', 일: 'อา.' },
};

const CLOSED: Record<AnyLang, string> = {
  ko: '휴무', en: 'Closed', ja: '休診', 'zh-CN': '休息', 'zh-TW': '休息', th: 'ปิด',
};

/** `월 10:00 - 19:00 / 화 ...` 를 언어에 맞게. 시각 표기는 24시간제 그대로 둔다. */
export function localizeHours(hours: string, lang: AnyLang): string {
  if (!hours || lang === 'ko') return hours;
  const days = WEEKDAYS[lang];
  return hours
    .split('/')
    .map(part => {
      const t = part.trim();
      const m = t.match(/^([월화수목금토일])\s*(.*)$/);
      if (!m) return t;
      const rest = m[2].replace(/휴무|정기휴무|휴진/g, CLOSED[lang]);
      return `${days[m[1]]} ${rest}`.trim();
    })
    .join(' / ');
}

// ── 전문의 수 ───────────────────────────────────────────────────────────
/**
 * `안과 전문의 2명 | 진료과목: 안과 | 초음파영상진단기 1대` 에서 전문의 수만 뽑는다.
 *
 * 나머지(진료과목·장비 목록)는 번역 언어에서 버린다. 장비명은 사전으로 감당할 수
 * 없는 열린 집합이고, 그 내용은 이미 번역된 본문이 산문으로 다루고 있다. 카드는
 * 빠른 참조용이므로 숫자 하나가 남는 편이 한글 원문이 그대로 남는 것보다 낫다.
 */
export function specialistCount(info: string): number | null {
  const m = info?.match(/전문의\s*(\d+)\s*명/);
  return m ? Number(m[1]) : null;
}

export function localizeSpecialists(info: string, lang: AnyLang): string | null {
  if (!info) return null;
  if (lang === 'ko') return info;
  const n = specialistCount(info);
  if (n === null) return null;
  switch (lang) {
    case 'en': return `${n} board-certified specialist${n === 1 ? '' : 's'}`;
    case 'ja': return `専門医 ${n}名`;
    case 'zh-CN': return `专科医师 ${n} 名`;
    case 'zh-TW': return `專科醫師 ${n} 名`;
    case 'th': return `แพทย์เฉพาะทาง ${n} คน`;
  }
}

// ── 카드 라벨 ───────────────────────────────────────────────────────────
export interface CardLabels {
  hours: string;
  phone: string;
  specialists: string;
  viewOnMap: string;
  naver: string;
  kakao: string;
  google: string;
  reviews: (n: number) => string;
}

export const CARD: Record<AnyLang, CardLabels> = {
  ko: {
    hours: '진료시간', phone: '전화', specialists: '전문의', viewOnMap: '네이버 지도에서 보기 →',
    naver: '네이버', kakao: '카카오', google: '구글', reviews: n => `${n.toLocaleString()}건`,
  },
  en: {
    hours: 'Hours', phone: 'Phone', specialists: 'Specialists', viewOnMap: 'View on Naver Map →',
    naver: 'Naver', kakao: 'Kakao', google: 'Google', reviews: n => n.toLocaleString(),
  },
  ja: {
    hours: '診療時間', phone: '電話', specialists: '専門医', viewOnMap: 'Naverマップで見る →',
    naver: 'Naver', kakao: 'Kakao', google: 'Google', reviews: n => `${n.toLocaleString()}件`,
  },
  'zh-CN': {
    hours: '门诊时间', phone: '电话', specialists: '专科医师', viewOnMap: '在 Naver 地图查看 →',
    naver: 'Naver', kakao: 'Kakao', google: 'Google', reviews: n => n.toLocaleString(),
  },
  'zh-TW': {
    hours: '門診時間', phone: '電話', specialists: '專科醫師', viewOnMap: '在 Naver 地圖查看 →',
    naver: 'Naver', kakao: 'Kakao', google: 'Google', reviews: n => n.toLocaleString(),
  },
  th: {
    hours: 'เวลาทำการ', phone: 'โทร', specialists: 'แพทย์เฉพาะทาง', viewOnMap: 'ดูใน Naver Map →',
    naver: 'Naver', kakao: 'Kakao', google: 'Google', reviews: n => n.toLocaleString(),
  },
};

// ── 한글 로마자 변환 ────────────────────────────────────────────────────
/**
 * 병원명과 주소는 한글로 남긴다 — 지도 앱에 입력하거나 택시 기사에게 보여주려면
 * 그래야 한다. 다만 한글만 있으면 외국인 독자는 읽을 수도, 카드끼리 구분할 수도
 * 없으므로 라틴 표기를 함께 보여준다.
 *
 * 음절 단위로 그냥 변환하면 `올라성형외과의원 부산서면역`이
 * `Olraseonghyeongoegwauiwon busanseomyeonyeok`가 되어 오히려 고장난 것처럼 보인다.
 * 병원명과 주소에 쓰이는 어휘는 닫힌 집합이므로(진료과목명, 행정구역 단위, 층/역),
 * 그 부분은 사전으로 번역하고 고유명사만 음절 변환한다.
 *
 * 음절 변환은 자음동화를 반영하지 않는다(신라 → Sinra). 예외 규칙을 넣으려면
 * 형태소 분석이 필요하고, 발음을 짐작하고 검색어로 쓰기에는 지금으로 충분하다.
 */
const ONSET = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const NUCLEUS = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const CODA = ['','k','k','k','n','n','n','t','l','k','m','l','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];

/** 순수 음절 변환. 고유명사에만 쓴다. */
function syllables(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0xac00 && code <= 0xd7a3) {
      const i = code - 0xac00;
      out += ONSET[Math.floor(i / 588)] + NUCLEUS[Math.floor((i % 588) / 28)] + CODA[i % 28];
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * 사전. 반드시 긴 것부터 — `성형외과의원`이 `성형외과`보다 먼저 매칭돼야 한다.
 * 라틴 표기는 영어로 통일한다. 일본어·중국어·태국어 독자에게도 한글보다는
 * 라틴 표기가 지도 앱 검색과 발음에 쓸모 있고, 언어별 사전을 5벌 유지하는 비용은
 * 얻는 것에 비해 크다.
 */
const TERMS: [string, string][] = [
  // 진료과목 (긴 것 우선)
  ['성형외과의원', 'Plastic Surgery Clinic'], ['성형외과병원', 'Plastic Surgery Hospital'],
  ['정형외과의원', 'Orthopedic Clinic'], ['재활의학과의원', 'Rehabilitation Clinic'],
  ['신경외과의원', 'Neurosurgery Clinic'], ['치과교정과', 'Orthodontics'],
  ['치과의원', 'Dental Clinic'], ['치과병원', 'Dental Hospital'],
  ['안과의원', 'Eye Clinic'], ['피부과의원', 'Dermatology Clinic'],
  ['한방병원', 'Korean Medicine Hospital'], ['한의원', 'Korean Medicine Clinic'],
  ['성형외과', 'Plastic Surgery'], ['정형외과', 'Orthopedics'],
  ['재활의학과', 'Rehabilitation Medicine'], ['신경외과', 'Neurosurgery'],
  ['마취통증의학과', 'Anesthesiology & Pain'], ['통증의학과', 'Pain Medicine'],
  ['피부과', 'Dermatology'], ['안과', 'Eye'], ['치과', 'Dental'],
  ['의원', 'Clinic'], ['병원', 'Hospital'],
  // 행정구역·주소
  ['특별자치시', ''], ['특별자치도', ''], ['광역시', ''], ['특별시', ''],
  ['층', 'F'],
];

/**
 * 도로명 접미사. 뒤에 번지수(숫자)나 공백이 올 때만 매칭한다.
 *
 * 무조건 매칭하면 건물명 `로로메디칼타워`의 `로로`가 도로명으로 잡혀
 * `-ro-ro Medikaltawo`가 된다. 실제 도로명 뒤에는 항상 번지수가 온다
 * (`부평문화로 87`, `가야대로784번길`).
 */
const ROAD_SUFFIX: [string, string][] = [
  ['번길', 'beon-gil'], ['대로', '-daero'], ['로', '-ro'], ['길', '-gil'],
];

/**
 * 행정구역 접미사는 토큰 끝에서만 매칭한다.
 *
 * 무조건 매칭하면 `가야대로`의 `가`가 행정구역 `가(-ga)`로, `서면역`의 `면`이
 * `-myeon`으로 잘려 `-ga Ya-daero`, `Busanseo-myeon Stn.` 같은 결과가 나온다.
 * 실제 주소에서 이 접미사들은 항상 토큰의 마지막 글자다(`부산진구`, `역삼동`).
 * `가(-ga)`는 아예 뺐다 — 지명 안에 너무 흔하게 들어가 이득보다 손해가 크다.
 */
const UNIT_SUFFIX: [string, string][] = [
  ['시', '-si'], ['구', '-gu'], ['군', '-gun'], ['읍', '-eup'], ['면', '-myeon'],
  ['동', '-dong'], ['역', ' Stn.'],
];

/**
 * 접미사 앞에 최소 2음절이 있어야 행정구역으로 본다.
 *
 * 실제 행정구역명은 `부산진구`, `역삼동`처럼 접미사 앞이 2음절 이상이다. 반면
 * `서면`(부산의 지명)은 1음절 + 면이라 행정구역이 아니다. 이 조건이 없으면
 * `Seo-myeon`이 되고, `역`도 `역삼동`의 첫 글자를 `Stn.`으로 잘라먹는다.
 */
const MIN_STEM = 2;

/**
 * 한글 문자열을 라틴 표기로. 사전에 있는 어휘는 번역하고 나머지는 음절 변환한다.
 */
export function romanize(text: string): string {
  if (!text) return '';
  let out = '';
  let buffer = '';   // 아직 처리하지 않은 고유명사 부분

  const flush = () => {
    if (!buffer) return;
    const r = syllables(buffer);
    out += (out && !out.endsWith(' ') ? ' ' : '') + r.charAt(0).toUpperCase() + r.slice(1);
    buffer = '';
  };

  let i = 0;
  while (i < text.length) {
    // 도로명 접미사 (뒤가 숫자·공백·끝일 때만)
    const road = ROAD_SUFFIX.find(([ko]) => {
      if (!text.startsWith(ko, i)) return false;
      const next = text[i + ko.length];
      return next === undefined || /[\s0-9]/.test(next);
    });
    if (road && buffer.length >= MIN_STEM) {
      flush();
      out += road[1];
      i += road[0].length;
      continue;
    }

    // 토큰 끝의 행정구역 접미사 (뒤가 공백이거나 문자열 끝일 때만)
    const unit = UNIT_SUFFIX.find(([ko]) =>
      text.startsWith(ko, i) && (i + ko.length === text.length || /\s/.test(text[i + ko.length]))
    );
    if (unit && buffer.length >= MIN_STEM) {
      flush();
      out += unit[1];
      i += unit[0].length;
      continue;
    }

    const hit = TERMS.find(([ko]) => text.startsWith(ko, i));
    if (hit) {
      flush();
      const [ko, en] = hit;
      if (en) {
        // '-ro' 같은 접미사는 앞 단어에 붙이고, 'Clinic' 같은 낱말은 띄운다.
        const glue = en.startsWith('-') || en === 'F';
        out += glue ? en : (out && !out.endsWith(' ') ? ' ' : '') + en;
      }
      i += ko.length;
      continue;
    }
    const ch = text[i];
    if (/\s/.test(ch)) { flush(); out += ' '; i++; continue; }
    buffer += ch;
    i++;
  }
  flush();
  return out.replace(/\s{2,}/g, ' ').trim();
}

/** 한글이 하나라도 있는지. 라틴 표기 줄을 붙일지 판단한다. */
export function hasHangul(text: string): boolean {
  return /[가-힣]/.test(text || '');
}
