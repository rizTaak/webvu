import { notFound } from 'next/navigation';

/**
 * Target of the proxy rewrite for an unrecognised host. Always 404s, which
 * renders src/app/sites/not-found.tsx.
 *
 * A static segment beats the dynamic [slug] route, so `unavailable` is in
 * RESERVED_SLUGS — no real website can ever be shadowed by this.
 *
 * Note: this cannot live in a folder named `_unknown`. App Router treats a
 * leading underscore as a private folder and excludes it from routing
 * entirely, so the rewrite silently fell through to the default 404.
 */
export default function UnavailableHost(): never {
  notFound();
}
