import type { Config } from 'tailwindcss';
import {
  brand, accent, surface, line, ink, platform, radius, shadow, typeTokens,
} from './src/design/tokens';
import designPlugin from './src/design/tailwind-plugin';

// NOTE: these imports must be RELATIVE. Tailwind v3 loads this file through jiti,
// which does not resolve the `@/` tsconfig path alias.
//
// `theme.extend` only — replacing `theme.colors` wholesale would delete gray/green/
// amber/blue, which the Naver/Kakao/Google rating chips and empty states rely on.
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { brand, accent, surface, line, ink, platform },
      borderRadius: {
        sm: radius.sm, md: radius.md, lg: radius.lg, xl: radius.xl, '2xl': radius.xl,
      },
      boxShadow: { card: shadow.card, lift: shadow.lift },
      fontFamily: {
        sans: [...typeTokens.sans],
        display: [...typeTokens.display],
        mono: [...typeTokens.mono],
      },
      maxWidth: { measure: typeTokens.articleMeasure },
      fontSize: {
        'display-1': ['clamp(2.5rem,6vw,4.25rem)', { lineHeight: '1.04', letterSpacing: '-0.03em' }],
        'display-2': ['clamp(1.75rem,3.4vw,2.5rem)', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        label: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.18em' }],
      },
    },
  },
  plugins: [designPlugin],
} satisfies Config;
