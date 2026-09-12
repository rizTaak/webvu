import { headers } from 'next/headers';
import { navigationPages } from '@webvu/shared';
import { resolveHost } from '../../../../lib/host';
import { getLiveSnapshot } from '../../../../lib/websites';
import { ThemeInjector } from '../../../_components/site-renderer/ThemeInjector';
import { SiteHeader } from '../../../_components/site-renderer/SiteHeader';
import { SiteFooter } from '../../../_components/site-renderer/SiteFooter';

/**
 * An unknown or disabled page path on a valid website.
 *
 * SPEC.md § Error & Empty States requires this to 404 *inside the website's
 * own header and footer*, so the visitor can navigate onwards rather than
 * landing on Webvu chrome.
 *
 * A not-found boundary receives no params, so the slug is re-resolved from
 * the Host header. The snapshot fetch is cache-tagged, so this is a cache hit
 * rather than a second round trip.
 */

const BASE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'webvu.localhost';

export default async function SitePageNotFound() {
  const host = (await headers()).get('host');
  const resolved = resolveHost(host, BASE_DOMAIN);

  const result =
    resolved.kind === 'site'
      ? await getLiveSnapshot(resolved.slug)
      : ({ available: false, reason: 'not-found' } as const);

  // The website itself is gone: fall back to plain Webvu chrome.
  if (!result.available) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="text-text-muted">That page does not exist.</p>
      </main>
    );
  }

  const { snapshot } = result;

  return (
    <div
      data-webvu-site
      className="flex min-h-screen flex-col"
      style={{
        background: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        fontFamily: 'var(--site-font)',
      }}
    >
      <ThemeInjector theme={snapshot.theme} />
      <SiteHeader header={snapshot.header} pages={navigationPages(snapshot)} currentPath="" />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
          <h1 className="text-3xl font-semibold">Page not found</h1>
          <p className="mt-3 opacity-70">That page does not exist on this website.</p>
          <a
            href="/"
            className="mt-8 inline-flex items-center px-5 py-2.5 text-sm font-medium"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              borderRadius: 'var(--radius)',
            }}
          >
            Back to home
          </a>
        </div>
      </main>

      <SiteFooter footer={snapshot.footer} businessName={snapshot.header.businessName} />
    </div>
  );
}
