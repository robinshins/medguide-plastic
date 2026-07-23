// Shared blog types. The CONTENT lives in src/lib/blog.ts, which is a per-site file
// installed by sync.sh — each specialty writes its own posts.

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** ISO date, e.g. '2026-07-23' */
  publishedAt: string;
  /** HTML body using the .article-content tag vocabulary. */
  html: string;
}
