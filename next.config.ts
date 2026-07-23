import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
