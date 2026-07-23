// 성형외과 — "Contour". Editorial luxury magazine: near-black + ivory + one
// champagne-bronze accent. Radius 0 everywhere, no shadows (hairline substitute),
// light type does all the work. The only round thing allowed is a 6px gold dot.
//
// Literal hexes, NOT `rgb(var(--x) / <alpha-value>)`. Each site has exactly one fixed
// theme, so runtime indirection buys nothing — and sharp/satori cannot resolve CSS
// variables, which would break SVG and OG generation.

export const brand = {
  50: '#F7F6F4', 100: '#EDEBE7', 200: '#D9D5CE', 300: '#B8B2A8', 400: '#8E8878',
  500: '#6B6559', 600: '#514C43', 700: '#3C3833', 800: '#282521', 900: '#191714', 950: '#0C0B0A',
} as const;

export const accent = {
  50: '#FBF7EE', 100: '#F7EFDD', 200: '#F0E3C8', 300: '#E4CFA6', 400: '#D4B784',
  500: '#BE9A5D', 600: '#9C7B43', 700: '#7A5F33', 800: '#5E4926', 900: '#46361B',
} as const;

export const surface = {
  page: '#FBFAF8', card: '#FFFFFF', sunk: '#F2F0EC', inverse: '#0C0B0A',
} as const;

export const line = {
  DEFAULT: '#E4E0D9', strong: '#CFC9BE', inverse: 'rgba(239,234,224,0.14)',
} as const;

export const ink = {
  DEFAULT: '#191714', muted: '#57524A', soft: '#8A8478', onDark: '#EFEAE0',
} as const;

// Platform chips are semantic, never re-themed per site.
export const platform = {
  naverBg: '#E9F7EE', naverFg: '#127A3C',
  kakaoBg: '#FEF6DC', kakaoFg: '#8A6A00',
  googleBg: '#EAF1FE', googleFg: '#1A56C4',
} as const;

// Radius 0 is the Contour signature — every corner is a corner.
export const radius = { sm: '0px', md: '0px', lg: '0px', xl: '0px' } as const;

// No shadows. A 1px hairline stands in wherever shared components ask for depth.
export const shadow = {
  card: '0 0 0 1px #E4E0D9',
  lift: '0 0 0 1px #CFC9BE',
} as const;

export const typeTokens = {
  sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo',
         'Pretendard', 'Malgun Gothic', 'sans-serif'],
  display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
  mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  articleMeasure: '66ch',
  articleLeading: '1.95',
  articleSize: '1.0625rem',
} as const;

export function toCssVars(): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (prefix: string, obj: Record<string, string>) => {
    for (const [k, v] of Object.entries(obj)) {
      out[`--${prefix}-${k === 'DEFAULT' ? 'base' : k}`] = v;
    }
  };
  put('brand', brand as unknown as Record<string, string>);
  put('accent', accent as unknown as Record<string, string>);
  put('surface', surface as unknown as Record<string, string>);
  put('line', line as unknown as Record<string, string>);
  put('ink', ink as unknown as Record<string, string>);
  put('platform', platform as unknown as Record<string, string>);
  put('radius', radius as unknown as Record<string, string>);
  out['--article-measure'] = typeTokens.articleMeasure;
  out['--article-leading'] = typeTokens.articleLeading;
  out['--article-size'] = typeTokens.articleSize;
  return out;
}
