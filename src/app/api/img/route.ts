import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Only allow Naver/Kakao image domains
  if (!url.includes('pstatic.net') && !url.includes('kakaocdn.net')) {
    return new Response('Invalid image domain', { status: 403 });
  }

  // Naver's resize proxy (search.pstatic.net/common/?...&src=<raw CDN url>) is
  // aggressively IP-restricted from datacenter IPs and returns a "서비스 이용이
  // 제한되었습니다" placeholder image (HTTP 200). The raw CDN URL embedded in the
  // `src` param is far more lenient, so unwrap it and fetch the origin directly.
  if (url.includes('search.pstatic.net/common')) {
    try {
      const src = new URL(url).searchParams.get('src');
      if (src && src.includes('pstatic.net')) {
        url = src;
      }
    } catch {
      // fall through and fetch the original URL
    }
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://m.place.naver.com/',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });

    if (!response.ok) {
      return new Response('Image fetch failed', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch {
    return new Response('Image proxy error', { status: 500 });
  }
}
