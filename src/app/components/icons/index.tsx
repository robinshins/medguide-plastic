// Contour icon grammar: FILLED solid minimal glyphs — no strokes, single color,
// 24 viewBox. Detail is carved as negative space with fill-rule evenodd
// (eyelid folds, pupils, the plus in the graft droplet). Abstract and quiet.
import type { SVGProps } from 'react';

type Icon = (p: SVGProps<SVGSVGElement>) => React.ReactElement;

// Shared fragments -----------------------------------------------------------
// Nose profile as one solid ribbon: bridge down, tip loop, nostril curl.
const NOSE_RIBBON =
  'M12.9 3c-.5 0-.9.4-.9.9 0 3.7.3 6.4 1.5 8.9.8 1.6 1.5 2.7 1.5 3.8 0 1.3-1 2.2-2.4 2.2-1 0-1.8-.4-2.4-1.1-.3-.3-.8-.4-1.2-.1-.4.3-.4.9-.1 1.3.9 1.1 2.2 1.7 3.7 1.7 2.4 0 4.2-1.7 4.2-4 0-1.6-.9-3-1.7-4.6-1-2.2-1.3-4.6-1.3-8.1 0-.5-.4-.9-.9-.9Z';

// Curved return band + solid arrowhead, centered on (12, cy). Drawn with the
// default nonzero rule so the arrowhead may kiss the band without carving it.
const revisionArrow = (cy: number) => {
  const d = cy - 13; // reference geometry was built around cy = 13
  return (
    `M3.9 ${10.1 + d}A8.6 8.6 0 0 1 19.8 ${9.4 + d}l-1.5.6A7 7 0 0 0 5.4 ${10.6 + d}l-1.5-.5Z` +
    `M18.9 ${7.2 + d}l3.5 2.1-2.9 2.3-.6-4.4Z`
  );
};

// Icons ----------------------------------------------------------------------

// 성형외과 전체 — abstract head profile, solid.
const General: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path
      fill="currentColor"
      d="M10.2 3C5.8 3 4 6.6 4 9.8c0 3.6 1.7 5.4 1.7 7.6V21h8.6v-2.6H16c.9 0 1.6-.7 1.6-1.6v-2.2l1.3-.4c.6-.2.8-.8.4-1.3-.8-1-1.5-2-1.6-2.9C17.3 5.9 14.4 3 10.2 3Z"
    />
  </svg>
);

// 쌍꺼풀 — solid almond eye; the fold and the pupil ring are negative space.
const DoubleEyelid: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12 5.4C7 5.4 3.3 9.9 2.3 12c1 2.1 4.7 6.6 9.7 6.6s8.7-4.5 9.7-6.6c-1-2.1-4.7-6.6-9.7-6.6Zm0 3.3a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Zm0 1.7a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM5.6 9.6c1.9-2 4-2.9 6.4-2.9s4.5.9 6.4 2.9c-2-1.2-4.1-1.8-6.4-1.8s-4.4.6-6.4 1.8Z"
    />
  </svg>
);

// 눈매교정 — solid lift arrow over a lowered eye.
const PtosisCorrection: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12 2.8 15.4 6.8h-2.3v2.8h-2.2V6.8H8.6L12 2.8Zm0 8.6c-3.9 0-6.8 2.8-7.7 3.9.9 1.1 3.8 3.9 7.7 3.9s6.8-2.8 7.7-3.9c-.9-1.1-3.8-3.9-7.7-3.9Zm0 1.4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm0 1.3a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"
    />
  </svg>
);

// 눈밑지방재배치 — eye above, a thin crescent shadow below.
const UnderEyeFat: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12 4.9C8 4.9 5 7.7 4.1 8.9 5 10.1 8 12.9 12 12.9s7-2.8 7.9-4c-.9-1.2-3.9-4-7.9-4Zm0 1.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Zm0 1.3a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM6 15c1.8 2.2 10.2 2.2 12 0-1 3.6-11 3.6-12 0Z"
    />
  </svg>
);

