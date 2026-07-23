// The Contour signature: one continuous 1px champagne face-profile line
// (forehead, nose, lips, chin) with the single permitted round element — a gold
// dot set like a full stop. Hairline stays 1px at any render size.
import type { SVGProps } from 'react';

export function ProfileHairline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 260 400" fill="none" aria-hidden="true" {...props}>
      <path
        d="M108 28 C138 36 152 58 149 84 C147.5 93 143 98 144.5 104 C162 126 170 142 166 154 C164 162 153 164 150 167 C157 172 157 179 151 183 C158 188 157 196 149 201 C159 208 157 224 144 235 C131 247 110 253 90 254"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="52" cy="238" r="6" fill="currentColor" />
    </svg>
  );
}
