import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { findPageByPath, navigationPages, visibleBlocks } from '@webvu/shared';
import { getLiveSnapshot } from '../../../../lib/websites';
import { ThemeInjector } from '../../../_components/site-renderer/ThemeInjector';
import { BlockRenderer } from '../../../_components/site-renderer/BlockRenderer';
import { SiteHeader } from '../../../_components/site-renderer/SiteHeader';
import { SiteFooter } from '../../../_components/site-renderer/SiteFooter';

/**
 * The public renderer. Every visitor request to `<slug>.webvu.io` lands here
 * after the proxy rewrite. SPEC.md § Data Flow.
 */

type Params = { slug: string; path?: string[] };

function pathFrom(segments: string[] | undefined): string {
  if (!segments || segments.length === 0) return '/';
  return `/${segments.join('/')}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, path } = await params;
  const result = await getLiveSnapshot(slug);
  if (!result.available) return { title: 'Website not found' };

  const page = findPageByPath(result.snapshot, pathFrom(path));
  if (!page || !page.enabled) return { title: 'Page not found' };

  const { header } = result.snapshot;
  const title = page.seo.metaTitle ?? `${page.title} — ${header.businessName}`;

  return {
    title,
    description: page.seo.metaDescription ?? undefined,
    openGraph: {
      title,
      description: page.seo.metaDescription ?? undefined,
      images: page.seo.ogImageUrl ? [page.seo.ogImageUrl] : undefined,
    },
  };
}

export default async function SitePage({ params }: { params: Promise<Params> }) {
  const { slug, path } = await params;
  const currentPath = pathFrom(path);

  const result = await getLiveSnapshot(slug);
  if (!result.available) {
    // Unknown, unpublished and suspended are all 404 to a visitor: an
    // unavailable website must be indistinguishable from a missing one.
    notFound();
  }

  const { snapshot } = result;
  const page = findPageByPath(snapshot, currentPath);

  // A disabled or unknown page path must 404 with a real status code, not
  // merely render a "not found" message. The sibling not-found.tsx renders it
  // inside the website's own chrome. SPEC.md § Error & Empty States.
  if (!page || !page.enabled) {
    notFound();
  }

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

      <SiteHeader
        header={snapshot.header}
        pages={navigationPages(snapshot)}
        currentPath={currentPath}
      />

      <main className="flex-1">
        {visibleBlocks(page).map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </main>

      <SiteFooter footer={snapshot.footer} businessName={snapshot.header.businessName} />
    </div>
  );
}