// 눈재수술 — curved return arrow above a smaller eye.
const RevisionEye: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path fill="currentColor" d={revisionArrow(13)} />
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12 12.6c-3.4 0-5.9 2.3-6.7 3.3.8 1 3.3 3.3 6.7 3.3s5.9-2.3 6.7-3.3c-.8-1-3.3-3.3-6.7-3.3Zm0 1.2a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Zm0 1.1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
    />
  </svg>
);

// 코성형 — the nose ribbon on its own.
const Rhinoplasty: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path fill="currentColor" d={NOSE_RIBBON} />
  </svg>
);

// 코재수술 — the return arrow over a compact nose ribbon.
const RevisionRhinoplasty: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path fill="currentColor" d={revisionArrow(11.2)} />
    <path fill="currentColor" transform="translate(4.6 9.8) scale(0.58)" d={NOSE_RIBBON} />
  </svg>
);

// 안면윤곽 — the jawline as a single tapered band.
const FacialBone: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path
      fill="currentColor"
      d="M4.6 5.4c.4 4.2 1.4 7.6 3.3 10.3 1.5 2.1 3 3.3 4.1 3.3s2.6-1.2 4.1-3.3c1.9-2.7 2.9-6.1 3.3-10.3h-1.9c-.4 3.7-1.3 6.7-2.9 9-1.1 1.6-2 2.5-2.6 2.5s-1.5-.9-2.6-2.5c-1.6-2.3-2.5-5.3-2.9-9H4.6Z"
    />
  </svg>
);

// 양악수술 — paired jaw arcs, upper and lower.
const DoubleJaw: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path
      fill="currentColor"
      d="M4.8 6.4c1 3.8 3.8 6.2 7.2 6.2s6.2-2.4 7.2-6.2h-1.9c-1 2.7-3 4.3-5.3 4.3S7.7 9.1 6.7 6.4H4.8Zm0 6.6c1 3.8 3.8 6.2 7.2 6.2s6.2-2.4 7.2-6.2h-1.9c-1 2.7-3 4.3-5.3 4.3S7.7 15.7 6.7 13H4.8Z"
    />
  </svg>
);

// 지방흡입 — solid droplet, one carved highlight.
const Liposuction: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12 2.6S5.6 10.1 5.6 14.5a6.4 6.4 0 0 0 12.8 0C18.4 10.1 12 2.6 12 2.6Zm2.2 10.8a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z"
    />
  </svg>
);

// 지방이식 — the droplet with a plus carved from its body.
const FatGraft: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12 2.6S5.6 10.1 5.6 14.5a6.4 6.4 0 0 0 12.8 0C18.4 10.1 12 2.6 12 2.6Zm-.9 8.3h1.8v2.2h2.2v1.8h-2.2v2.2h-1.8v-2.2H8.9v-1.8h2.2v-2.2Z"
    />
  </svg>
);

// 가슴성형 — two abstract arc bands meeting at the midline. Nothing figurative.
const Breast: Icon = p => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path
      fill="currentColor"
      d="M2.6 9.8a4.7 4.7 0 0 0 9.4 0h-1.9a2.8 2.8 0 0 1-5.6 0H2.6ZM12 9.8a4.7 4.7 0 0 0 9.4 0h-1.9a2.8 2.8 0 0 1-5.6 0H12Z"
    />
  </svg>
);

const REGISTRY: Record<string, Icon> = {
  general: General,
  'double-eyelid': DoubleEyelid,
  'ptosis-correction': PtosisCorrection,
  'under-eye-fat': UnderEyeFat,
  'revision-eye': RevisionEye,
  rhinoplasty: Rhinoplasty,
  'revision-rhinoplasty': RevisionRhinoplasty,
  'facial-bone': FacialBone,
  'double-jaw': DoubleJaw,
  liposuction: Liposuction,
  'fat-graft': FatGraft,
  breast: Breast,
};

export function SpecialtyIcon({ slug, className }: { slug: string; className?: string }) {
  const C = REGISTRY[slug] ?? General;
  return <C className={className} focusable="false" />;
}
