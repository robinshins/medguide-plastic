// Contour — near-black square (radius 0), one continuous 1px champagne-bronze
// face-profile line (forehead, nose, lips, chin), and the single permitted round
// element: a 6px gold dot, set like a full stop. All geometry, no fonts in the mark.
import type { SVGProps } from 'react';

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <rect width="32" height="32" fill="#0C0B0A" />
      <path
        d="M14.5 5.5 C17.6 6.4 19 8.6 18.7 11.2 C18.55 12.1 18.1 12.6 18.25 13.2 C20 15.4 20.8 17 20.4 18.2 C20.2 19 19.1 19.2 18.8 19.5 C19.5 20 19.5 20.7 18.9 21.1 C19.6 21.6 19.5 22.4 18.7 22.9 C19.7 23.6 19.5 25.2 18.2 26.3 C16.9 27.5 14.8 28.1 12.8 28.2"
        stroke="#BE9A5D"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="9" cy="26.2" r="3" fill="#BE9A5D" />
    </svg>
  );
}

export function Wordmark(props: SVGProps<SVGSVGElement>) {
  // Light Latin caps + a small Korean qualifier. This renders in the browser
  // (not rasterized), so <text> with the document font is safe here.
  return (
    <svg viewBox="0 0 132 18" aria-hidden="true" {...props}>
      <text x="0" y="13.5" fontFamily="inherit" fontSize="14" fontWeight="300"
            letterSpacing="3.5" fill="currentColor">CONTOUR</text>
      <text x="97" y="13" fontFamily="inherit" fontSize="8.5" fontWeight="500"
            letterSpacing="1" fill="#BE9A5D">리포트</text>
    </svg>
  );
}
