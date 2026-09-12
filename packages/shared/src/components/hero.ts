import { z } from 'zod';
import { assetUrlSchema, linkSchema } from '../urls';

/**
 * `hero` — the first component built out.
 * SPEC.md § Specified Component Schemas.
 */

export const heroVariants = ['centred', 'split-left', 'split-right', 'background'] as const;
export type HeroVariant = (typeof heroVariants)[number];

export const heroPropsSchema = z.object({
  variant: z.enum(heroVariants),
  headline: z.string().min(1).max(120),
  subheadline: z.string().max(240).nullable().default(null),
  ctaText: z.string().max(40).nullable().default(null),
  ctaLink: linkSchema.nullable().default(null),
  imageUrl: assetUrlSchema.nullable().default(null),
});

export type HeroProps = z.infer<typeof heroPropsSchema>;

export const heroDefaultProps: HeroProps = {
  variant: 'centred',
  headline: 'Your headline here',
  subheadline: 'A short line about what your business does.',
  ctaText: null,
  ctaLink: null,
  imageUrl: null,
};
