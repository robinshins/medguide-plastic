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
 * Contact address for the footer and legal pages. Env-driven for the same reason.
 *
 * Returns '' when unset, and callers hide the contact line instead of rendering a
 * placeholder. Shipping a fake address like contact@example.com on a live medical
 * site would be worse than showing nothing: readers would mail into a void, and the
 * privacy/terms pages would be asserting something untrue.
 */
export function getContactEmail(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || '';
}
