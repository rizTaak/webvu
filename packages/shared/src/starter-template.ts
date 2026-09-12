import { heroDefaultProps } from './components/hero';
import { pageDefaultTitles, pagePaths, type PageKey } from './pages';
import { defaultSectionFor } from './registry';
import type { BlockType } from './registry';
import type { Block } from './blocks';
import type { Footer, Header, Page } from './website';

/**
 * The starter template. SPEC.md § Starter Template.
 *
 * Written against the catalogue rather than against what happens to be
 * implemented, so it needs no revision as components are built out — an
 * unbuilt component simply renders as a placeholder.
 *
 * Seeded blocks alternate background between `none` and `muted` so a newly
 * created website already reads as a designed page rather than a flat column.
 */

interface TemplatePage {
  readonly key: PageKey;
  readonly enabled: boolean;
  readonly blocks: readonly BlockType[];
}

const TEMPLATE: readonly TemplatePage[] = [
  { key: 'home', enabled: true, blocks: ['hero', 'feature-grid', 'product-grid', 'testimonials', 'cta-banner'] },
  { key: 'about', enabled: true, blocks: ['page-header', 'media-text', 'stats'] },
  { key: 'products', enabled: true, blocks: ['page-header', 'product-grid'] },
  { key: 'services', enabled: true, blocks: ['page-header', 'services-list', 'steps'] },
  { key: 'contact', enabled: true, blocks: ['page-header', 'contact-form', 'contact-details'] },
  { key: 'order', enabled: false, blocks: ['page-header', 'order-form'] },
];

/** Deterministic ids keep `npm run seed` idempotent. */
function blockId(page: PageKey, index: number): string {
  return `${page}-${index + 1}`;
}

/** The product grid an order form takes its selectable line items from. */
export const STARTER_PRODUCT_GRID_BLOCK_ID = blockId('products', 1);

function starterProps(type: BlockType, page: PageKey): Record<string, unknown> {
  if (type === 'hero') {
    return { ...heroDefaultProps };
  }
  if (type === 'order-form' && page === 'order') {
    // Placeholder props are opaque, but recording the reference now means the
    // link survives into the built-out component. SPEC.md § Component Build-Out.
    return { sourceBlockId: STARTER_PRODUCT_GRID_BLOCK_ID };
  }
  return {};
}

function starterBlocks(page: TemplatePage): Block[] {
  return page.blocks.map((type, index) => {
    const section = defaultSectionFor(type);
    // Alternate bands, unless the component already asks for a specific
    // background (cta-banner defaults to accent).
    if (section.background === 'none' && index % 2 === 1) {
      section.background = 'muted';
    }
    return {
      id: blockId(page.key, index),
      type,
      section,
      props: starterProps(type, page.key),
    };
  });
}

export function createStarterPages(): Page[] {
  return TEMPLATE.map((page) => ({
    key: page.key,
    path: pagePaths[page.key],
    title: pageDefaultTitles[page.key],
    enabled: page.enabled,
    seo: { metaTitle: null, metaDescription: null, ogImageUrl: null },
    blocks: starterBlocks(page),
  }));
}

export function createStarterHeader(businessName: string): Header {
  return { logoUrl: null, businessName };
}

export function createStarterFooter(): Footer {
  return { socialLinks: [] };
}
