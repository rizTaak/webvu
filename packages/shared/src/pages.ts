import { z } from 'zod';
import { assetUrlSchema } from './urls';

/**
 * The six fixed pages. Pages cannot be created or deleted, only enabled or
 * disabled and reordered. SPEC.md § Website JSON Structure — "Page object rules".
 */

export const pageKeys = ['home', 'about', 'products', 'services', 'contact', 'order'] as const;

export type PageKey = (typeof pageKeys)[number];

export const pagePaths: Record<PageKey, string> = {
  home: '/',
  about: '/about',
  products: '/products',
  services: '/services',
  contact: '/contact',
  order: '/order',
};

export const pageDefaultTitles: Record<PageKey, string> = {
  home: 'Home',
  about: 'About',
  products: 'Products',
  services: 'Services',
  contact: 'Contact',
  order: 'Order',
};

export function pageKeyForPath(path: string): PageKey | null {
  const normalised = path === '' ? '/' : path;
  const entry = (Object.keys(pagePaths) as PageKey[]).find(
    (key) => pagePaths[key] === normalised,
  );
  return entry ?? null;
}

export const pageSeoSchema = z.object({
  metaTitle: z.string().max(60).nullable().default(null),
  metaDescription: z.string().max(160).nullable().default(null),
  ogImageUrl: assetUrlSchema.nullable().default(null),
});

export type PageSeo = z.infer<typeof pageSeoSchema>;
