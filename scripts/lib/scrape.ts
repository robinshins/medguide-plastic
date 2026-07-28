import type { Browser } from 'puppeteer-core';
import { withPage, delay } from './browser';
import { SITE } from '../../src/lib/site.config';
import type { ReviewItem } from '../../src/lib/types';

/**
 * 짝 없는 서로게이트를 제거한다.
 *
 * 네이버 리뷰는 본문이 잘린 채로 오는 경우가 있어 이모지가 중간에서 끊긴다
 * (예: U+D83D 뒤에 low surrogate가 없음). 이 문자가 프롬프트에 실리면
 * JSON.stringify는 문법상 유효한 \ud83d 이스케이프를 만들지만 UTF-16으로는
 * 깨진 값이라 OpenAI가 요청 본문 파싱을 거부한다
 * ("400 Invalid body: failed to parse JSON value").
 *
 * 결정론적 실패라 재시도 3회가 모두 같은 이유로 죽고 키워드가 failed로 확정됐다
 * (2026-07-27, medguide-plastic "대구 쌍꺼풀 성형외과").
 *
 * 스크래퍼 경계에서 한 번 씻어 프롬프트와 Firestore 양쪽을 동시에 보호한다.
 */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function cleanDeep<T>(value: T): T {
  if (typeof value === 'string') return value.replace(LONE_SURROGATE, '') as unknown as T;
  if (Array.isArray(value)) return value.map(cleanDeep) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = cleanDeep(v);
    return out as T;
  }
  return value;
}

export interface NaverPlace {
  id: string;
  name: string;
}

export interface PlaceDetail {
  name: string;
  category: string;
  address: string;
  phone: string;
  businessHours: string;
  specialistsInfo: string;
  facilities: string;
  homepage: string;
  directions: string;
  naverReviewCount: number;
  naverBlogReviewCount: number;
  naverStarRating: number | null;
  blogUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  facebookUrl: string;
  imageUrls: string[];
}

export interface KakaoPlace {
  name: string;
  rating: number | null;
  reviewCount: number;
  address: string;
  hours: string;
  phone: string;
}

// --- Naver place search ---------------------------------------------------
export async function searchNaver(browser: Browser, query: string): Promise<NaverPlace[]> {
  return withPage(browser, async page => {
    await page.goto(
      `https://m.search.naver.com/search.naver?query=${encodeURIComponent(query)}&where=place`,
      { waitUntil: 'networkidle2', timeout: 30000 }
    );
    await delay(1500);
    return page.evaluate(() => {
      const root = document.querySelector('#place-app-root');
      if (!root) return [];
      const links = root.querySelectorAll(
        'a[href*="place.naver.com/place/"], a[href*="place.naver.com/hospital/"]'
      );
      const seen = new Set<string>();
      const results: { id: string; name: string }[] = [];
      for (const link of Array.from(links)) {
        const href = link.getAttribute('href') || '';
        if (href.includes('ader.naver.com')) continue; // ad slot
        const match = href.match(/(?:place|hospital)\/(\d+)/);
        if (!match || seen.has(match[1])) continue;
        const text = (link.textContent || '').trim();
        if (
          text.includes('이미지') || text.includes('진료') || text.includes('휴게') ||
          text.includes('MY') || text.includes('검색') || text.includes('©') || text.length < 2
        ) continue;
        const name = text.replace(/톡톡/g, '').replace(/예약$/g, '').trim();
        if (name.length < 2) continue;
        seen.add(match[1]);
        results.push({ id: match[1], name });
      }
      return results.slice(0, 8); // over-fetch; the category filter will thin this out
    });
  });
}

