import { z } from 'zod';
import { blocksSchema, type Block } from './blocks';
import { pageDefaultTitles, pageKeys, pagePaths, pageSeoSchema, type PageKey } from './pages';
import { themeSchema, type Theme } from './theme';
import { assetUrlSchema, isValidSocialUrl, socialPlatforms } from './urls';

/** Header, footer, pages — the parts of a website a user edits. */

export const headerSchema = z
  .object({
    logoUrl: assetUrlSchema.nullable().default(null),
    businessName: z.string().min(1).max(60),
  })
  .strict();

export type Header = z.infer<typeof headerSchema>;

export const socialLinkSchema = z
  .object({
    platform: z.enum(socialPlatforms),
    url: z.string().max(2048),
  })
  .strict()
  .superRefine((link, ctx) => {
    if (!isValidSocialUrl(link.platform, link.url)) {
      ctx.addIssue({
        code: 'custom',
        path: ['url'],
        message: `Must be an https:// URL on a known ${link.platform} host`,
      });
    }
  });

export const footerSchema = z
  .object({
    socialLinks: z.array(socialLinkSchema).max(socialPlatforms.length).default([]),
  })
  .strict();

export type Footer = z.infer<typeof footerSchema>;

export const pageSchema = z
  .object({
    key: z.enum(pageKeys),
    path: z.string(),
    title: z.string().min(1).max(40),
    enabled: z.boolean(),
    seo: pageSeoSchema,
    blocks: blocksSchema,
  })
  .strict()
  .superRefine((page, ctx) => {
    if (page.path !== pagePaths[page.key]) {
      ctx.addIssue({
        code: 'custom',
        path: ['path'],
        message: `Path for "${page.key}" must be "${pagePaths[page.key]}"`,
      });
    }
  });

export interface Page {
  key: PageKey;
  path: string;
  title: string;
  enabled: boolean;
  seo: z.infer<typeof pageSeoSchema>;
  blocks: Block[];
}

export const pagesSchema = z
  .array(pageSchema)
  .length(pageKeys.length)
  .superRefine((pages, ctx) => {
    const seen = new Set<string>();
    pages.forEach((page, index) => {
      if (seen.has(page.key)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: `Duplicate page "${page.key}"`,
        });
      }
      seen.add(page.key);
    });

    for (const key of pageKeys) {
      if (!seen.has(key)) {
        ctx.addIssue({ code: 'custom', message: `Missing page "${key}"` });
      }
    }

    // The home page cannot be disabled. SPEC.md § Website JSON Structure.
    const home = pages.find((page) => page.key === 'home');
    if (home && !home.enabled) {
      ctx.addIssue({
        code: 'custom',
        path: [pages.indexOf(home), 'enabled'],
        message: 'The home page cannot be disabled',
      });
    }
  });

/** The full snapshot the renderer consumes. */
export const websiteSnapshotSchema = z.object({
  slug: z.string(),
  name: z.string().min(1).max(60),
  theme: themeSchema,
  header: headerSchema,
  footer: footerSchema,
  pages: pagesSchema,
});

export interface WebsiteSnapshot {
  slug: string;
  name: string;
  theme: Theme;
  header: Header;
  footer: Footer;
  pages: Page[];
}

/** Enabled pages in navigation order, which is the stored page order. */
export function navigationPages(snapshot: WebsiteSnapshot): Page[] {
  return snapshot.pages.filter((page) => page.enabled);
}

export function findPageByPath(snapshot: WebsiteSnapshot, path: string): Page | null {
  const normalised = path === '' ? '/' : path;
  return snapshot.pages.find((page) => page.path === normalised) ?? null;
}

/** Blocks a visitor actually sees: hidden blocks are excluded from live renders. */
export function visibleBlocks(page: Page): Block[] {
  return page.blocks.filter((block) => !block.section.hidden);
}

export function defaultTitleFor(key: PageKey): string {
  return pageDefaultTitles[key];
}
