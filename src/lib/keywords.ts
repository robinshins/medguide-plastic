import type { KeywordEntry } from './types';
import { SITE } from './site.config';
import regionsData from './regions-data.json';
import { LANGS } from './i18n';

// --- Korean to romanized slug mapping ---

const SLUG_MAP: Record<string, string> = {
  // Major cities
  '서울': 'seoul', '부산': 'busan', '대구': 'daegu', '인천': 'incheon',
  '광주': 'gwangju', '대전': 'daejeon', '울산': 'ulsan', '세종': 'sejong',
  '제주': 'jeju', '경기': 'gyeonggi', '강원': 'gangwon',
  '충북': 'chungbuk', '충남': 'chungnam', '전북': 'jeonbuk',
  '전남': 'jeonnam', '경북': 'gyeongbuk', '경남': 'gyeongnam',
  // Seoul districts
  '강남구': 'gangnam', '서초구': 'seocho', '송파구': 'songpa', '강동구': 'gangdong',
  '마포구': 'mapo', '영등포구': 'yeongdeungpo', '양천구': 'yangcheon',
  '구로구': 'guro', '금천구': 'geumcheon', '관악구': 'gwanak',
  '동작구': 'dongjak', '강서구': 'gangseo', '은평구': 'eunpyeong',
  '서대문구': 'seodaemun', '종로구': 'jongno', '중구': 'jung-gu',
  '용산구': 'yongsan', '성동구': 'seongdong', '광진구': 'gwangjin',
  '동대문구': 'dongdaemun', '중랑구': 'jungnang', '성북구': 'seongbuk',
  '강북구': 'gangbuk', '도봉구': 'dobong', '노원구': 'nowon',
  // Gyeonggi cities
  '수원시': 'suwon', '용인시': 'yongin', '고양시': 'goyang', '화성시': 'hwaseong',
  '성남시': 'seongnam', '부천시': 'bucheon', '남양주시': 'namyangju',
  '안산시': 'ansan', '안양시': 'anyang', '평택시': 'pyeongtaek',
  '시흥시': 'siheung', '파주시': 'paju', '김포시': 'gimpo',
  '의정부시': 'uijeongbu', '광명시': 'gwangmyeong', '하남시': 'hanam',
  '군포시': 'gunpo', '양주시': 'yangju', '오산시': 'osan',
  '이천시': 'icheon', '구리시': 'guri', '안성시': 'anseong',
  '포천시': 'pocheon', '의왕시': 'uiwang', '여주시': 'yeoju',
  '동두천시': 'dongducheon', '과천시': 'gwacheon',
  // Major cities in other provinces
  '창원시': 'changwon', '청주시': 'cheongju', '천안시': 'cheonan',
  '전주시': 'jeonju', '포항시': 'pohang', '김해시': 'gimhae',
  '아산시': 'asan', '구미시': 'gumi', '진주시': 'jinju',
  '양산시': 'yangsan', '제주시': 'jejusi', '서귀포시': 'seogwipo',
  '춘천시': 'chuncheon', '원주시': 'wonju', '강릉시': 'gangneung',
  '경산시': 'gyeongsan', '거제시': 'geoje', '통영시': 'tongyeong',
  '사천시': 'sacheon', '밀양시': 'miryang', '영주시': 'yeongju',
  '안동시': 'andong', '충주시': 'chungju', '제천시': 'jecheon',
  '논산시': 'nonsan', '서산시': 'seosan', '당진시': 'dangjin',
  '보령시': 'boryeong', '익산시': 'iksan', '군산시': 'gunsan',
  '남원시': 'namwon', '정읍시': 'jeongeup', '목포시': 'mokpo',
  '순천시': 'suncheon', '여수시': 'yeosu', '광양시': 'gwangyang',
  '나주시': 'naju',
  '경주시': 'gyeongju', '김천시': 'gimcheon', '칠곡군': 'chilgok',
  '영천시': 'yeongcheon', '상주시': 'sangju', '울주군': 'ulju',
  '양평군': 'yangpyeong', '공주시': 'gongju', '홍성군': 'hongseong',
  '무안군': 'muan', '음성군': 'eumseong', '완주군': 'wanju',
  '진천군': 'jincheon', '김제시': 'gimje', '속초시': 'sokcho',
  '예산군': 'yesan', '동해시': 'donghae',
  '광주시': 'gwangju-si',  // 경기 광주 — 광역시 '광주': 'gwangju'와 구분
  '유성구': 'yuseong', '대덕구': 'daedeok',
  '동구': 'dong-gu',  // 대구/대전/울산/광주/부산 5곳 공통 — dedup으로 하나만 발행
  // Busan districts
  '해운대구': 'haeundae', '부산진구': 'busanjin', '동래구': 'dongnae',
  '남구': 'nam-gu', '북구': 'buk-gu', '사상구': 'sasang', '사하구': 'saha',
  '연제구': 'yeonje', '수영구': 'suyeong', '금정구': 'geumjeong',
  '기장군': 'gijang', '영도구': 'yeongdo',
  // Daegu districts
  '달서구': 'dalseo', '수성구': 'suseong', '달성군': 'dalseong',
  // Incheon districts
  '서구': 'seo-gu', '부평구': 'bupyeong', '남동구': 'namdong',
  '미추홀구': 'michuhol', '연수구': 'yeonsu', '계양구': 'gyeyang',
  // Gwangju districts
  '광산구': 'gwangsan',
  // Sub-districts (구 within 시)
  '분당구': 'bundang', '수정구': 'sujeong', '중원구': 'jungwon',
  '덕양구': 'deogyang', '일산동구': 'ilsan-dong', '일산서구': 'ilsan-seo',
  '수지구': 'suji', '기흥구': 'giheung', '처인구': 'cheoin',
  '동안구': 'dongan', '만안구': 'manan', '상록구': 'sangnok',
  '단원구': 'danwon', '원미구': 'wonmi', '소사구': 'sosa',
  '오정구': 'ojeong', '영통구': 'yeongtong', '권선구': 'gwonseon',
  '장안구': 'jangan', '팔달구': 'paldal',
  '성산구': 'seongsan', '의창구': 'uichang', '진해구': 'jinhae', '마산합포구': 'masan-happo',
  '마산회원구': 'masan-hoewon',
  '흥덕구': 'heungdeok', '서원구': 'seowon', '청원구': 'cheongwon', '상당구': 'sangdang',
  '서북구': 'seobuk', '동남구': 'dongnam', '동탄구': 'dongtan',
  '만세구': 'manse', '봉담구': 'bongdam',
  '완산구': 'wansan', '덕진구': 'deokjin',
  // Popular neighborhoods/dongs
  '목동': 'mokdong', '잠실동': 'jamsil', '역삼동': 'yeoksam',
  '삼성동': 'samseong', '논현동': 'nonhyeon', '압구정동': 'apgujeong',
  '신사동': 'sinsa', '청담동': 'cheongdam', '방배동': 'bangbae',
  '대치동': 'daechi', '서초동': 'seocho-dong', '도곡동': 'dogok',
  '개포동': 'gaepo', '일원동': 'ilwon', '수서동': 'suseo',
  '잠원동': 'jamwon', '반포동': 'banpo', '신정동': 'sinjeong',
  '화곡동': 'hwagok', '등촌동': 'deungchon', '발산동': 'balsan',
  '마곡동': 'magok', '공덕동': 'gongdeok', '합정동': 'hapjeong',
  '상암동': 'sangam', '망원동': 'mangwon', '연남동': 'yeonnam',
  '이태원동': 'itaewon', '한남동': 'hannam', '녹번동': 'nokbeon',
  '불광동': 'bulgwang', '응암동': 'eungam', '연신내동': 'yeonsinnae',
  '명동': 'myeongdong', '을지로동': 'euljiro', '동대문동': 'dongdaemun-dong',
  '왕십리동': 'wangsimni', '행당동': 'haengdang', '성수동': 'seongsu',
  '건대입구동': 'kondae', '구의동': 'guui', '자양동': 'jayang',
  '천호동': 'cheonho', '길동': 'gildong', '둔촌동': 'dunchon',
  '석촌동': 'seokchon', '문정동': 'munjeong', '가락동': 'garak',
  '거여동': 'geoyeo', '마천동': 'macheon', '오금동': 'ogeum',
  '방이동': 'bangi', '풍납동': 'pungnap', '위례동': 'wirye',
  '신림동': 'sillim', '봉천동': 'bongcheon', '사당동': 'sadang',
  '노량진동': 'noryangjin', '신대방동': 'sindaebang', '보라매동': 'boramae',
  '난곡동': 'nangok', '미아동': 'mia', '수유동': 'suyu',
  '번동': 'beon-dong', '쌍문동': 'ssangmun', '창동': 'chang-dong',
  '도봉동': 'dobong-dong', '상계동': 'sanggye', '중계동': 'junggye',
  '하계동': 'hagye', '월계동': 'wolgye', '공릉동': 'gongneung',
  '태릉동': 'taereung', '면목동': 'myeonmok', '중화동': 'junghwa',
  '상봉동': 'sangbong', '장위동': 'jangwi', '석관동': 'seokgwan',
  '정릉동': 'jeongneung', '길음동': 'gireum', '종암동': 'jongam',
  '신당동': 'sindang', '약수동': 'yaksu', '금호동': 'geumho',
  '옥수동': 'oksu', '후암동': 'huam', '이촌동': 'ichon',
  '여의동': 'yeoui', '당산동': 'dangsan', '문래동': 'mullae',
  '대림동': 'daelim', '신도림동': 'sindorim', '구로동': 'guro-dong',
  '개봉동': 'gaebong', '오류동': 'oryu', '독산동': 'doksan',
  '가산동': 'gasan', '시흥동': 'siheung-dong',
  '송도동': 'songdo', '동탄동': 'dongtan-dong', '운정동': 'unjeong',
  '광교동': 'gwanggyo', '영통동': 'yeongtong-dong',
  '정자동': 'jeongja', '서현동': 'seohyeon', '야탑동': 'yatap',
  '수내동': 'sunae', '판교동': 'pangyo', '미금동': 'migeum',
  '죽전동': 'jukjeon', '수지동': 'suji-dong', '동백동': 'dongbaek', '마북동': 'mabuk', '대연동': 'daeyeon',
  '수원동': 'suwon-dong',
  // Additional dongs/eups (from regions-data.json — population-ordered)
  '장유동': 'jangyu', '부평동': 'bupyeong-dong', '주안동': 'juan', '다산동': 'dasan',
  '안양동': 'anyang-dong', '연산동': 'yeonsan', '미사동': 'misa', '중동': 'jung-dong',
  '상도동': 'sangdo', '온양동': 'onyang', '부성동': 'buseong', '물금읍': 'mulgeum',
  '청라동': 'cheongna', '신월동': 'sinwol', '농소동': 'nongso', '봉담읍': 'bongdam-eup',
  '효자동': 'hyoja', '구월동': 'guwol', '송산동': 'songsan', '만수동': 'mansu',
  '비전동': 'bijeon', '옥정동': 'okjeong', '안심동': 'ansim', '용암동': 'yongam',
  '상동': 'sang-dong', '배방읍': 'baebang', '진접읍': 'jinjeop', '신길동': 'singil',
  '온천동': 'oncheon', '영종동': 'yeongjong', '간석동': 'ganseok', '행신동': 'haengsin',
  '송천동': 'songcheon', '대명동': 'daemyeong', '정왕동': 'jeongwang', '광명동': 'gwangmyeong-dong',
  '고산동': 'gosan', '향남읍': 'hyangnam', '신곡동': 'singok', '방화동': 'banghwa',
  '명지동': 'myeongji', '좌동': 'jwa-dong', '화명동': 'hwamyeong', '별내동': 'byeollae',
  '회천동': 'hoecheon', '우동': 'u-dong', '북부동': 'bukbu', '상현동': 'sanghyeon',
  '노은동': 'noeun', '산곡동': 'sangok', '당진동': 'dangjin-dong', '용호동': 'yongho',
  '호계동': 'hogye', '정관읍': 'jeonggwan', '중곡동': 'junggok', '매탄동': 'maetan',
  '아라동': 'ara', '일산동': 'ilsan-town', '금촌동': 'geumchon', '본오동': 'bono',
  '풍덕천동': 'pungdeokcheon', '용현동': 'yonghyeon', '범어동': 'beomeo', '수완동': 'suwan',
  '계양동': 'gyeyang-dong', '철산동': 'cheolsan', '서부동': 'seobu', '거제동': 'geoje-dong',
  '군포동': 'gunpo-dong', '배곧동': 'baegot', '방학동': 'banghak', '장량동': 'jangryang',
  '권선동': 'gwonseon-dong', '계산동': 'gyesan', '장안동': 'jangan-dong', '대원동': 'daewon',
  '망포동': 'mangpo', '공도읍': 'gongdo', '둔산동': 'dunsan', '불당동': 'buldang',
  '첨단동': 'cheomdan', '오창읍': 'ochang', '의정부동': 'uijeongbu-dong',
  '반여동': 'banyeo', '내외동': 'naeoe', '범서읍': 'beomseo', '가정동': 'gajeong',
  '화정동': 'hwajeong', '하안동': 'haan', '고덕동': 'godeok', '복대동': 'bokdae',
  '선부동': 'seonbu', '호원동': 'howon', '성내동': 'seongnae', '광남동': 'gwangnam',
  '광안동': 'gwangan', '안성동': 'anseong-dong', '암사동': 'amsa', '화도읍': 'hwado',
  '쌍용동': 'ssangyong', '나운동': 'naun', '오포동': 'opo', '왕조동': 'wangjo',
  '수택동': 'sutaek', '관저동': 'gwanjeo', '양재동': 'yangjae', '부개동': 'bugae',
  '흥해읍': 'heunghae', '남양읍': 'namyang', '청룡동': 'cheongryong', '풍무동': 'pungmu',
  '가양동': 'gayang', '와부읍': 'wabu', '신암동': 'sinam', '동춘동': 'dongchun',
  '비산동': 'bisan', '다대동': 'dadae', '덕풍동': 'deokpung', '상인동': 'sangin',
  '삼산동': 'samsan', '신장동': 'sinjang', '병점동': 'byeongjeom', '학익동': 'hakik',
  '만덕동': 'mandeok', '동면': 'dong-myeon', '재송동': 'jaesong', '내서읍': 'naeseo',
  '가좌동': 'gajwa', '은행동': 'eunhaeng', '김포본동': 'gimpo-bon', '중마동': 'jungma',
  '증포동': 'jeungpo', '오천읍': 'ocheon', '대천동': 'daecheon', '평리동': 'pyeongri',
  '성산동': 'seongsan-dong', '인후동': 'inhu', '호평동': 'hopyeong', '신내동': 'sinnae',
  '청천동': 'cheongcheon', '괴정동': 'goejeong', '효성동': 'hyoseong', '성복동': 'seongbok',
  '답십리동': 'dapsimni', '만촌동': 'manchon', '역곡동': 'yeokgok', '노형동': 'nohyeong',
  '신흥동': 'sinheung', '소하동': 'soha', '구포동': 'gupo', '진관동': 'jingwan',
  '홍제동': 'hongje', '양주동': 'yangju-dong', '이도동': 'ido', '월성동': 'wolseong',
  '평화동': 'pyeonghwa', '영덕동': 'yeongdeok', '소사본동': 'sosabon', '개금동': 'gaegeum',
  '가경동': 'gagyeong', '용산동': 'yongsan-dong', '수송동': 'susong', '진영읍': 'jinyeong',
  '사직동': 'sajik', '반곡관설동': 'bangokgwanseol', '상일동': 'sangil', '주엽동': 'jueop',
  '초월읍': 'chowol', '고촌읍': 'gochon', '유림동': 'yurim', '다사읍': 'dasa',
  '고척동': 'gocheok', '기장읍': 'gijang-eup', '동천동': 'dongcheon', '묵동': 'muk-dong',
  '오남읍': 'onam', '홍은동': 'hongeun', '삼송동': 'samsong', '웅동동': 'ungdong',
  '진안동': 'jinan', '진천동': 'jincheon-dong', '전농동': 'jeonnong', '태평동': 'taepyeong',
  '연수동': 'yeonsu-dong', '광양읍': 'gwangyang-eup', '작전동': 'jakjeon', '오송읍': 'osong',
  '부곡동': 'bugok', '운양동': 'unyang', '구서동': 'guseo', '주례동': 'jurye',
  '문산읍': 'munsan', '세류동': 'seryu', '강서동': 'gangseo-dong', '백석동': 'baekseok',
  '양포동': 'yangpo', '부암동': 'buam', '탄현동': 'tanhyeon', '의창동': 'uichang-dong',
  '이문동': 'imun', '석수동': 'seoksu', '장곡동': 'janggok', '북가좌동': 'bukgajwa',
  '내손동': 'naeson',
  // Subway stations
  '강남역': 'gangnam-station', '신논현역': 'sinnonhyeon-station',
  '역삼역': 'yeoksam-station', '선릉역': 'seolleung-station',
  '삼성역': 'samsung-station', '잠실역': 'jamsil-station',
  '홍대입구역': 'hongdae-station', '신촌역': 'sinchon-station',
  '오목교역': 'omokgyo-station', '여의도역': 'yeouido-station',
  '이태원역': 'itaewon-station', '명동역': 'myeongdong-station',
  '종로3가역': 'jongno3ga-station', '건대입구역': 'kondae-station',
  '왕십리역': 'wangsimni-station', '석촌역': 'seokchon-station',
  '천호역': 'cheonho-station', '노원역': 'nowon-station',
  '수유역': 'suyu-station', '사당역': 'sadang-station',
  '교대역': 'gyodae-station', '서울대입구역': 'snu-station',
  '신림역': 'sillim-station', '구로디지털단지역': 'gurodigital-station',
  '가산디지털단지역': 'gasandigital-station',
  '신도림역': 'sindorim-station', '영등포역': 'yeongdeungpo-station',
  '목동역': 'mokdong-station', '당산역': 'dangsan-station',
  '합정역': 'hapjeong-station', '상수역': 'sangsu-station',
  '이수역': 'isu-station', '동대문역': 'dongdaemun-station',
  '을지로입구역': 'euljiro-station', '시청역': 'cityhall-station',
  '광화문역': 'gwanghwamun-station',
  '해운대역': 'haeundae-station', '서면역': 'seomyeon-station',
  '부산역': 'busan-station', '남포역': 'nampo-station',
  '대구역': 'daegu-station', '동성로역': 'dongseongro-station',
  '인천역': 'incheon-station', '부평역': 'bupyeong-station',
};

