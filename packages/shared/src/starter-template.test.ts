import { describe, expect, it } from 'vitest';
import {
  STARTER_PRODUCT_GRID_BLOCK_ID,
  createStarterFooter,
  createStarterHeader,
  createStarterPages,
} from './starter-template';
import { defaultTheme } from './theme';
import { websiteSnapshotSchema } from './website';
import { isBlockType } from './registry';
import { pageKeys } from './pages';

describe('the starter template', () => {
  const pages = createStarterPages();

  it('produces a snapshot that passes full validation', () => {
    const result = websiteSnapshotSchema.safeParse({
      slug: 'beardbaker',
      name: 'Beard Baker',
      theme: defaultTheme,
      header: createStarterHeader('Beard Baker'),
      footer: createStarterFooter(),
      pages,
    });
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('covers all six pages exactly once', () => {
    expect(pages.map((p) => p.key).sort()).toEqual([...pageKeys].sort());
  });

  it('enables everything except the order page', () => {
    const disabled = pages.filter((p) => !p.enabled).map((p) => p.key);
    expect(disabled).toEqual(['order']);
  });

  it('references only real catalogue components', () => {
    for (const page of pages) {
      for (const b of page.blocks) {
        expect(isBlockType(b.type), `${b.type} is not in the registry`).toBe(true);
      }
    }
  });

  it('gives every block an id unique within its page', () => {
    for (const page of pages) {
      const ids = page.blocks.map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('is deterministic, so seeding twice produces the same ids', () => {
    const again = createStarterPages();
    expect(JSON.stringify(again)).toBe(JSON.stringify(pages));
  });

  it("points the order form at the products page's grid", () => {
    const productsGrid = pages
      .find((p) => p.key === 'products')
      ?.blocks.find((b) => b.type === 'product-grid');
    expect(productsGrid?.id).toBe(STARTER_PRODUCT_GRID_BLOCK_ID);

    const orderForm = pages
      .find((p) => p.key === 'order')
      ?.blocks.find((b) => b.type === 'order-form');
    expect(orderForm?.props.sourceBlockId).toBe(STARTER_PRODUCT_GRID_BLOCK_ID);
  });

  it('alternates section backgrounds so a fresh site is not a flat column', () => {
    const home = pages.find((p) => p.key === 'home');
    const backgrounds = home?.blocks.map((b) => b.section.background) ?? [];
    expect(new Set(backgrounds).size).toBeGreaterThan(1);
  });
});
