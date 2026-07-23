// Shared, dependency-free guard for Naver's rate-limit / block banners.
// Lives in its own module (not scraper.ts) so client/page code can import it
// without pulling in Puppeteer.

export const NAVER_RESTRICTION_PHRASES = [
  '서비스 이용이 제한',
  '이용이 제한되었습니다',
  '비정상적인 접근',
  '잠시 후 다시 시도',
];

export function looksRestricted(text: string | null | undefined): boolean {
  if (!text) return false;
  return NAVER_RESTRICTION_PHRASES.some(p => text.includes(p));
}
