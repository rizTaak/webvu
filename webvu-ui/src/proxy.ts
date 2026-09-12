import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveHost } from './lib/host';

/**
 * Subdomain routing.
 *
 * NOTE: this file is `proxy.ts`, not `middleware.ts`. Next.js 16 renamed the
 * convention — a file named `middleware.ts` is simply never invoked, which
 * fails silently. See node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
 *
 *   webvu.io              -> /            (product page)
 *   dashboard.webvu.io    -> /dashboard
 *   admin.webvu.io        -> /admin
 *   <slug>.webvu.io/x     -> /sites/<slug>/x
 *
 * Reserved labels are never treated as slugs, so `dashboard` and `api` can
 * never be claimed by a user and shadow a real surface.
 */

const BASE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'webvu.localhost';

export function proxy(request: NextRequest) {
  const resolved = resolveHost(request.headers.get('host'), BASE_DOMAIN);
  const { pathname, search } = request.nextUrl;

  switch (resolved.kind) {
    case 'site': {
      const path = pathname === '/' ? '' : pathname;
      const url = new URL(`/sites/${resolved.slug}${path}${search}`, request.url);
      const response = NextResponse.rewrite(url);
      // User websites are untrusted content on a subdomain of our own domain.
      // No Webvu cookie is ever scoped to reach here; belt and braces, the
      // renderer must not set one either.
      response.headers.set('X-Webvu-Surface', 'site');
      return response;
    }

    case 'dashboard':
      return rewriteSurface(request, '/dashboard', pathname, search);

    case 'admin':
      return rewriteSurface(request, '/admin', pathname, search);

    case 'product':
      return NextResponse.next();

    case 'unknown':
    default:
      // An unrecognised host gets the generic not-found page rather than a
      // guess at which website was meant. `unavailable` is in the reserved
      // slug list, so this static route can never shadow a real website.
      return NextResponse.rewrite(new URL('/sites/unavailable', request.url));
  }
}

/** Paths that are shared across surfaces and must not be prefixed. */
const SHARED_PREFIXES = ['/auth', '/_next', '/api'];

function rewriteSurface(
  request: NextRequest,
  prefix: string,
  pathname: string,
  search: string,
) {
  if (pathname.startsWith(prefix)) return NextResponse.next();
  // /auth/signin is one route serving every surface; rewriting it to
  // /dashboard/auth/signin would 404.
  if (SHARED_PREFIXES.some((shared) => pathname.startsWith(shared))) {
    return NextResponse.next();
  }
  const path = pathname === '/' ? '' : pathname;
  const response = NextResponse.rewrite(new URL(`${prefix}${path}${search}`, request.url));
  response.headers.set('X-Robots-Tag', 'noindex');
  return response;
}

export const config = {
  /**
   * Skip Next internals and static assets — they are host-agnostic and
   * rewriting them would break asset resolution on user websites.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
