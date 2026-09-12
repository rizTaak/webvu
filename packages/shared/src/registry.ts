import type { z } from 'zod';
import { makeSection, type SectionSettings } from './section';
import { heroDefaultProps, heroPropsSchema } from './components/hero';
import type { PageKey } from './pages';

/**
 * The component catalogue — the single source of truth for what exists.
 * SPEC.md § Component Library and § Component Registry.
 *
 * This module holds metadata and schemas only. Mapping a type to a React
 * component happens in the UI, so the API can import this without pulling in
 * a rendering framework.
 *
 * `status` is the validation gate: `section` is validated strictly on every
 * block always, while `props` is validated strictly only for `implemented`
 * components. Promoting a component turns on its validation with no change
 * to the validation code.
 */

export const componentCategories = [
  'headers',
  'content',
  'proof',
  'explain',
  'commerce',
  'action',
  'layout',
] as const;

export type ComponentCategory = (typeof componentCategories)[number];

export type ComponentStatus = 'placeholder' | 'implemented';

export interface ComponentEntry {
  readonly label: string;
  readonly category: ComponentCategory;
  readonly status: ComponentStatus;
  /** Present only when status is 'implemented'. */
  readonly propsSchema: z.ZodType | null;
  readonly defaultProps: Record<string, unknown>;
  readonly defaultSection: Partial<SectionSettings>;
  readonly recommendedPages: readonly PageKey[];
  /** Approximate rendered height, used to size the placeholder plausibly. */
  readonly placeholderHeight: 'sm' | 'md' | 'lg';
}

function placeholder(
  label: string,
  category: ComponentCategory,
  recommendedPages: readonly PageKey[],
  options: {
    defaultSection?: Partial<SectionSettings>;
    placeholderHeight?: 'sm' | 'md' | 'lg';
  } = {},
): ComponentEntry {
  return {
    label,
    category,
    status: 'placeholder',
    propsSchema: null,
    defaultProps: {},
    defaultSection: options.defaultSection ?? {},
    recommendedPages,
    placeholderHeight: options.placeholderHeight ?? 'md',
  };
}

export const REGISTRY = {
  // --- Headers ------------------------------------------------------------
  hero: {
    label: 'Hero',
    category: 'headers',
    status: 'implemented',
    propsSchema: heroPropsSchema,
    defaultProps: heroDefaultProps as unknown as Record<string, unknown>,
    defaultSection: { width: 'full', padding: 'lg' },
    recommendedPages: ['home'],
    placeholderHeight: 'lg',
  },
  'page-header': placeholder('Page Header', 'headers', [
    'about',
    'products',
    'services',
    'contact',
    'order',
  ], { placeholderHeight: 'sm' }),

  // --- Content ------------------------------------------------------------
  'rich-text': placeholder('Text', 'content', ['about', 'order']),
  'media-text': placeholder('Media & Text', 'content', ['home', 'about', 'products']),
  image: placeholder('Image', 'content', []),
  gallery: placeholder('Gallery', 'content', ['about']),
  video: placeholder('Video', 'content', []),

  // --- Proof --------------------------------------------------------------
  'feature-grid': placeholder('Features', 'proof', ['home', 'services']),
  stats: placeholder('Stats', 'proof', ['home', 'about'], { placeholderHeight: 'sm' }),
  testimonials: placeholder('Testimonials', 'proof', ['home', 'about', 'services']),
  'logo-strip': placeholder('Logos', 'proof', ['home'], { placeholderHeight: 'sm' }),

  // --- Explain ------------------------------------------------------------
  steps: placeholder('How It Works', 'explain', ['services', 'order']),
  faq: placeholder('FAQ', 'explain', ['home', 'products', 'services', 'contact']),
  'team-grid': placeholder('Team', 'explain', ['about']),

  // --- Commerce -----------------------------------------------------------
  'product-grid': placeholder('Products', 'commerce', ['home', 'products', 'order']),
  'product-spotlight': placeholder('Featured Product', 'commerce', ['products']),
  'services-list': placeholder('Services', 'commerce', ['home', 'services']),
  'pricing-tiers': placeholder('Pricing', 'commerce', ['services']),

  // --- Action -------------------------------------------------------------
  'cta-banner': placeholder(
    'Call to Action',
    'action',
    ['home', 'about', 'products', 'services'],
    { defaultSection: { background: 'accent', width: 'full' }, placeholderHeight: 'sm' },
  ),
  'contact-form': placeholder('Contact Form', 'action', ['contact']),
  'order-form': placeholder('Order Form', 'action', ['order'], { placeholderHeight: 'lg' }),
  'contact-details': placeholder('Contact Details', 'action', ['contact', 'order']),
  map: placeholder('Map', 'action', ['contact']),

  // --- Layout -------------------------------------------------------------
  'spacer-divider': placeholder('Spacer', 'layout', [], { placeholderHeight: 'sm' }),
} as const satisfies Record<string, ComponentEntry>;

export type BlockType = keyof typeof REGISTRY;

export const blockTypes = Object.keys(REGISTRY) as BlockType[];

export function isBlockType(value: string): value is BlockType {
  return Object.prototype.hasOwnProperty.call(REGISTRY, value);
}

export function getComponent(type: BlockType): ComponentEntry {
  return REGISTRY[type];
}

/** Catalogue entries a page's picker surfaces first. */
export function recommendedFor(page: PageKey): BlockType[] {
  return blockTypes.filter((type) =>
    // `as const` narrows each entry to its own literal tuple, so widen to read.
    (REGISTRY[type].recommendedPages as readonly PageKey[]).includes(page),
  );
}

/** The default section a newly inserted block of this type carries. */
export function defaultSectionFor(type: BlockType): SectionSettings {
  return makeSection(REGISTRY[type].defaultSection);
}
