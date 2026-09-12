import { z } from 'zod';
import { assetUrlSchema } from './urls';

/**
 * Shared section settings, present on every block regardless of type.
 * SPEC.md § Component Library — "Section settings".
 *
 * Validated strictly on every block, always, unlike `props` which is gated
 * on the component's registry status.
 */

export const sectionBackgrounds = ['none', 'muted', 'accent', 'dark', 'image'] as const;
export const sectionPaddings = ['sm', 'md', 'lg'] as const;
export const sectionWidths = ['contained', 'wide', 'full'] as const;

export type SectionBackground = (typeof sectionBackgrounds)[number];
export type SectionPadding = (typeof sectionPaddings)[number];
export type SectionWidth = (typeof sectionWidths)[number];

export const anchorIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,39}$/, {
    message: 'Must be lowercase alphanumeric with hyphens, starting with a letter or digit',
  });

export const sectionSettingsSchema = z
  .object({
    background: z.enum(sectionBackgrounds).default('none'),
    backgroundImageUrl: assetUrlSchema.nullable().default(null),
    overlayOpacity: z.number().int().min(0).max(80).default(0),
    padding: z.enum(sectionPaddings).default('md'),
    width: z.enum(sectionWidths).default('contained'),
    anchorId: anchorIdSchema.nullable().default(null),
    hidden: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.background === 'image' && !value.backgroundImageUrl) {
      ctx.addIssue({
        code: 'custom',
        path: ['backgroundImageUrl'],
        message: 'Required when background is "image"',
      });
    }
  });

export type SectionSettings = z.infer<typeof sectionSettingsSchema>;

export const defaultSectionSettings: SectionSettings = {
  background: 'none',
  backgroundImageUrl: null,
  overlayOpacity: 0,
  padding: 'md',
  width: 'contained',
  anchorId: null,
  hidden: false,
};

export function makeSection(overrides: Partial<SectionSettings> = {}): SectionSettings {
  return { ...defaultSectionSettings, ...overrides };
}