// --- Naver place detail + visitor reviews ---------------------------------
export async function getPlaceInfo(
  browser: Browser,
  placeId: string
): Promise<{ detail: PlaceDetail; reviews: ReviewItem[] }> {
  return withPage(browser, async page => {
    await page.goto(`https://m.place.naver.com/hospital/${placeId}/home`, {
      waitUntil: 'networkidle2', timeout: 25000,
    });
    await delay(1000);
    // HIRA panel is lazy-loaded well below the fold.
    for (let s = 0; s < 5; s++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await delay(300);
    }
    await delay(1000);
    await page.evaluate(() => {
      document.querySelectorAll('*').forEach(el => {
        if (el.children.length === 0 && el.textContent?.trim() === '펼쳐보기') {
          (el as HTMLElement).click();
        }
      });
    });
    await delay(500);

    // `hints` MUST be passed as an argument — page.evaluate runs in the browser
    // context and cannot close over module scope.
    const detail = await page.evaluate((hints: string[]) => {
      const text = document.body.innerText;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      let name = '', address = '', phone = '', facilities = '', directions = '', homepage = '';
      let naverReviewCount = 0, naverBlogReviewCount = 0, category = '';
      let naverStarRating: number | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i < 5 && !name && line.length > 1 && line.length < 50 &&
            !line.includes('이전') && !line.includes('플레이스') && !line.includes('마이')) name = line;
        if (i < 8 && !category && hints.some(h => line.includes(h))) category = line;
        const starMatch = line.match(/별점\s*(\d+\.?\d*)/);
        if (starMatch) naverStarRating = parseFloat(starMatch[1]);
        const vm = line.match(/방문자 리뷰\s*([\d,]+)/);
        if (vm) naverReviewCount = parseInt(vm[1].replace(/,/g, ''));
        const bm = line.match(/블로그 리뷰\s*([\d,]+)/);
        if (bm) naverBlogReviewCount = parseInt(bm[1].replace(/,/g, ''));
        if (!address && /^(서울|부산|대구|인천|광주|대전|울산|경기|충|전|강원|제주)/.test(line) &&
            line.length > 5 && line.length < 80) address = line;
        if (!phone && /^(0\d{1,2}[-)]|0507|1\d{3}[-)])/.test(line)) phone = line.split(/\s/)[0];
        if (line.startsWith('http') && !homepage) homepage = line;
        if (line.includes('예약') && line.includes('주차') && !facilities) facilities = line;
        if (line.includes('출구') && !directions) directions = line;
      }

      let businessHours = '';
      const hoursIdx = lines.findIndex(l => l.includes('영업시간'));
      if (hoursIdx >= 0) {
        const hourLines: string[] = [];
        const days = ['월', '화', '수', '목', '금', '토', '일'];
        for (let i = hoursIdx + 1; i < Math.min(hoursIdx + 30, lines.length); i++) {
          if (lines[i] === '접기' || lines[i].includes('전화번호')) break;
          if (days.includes(lines[i]) && i + 1 < lines.length && /\d{2}:\d{2}/.test(lines[i + 1])) {
            hourLines.push(`${lines[i]} ${lines[i + 1]}`);
          }
        }
        if (hourLines.length) businessHours = hourLines.join(' / ');
      }
      if (!businessHours) {
        for (const line of lines) {
          if ((line.includes('진료 시작') || line.includes('진료중')) && line.length < 40) {
            businessHours = line; break;
          }
        }
      }

      // HIRA (건강보험심사평가원) panel. For 한의원 the 전문의 table is usually absent —
      // 진료과목 and 장비 still populate, which is why the prompt asks for
      // SITE.credentialLabel rather than a hardcoded "전문의 수".
      const parts: string[] = [];
      document.querySelectorAll('.DAQTB').forEach(section => {
        const heading = section.querySelector('h3')?.textContent || '';
        if (heading.includes('전문의')) {
          section.querySelectorAll('tbody tr').forEach(row => {
            const dept = row.querySelector('th')?.textContent || '';
            const count = row.querySelector('td')?.textContent || '';
            if (dept && count) parts.push(`${dept} 전문의 ${count}명`);
          });
        } else if (heading.includes('진료과목')) {
          const depts: string[] = [];
          section.querySelectorAll('li').forEach(li => {
            if (li.textContent) depts.push(li.textContent.trim());
          });
          if (depts.length) parts.push(`진료과목: ${depts.join(', ')}`);
        } else if (heading.includes('특수진료장비')) {
          section.querySelectorAll('tbody tr').forEach(row => {
            const equip = row.querySelector('th')?.textContent || '';
            const count = row.querySelector('td')?.textContent || '';
            if (equip && count) parts.push(`${equip} ${count}대`);
          });
        }
      });

      let blogUrl = '', instagramUrl = '', youtubeUrl = '', facebookUrl = '';
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href.includes('instagram.com') && !instagramUrl) instagramUrl = href;
        if (href.includes('blog.naver.com') && !blogUrl) blogUrl = href;
        if (href.includes('youtube.com') && !youtubeUrl) youtubeUrl = href;
        if (href.includes('facebook.com') && !facebookUrl) facebookUrl = href;
      });

      const imageUrls: string[] = [];
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) imageUrls.push(ogImg.getAttribute('content') || '');
      document.querySelectorAll('img[src*="pstatic"]').forEach(img => {
        const src = img.getAttribute('src') || '';
        if ((src.includes('phinf') || src.includes('ldb-phinf')) &&
            !src.includes('icon') && !src.includes('profile') && !src.includes('banner')) {
          imageUrls.push(src);
        }
      });

      return {
        name, category,
        address: address.replace(/지도내비게이션거리뷰/g, '').replace(/지도$/, '').trim(),
        phone: phone.replace(/복사$/g, '').trim(),
        businessHours, specialistsInfo: parts.join(' | '), facilities, homepage, directions,
        naverReviewCount, naverBlogReviewCount, naverStarRating,
        blogUrl, instagramUrl, youtubeUrl, facebookUrl,
        imageUrls: imageUrls.filter(Boolean).slice(0, 3),
      };
    }, SITE.categoryHints);

    await page.goto(`https://m.place.naver.com/place/${placeId}/review/visitor`, {
      waitUntil: 'networkidle2', timeout: 25000,
    });
    await delay(1500);
    const reviews = await page.evaluate(() => {
      const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
      const results: { author: string; content: string; date: string; visitCount: string; source: 'naver' }[] = [];
      for (let i = 0; i < lines.length && results.length < 8; i++) {
        if (lines[i].length <= 15 && lines[i + 1] && /^리뷰 \d+/.test(lines[i + 1])) {
          const author = lines[i];
          let j = i + 1;
          while (j < lines.length &&
                 (/^(리뷰|팔로우|진료예약|예약|대기)/.test(lines[j]) || lines[j].includes('사진'))) j++;
          let content = '';
          while (j < lines.length) {
            if (/^(방문일|반응 남기기)/.test(lines[j])) break;
            if (lines[j] !== '더보기') content += (content ? ' ' : '') + lines[j];
            j++;
          }
          let date = '', visitCount = '';
          for (let k = j; k < Math.min(j + 10, lines.length); k++) {
            const dm = lines[k].match(/(\d{4}년 \d+월 \d+일)/);
            if (dm) date = dm[1];
            const vk = lines[k].match(/(\d+번째 방문)/);
            if (vk) { visitCount = vk[1]; break; }
          }
          if (content.length > 5) {
            results.push({ author, content: content.substring(0, 400), date, visitCount, source: 'naver' });
          }
          i = j;
        }
      }
      return results;
    });

    return cleanDeep({ detail: detail as PlaceDetail, reviews: reviews as ReviewItem[] });
  });
}