// Slug resolver with a safety-net fallback.
// Primary path: SLUG_MAP returns a clean English slug (readable, good SEO).
// Fallback: lowercase hex of UTF-8 bytes. Ugly (e.g. "eab095eba68decbb9c") but
// SAFE — crucially the `%` is stripped. Without that strip, an older version of
// this code produced slugs like "%eb%aa%a9%ed%8f%ac%ec%8b%9c" that 404'd because
// URL decoding turned the param Korean while Firestore kept the literal `%`.
// We log a warning so missing SLUG_MAP entries are noticed, but pages still work.
function toSlug(korean: string): string {
  if (SLUG_MAP[korean]) return SLUG_MAP[korean];
  const cleaned = korean.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, '');
  if (SLUG_MAP[cleaned]) return SLUG_MAP[cleaned];

  const slug = encodeURIComponent(korean).toLowerCase().replace(/%/g, '');
  // Invariant: final slug must never contain `%`. If this ever trips, a future
  // refactor removed the `replace(/%/g, '')` — do NOT weaken it; fix the refactor.
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`[toSlug] Invalid slug "${slug}" for "${korean}" — must match [a-z0-9-]+`);
  }
  console.warn(`[toSlug] "${korean}" missing from SLUG_MAP — using hex fallback "${slug}". Add a proper romanization to src/lib/keywords.ts.`);
  return slug;
}

