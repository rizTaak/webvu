import { z } from 'zod';

/**
 * A user's website theme. SPEC.md § Per-User Theming.
 *
 * Colour values are HSL triplets without the hsl() wrapper, as Shadcn
 * expects. Every field is required; unknown keys are rejected so a theme
 * cannot accumulate dead fields.
 */

const hslTriple = z
  .string()
  .regex(/^\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%$/, {
    message: 'Must be an HSL triplet such as "262 83% 58%"',
  });

export const curatedFonts = [
  'Inter',
  'Poppins',
  'Lora',
  'Playfair Display',
  'Source Sans 3',
  'Merriweather',
  'DM Sans',
  'Space Grotesk',
] as const;

export type CuratedFont = (typeof curatedFonts)[number];

export const themeSchema = z
  .object({
    background: hslTriple,
    foreground: hslTriple,
    primaryColor: hslTriple,
    accentColor: hslTriple,
    mutedColor: hslTriple,
    fontFamily: z.enum(curatedFonts),
    borderRadius: z
      .string()
      .regex(/^\d(\.\d+)?rem$/, { message: 'Must be a rem value such as "0.5rem"' }),
  })
  .strict();

export type Theme = z.infer<typeof themeSchema>;

/** The palette a newly created website starts with. */
export const defaultTheme: Theme = {
  background: '0 0% 100%',
  foreground: '222 47% 11%',
  primaryColor: '262 83% 58%',
  accentColor: '30 100% 50%',
  mutedColor: '210 40% 96%',
  fontFamily: 'Inter',
  borderRadius: '0.5rem',
};
