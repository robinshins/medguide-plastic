/**
 * Canonical site URL, derived from the environment — never from source.
 *
 * The repositories are public, so no real domain is committed. NEXT_PUBLIC_SITE_URL
 * (set per project in Vercel, and as the SITE_URL repo variable for Actions) is the
 * single source of truth.
 *
 * This also fixes a real bug: SiteConfig used to carry a `domain` placeholder that was
 * never registered, and IndexNow submitted `host: <placeholder>` — announcing pages on
 * a domain we do not own, while canonical/OG correctly used the env value.
 */
const FALLBACK = 'http://localhost:3000';

export function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK;
  const withScheme = raw.startsWith('http') ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, '');
}

/** Bare host (no scheme, no trailing slash) — IndexNow requires this form. */
export function getSiteHost(): string {
  try {
    return new URL(getBaseUrl()).host;
  } catch {
    return 'localhost';
  }
}

/**
 * Contact address for the footer and legal pages.
 *
 * Hardcoded on purpose. It is the same across all five sites, it is displayed publicly
 * on every page anyway, and routing it through an env var meant one unset variable
 * silently removed the contact line from a live medical site.
 */
export function getContactEmail(): string {
  return 'nosun3946@gmail.com';
}