// --- Region entry ---
interface RegionEntry {
  name: string;       // Korean name for search (e.g., "서울", "강남구", "목동")
  slug: string;       // URL slug (e.g., "seoul", "gangnam", "mokdong")
  pop: number;        // Population for ordering
  type: 'city' | 'district' | 'dong' | 'subway';
}

// Provinces are administrative aggregates, not places anyone searches a clinic in.
// `regions-data.json` sorts `cities` by raw population, which put 경남 (3.2M) ahead of
// 인천 and 충남 ahead of 대구 — so the queue led with "경남 정형외과", a query that
// returns clinics scattered across a whole province and yields a worthless article.
// Tier first, population second.
const PROVINCES = new Set(['경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남']);

const TIER: Record<RegionEntry['type'], number> = {
  city: 3,
  district: 2,
  subway: 2,
  dong: 1,
};

function tierOf(r: RegionEntry): number {
  if (r.type === 'city' && PROVINCES.has(r.name)) return 0; // province — publish last
  return TIER[r.type];
}

// --- Build ordered region list from population data ---
function buildRegionList(): RegionEntry[] {
  const regions: RegionEntry[] = [];

  // Cities
  for (const city of regionsData.cities) {
    regions.push({
      name: city.name,
      slug: toSlug(city.name),
      pop: city.pop,
      type: 'city',
    });
  }

  // Districts (구/시)
  for (const dist of regionsData.districts) {
    // For 시 under 도: use 시 name without 시 suffix for search (수원시 → 수원)
    const searchName = dist.name.endsWith('시')
      ? dist.name.slice(0, -1)
      : dist.name;
    regions.push({
      name: searchName,
      slug: toSlug(dist.name),
      pop: dist.pop,
      type: 'district',
    });
  }

  // Dongs (동) - top by population
  for (const dong of regionsData.dongs) {
    // Skip if it's actually a 구 (sub-district of compound city)
    if (dong.name.endsWith('구')) continue;
    // Remove 동 suffix for search if it sounds more natural
    const searchName = dong.name;
    regions.push({
      name: searchName,
      slug: toSlug(dong.name),
      pop: dong.pop,
      type: 'dong',
    });
  }

  // Subway stations (fixed list, high search volume)
  const subwayStations = [
    { name: '강남역', pop: 800000 },
    { name: '홍대입구역', pop: 600000 },
    { name: '신논현역', pop: 500000 },
    { name: '잠실역', pop: 500000 },
    { name: '역삼역', pop: 450000 },
    { name: '건대입구역', pop: 400000 },
    { name: '선릉역', pop: 400000 },
    { name: '삼성역', pop: 400000 },
    { name: '명동역', pop: 350000 },
    { name: '이태원역', pop: 300000 },
    { name: '신촌역', pop: 300000 },
    { name: '왕십리역', pop: 280000 },
    { name: '오목교역', pop: 250000 },
    { name: '여의도역', pop: 250000 },
    { name: '석촌역', pop: 240000 },
    { name: '천호역', pop: 230000 },
    { name: '노원역', pop: 220000 },
    { name: '사당역', pop: 210000 },
    { name: '수유역', pop: 200000 },
    { name: '교대역', pop: 200000 },
    { name: '서울대입구역', pop: 190000 },
    { name: '신림역', pop: 185000 },
    { name: '구로디지털단지역', pop: 180000 },
    { name: '신도림역', pop: 175000 },
    { name: '영등포역', pop: 170000 },
    { name: '합정역', pop: 165000 },
    { name: '당산역', pop: 160000 },
    { name: '종로3가역', pop: 155000 },
    { name: '을지로입구역', pop: 150000 },
    { name: '광화문역', pop: 145000 },
    { name: '이수역', pop: 140000 },
    { name: '동대문역', pop: 135000 },
    { name: '해운대역', pop: 130000 },
    { name: '서면역', pop: 125000 },
    { name: '부산역', pop: 120000 },
  ];

  for (const station of subwayStations) {
    regions.push({
      name: station.name,
      slug: toSlug(station.name),
      pop: station.pop,
      type: 'subway',
    });
  }

  // Tier first (metro/district/subway before dong, provinces last), population second.
  regions.sort((a, b) => (tierOf(b) - tierOf(a)) || (b.pop - a.pop));

  // Deduplicate by slug. 세종 appears in both `cities` and `districts`; the higher
  // tier wins because the sort already ran.
  const seen = new Set<string>();
  return regions.filter(r => {
    if (seen.has(r.slug)) return false;
    seen.add(r.slug);
    return true;
  });
}