// --- KakaoMap -------------------------------------------------------------
export async function searchKakao(browser: Browser, query: string): Promise<KakaoPlace[]> {
  return withPage(browser, async page => {
    await page.goto(`https://m.map.kakao.com/actions/searchView?q=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(1500);
    return page.evaluate((suffixes: string[]) => {
      const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
      const nameRe = new RegExp(`(${suffixes.join('|')})$`);
      const places: {
        name: string; rating: number | null; reviewCount: number;
        address: string; hours: string; phone: string;
      }[] = [];
      for (let i = 0; i < lines.length && places.length < 10; i++) {
        if (nameRe.test(lines[i]) && lines[i].length > 2) {
          const name = lines[i];
          let rating: number | null = null, reviewCount = 0;
          let address = '', hours = '', phone = '';
          for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
            if (lines[j].includes('평점') ||
                (lines[j - 1]?.includes('평점') && /^\d/.test(lines[j]))) {
              const rm = lines[j].match(/(\d+\.?\d*)/);
              if (rm) rating = parseFloat(rm[1]);
            }
            const rcm = lines[j].match(/리뷰\s*(\d[\d,]*)/);
            if (rcm) reviewCount = parseInt(rcm[1].replace(/,/g, ''));
            const cm = lines[j].match(/\((\d[\d,]*)\)/);
            if (cm && !reviewCount) reviewCount = parseInt(cm[1].replace(/,/g, ''));
            if (/^(서울|부산|대구|인천|경기|광주|대전|울산|충|전|강원|제주)/.test(lines[j]) && !address) address = lines[j];
            if ((lines[j].includes('진료') || lines[j].includes('브레이크타임')) && !hours) hours = lines[j];
            if (lines[j].startsWith('TEL')) phone = lines[j].replace('TEL', '').trim();
            if (lines[j] === '지도길찾기' || lines[j] === '지도') break;
          }
          places.push({ name, rating, reviewCount, address, hours, phone });
        }
      }
      return places;
    }, SITE.clinicNameSuffixes);
  });
}

// --- Google Maps ----------------------------------------------------------
export async function searchGoogle(
  browser: Browser,
  hospitalName: string,
  region: string
): Promise<{ rating: number | null; reviewCount: number }> {
  return withPage(browser, async page => {
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(`${hospitalName} ${region}`)}`,
      { waitUntil: 'networkidle2', timeout: 30000 }
    );
    await delay(2000);
    return page.evaluate(() => {
      const text = document.body.innerText;
      const ratingMatch = text.match(/(\d\.\d)\s*\n/);
      const reviewMatch = text.match(/\((\d[\d,]*)\)/);
      return {
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
        reviewCount: reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : 0,
      };
    });
  });
}

/**
 * Kakao searches by clinic NAME, and broad suffixes like 병원/의원 pull in unrelated
 * clinics ("강남연세의원" for "강남연세안과"). Require a shared prefix before the
 * candidate list ever reaches the LLM matcher — it shrinks the list and cuts errors.
 */
export function prefilterKakaoCandidates(naverName: string, candidates: KakaoPlace[]): KakaoPlace[] {
  const norm = (s: string) => s.replace(/\s/g, '');
  const target = norm(naverName);
  return candidates.filter(c => {
    const cand = norm(c.name);
    return cand.slice(0, 2) === target.slice(0, 2) ||
           cand.includes(target.slice(0, 4)) ||
           target.includes(cand.slice(0, 4));
  });
}

/** True when the Naver place's own category line matches this site's specialty. */
export function matchesSpecialty(category: string): boolean {
  if (!category) return true; // no category line scraped — don't discard on missing data
  return SITE.categoryHints.some(h => category.includes(h));
}
