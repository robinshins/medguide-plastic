import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /sitemap.xml은 src/app/api/sitemap/route.ts가 만든다. app/sitemap.ts나
  // app/sitemap.xml/route.ts로는 프로덕션에서 갱신되지 않거나 404가 났다(그 파일 주석 참조).
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/sitemap.xml', destination: '/api/sitemap' },
      ],
    };
  },
  // Allow Naver image domains
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.naver.com' },
      { protocol: 'https', hostname: '**.pstatic.net' },
      { protocol: 'https', hostname: '**.kakaocdn.net' },
    ],
  },
  // Ignore build errors for initial deployment
  typescript: {
    ignoreBuildErrors: false,
  },
  // Server external packages for puppeteer
  serverExternalPackages: [
    'puppeteer-core',
    '@sparticuz/chromium',
    'firebase-admin',
    '@anthropic-ai/sdk',
    'openai',
  ],
};

export default nextConfig;