// Route segments that must never be shadowed by an article slug. `[seg]` sits at the
// URL root, so a region slug colliding with one of these would make the real page
// unreachable. seed.ts throws rather than writing such a keyword.
//
// 언어 코드가 여기 포함되는 것이 중요하다. `/en`은 영어 홈으로 분기되므로,
// 'en'이라는 slug의 글이 생기면 그 글에 영원히 접근할 수 없다.
export const RESERVED_SLUGS = new Set([
  's', 'api', 'about', 'privacy', 'terms', 'contact', 'blog', 'pricing',
  'sitemap.xml', 'robots.txt', 'og', 'img', 'pattern', '_next', 'favicon.ico',
  'icon.svg', 'apple-icon.png', 'logo.svg',
  ...LANGS.map(l => l.toLowerCase()),
]);

// --- Generate all keyword entries ---
export function generateAllKeywords(): KeywordEntry[] {
  const regions = buildRegionList();
  const entries: KeywordEntry[] = [];
  let order = 0;

  for (const region of regions) {
    for (const specialty of SITE.specialties) {
      const keyword = specialty.name
        ? `${region.name} ${specialty.name} ${SITE.categoryKo}`
        : `${region.name} ${SITE.categoryKo}`;
      const slug = specialty.slug
        ? `${region.slug}-${specialty.slug}`
        : region.slug;

      if (RESERVED_SLUGS.has(slug)) {
        throw new Error(
          `[keywords] slug "${slug}" (${keyword}) collides with a reserved route segment. ` +
          `Add a SLUG_MAP entry for "${region.name}" to disambiguate.`
        );
      }

      entries.push({
        id: `${SITE.key}-${slug}`,
        keyword,
        region: region.name,
        regionSlug: region.slug,
        specialty: specialty.name || '일반',
        specialtySlug: specialty.slug || 'general',
        slug,
        status: 'pending',
        publishedAt: null,
        order: order++,
      });
    }
  }

  return entries;
}

export function getSearchQuery(entry: KeywordEntry): string {
  return entry.keyword;
}
