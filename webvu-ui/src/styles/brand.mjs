/**
 * The Webvu brand. SPEC.md § Webvu Design System.
 *
 * THIS IS THE ONE FILE A REBRAND EDITS. `primitives.css` and `tokens.d.ts`
 * are generated from it by `npm run build:tokens`; neither is edited by hand.
 * Nothing else in the codebase repeats a colour literal.
 *
 * Plain JS rather than TS so the generator script can import it directly
 * without a compile step. Components never import this — they use the
 * semantic CSS variables it produces.
 *
 * Colour values are HSL triplets: "hue saturation% lightness%".
 */

/** Deep teal. Deliberately distinct from the default user theme (violet
 *  262 83% 58%) so a website preview never blends into the chrome. */
export const brand = {
  DEFAULT: '174 72% 26%',
  hover: '174 72% 21%',
  active: '174 72% 17%',
  subtle: '174 45% 94%',
  contrast: '0 0% 100%',
};

/** Amber. Used sparingly — emphasis, trial and billing notices. */
export const accent = {
  DEFAULT: '38 91% 55%',
  hover: '38 91% 48%',
  subtle: '38 92% 95%',
  contrast: '24 10% 10%',
};

/** Warm-tinted greys, so the product reads as friendly rather than corporate. */
export const neutral = {
  50: '60 9% 98%',
  100: '60 5% 96%',
  200: '20 6% 90%',
  300: '24 6% 83%',
  400: '24 5% 64%',
  500: '25 5% 45%',
  600: '33 5% 32%',
  700: '30 6% 25%',
  800: '12 6% 15%',
  900: '24 10% 10%',
};

export const status = {
  success: '142 71% 45%',
  'success-subtle': '142 76% 95%',
  warning: '32 95% 44%',
  'warning-subtle': '38 92% 95%',
  danger: '0 72% 51%',
  'danger-subtle': '0 86% 97%',
  info: '199 89% 48%',
  'info-subtle': '204 94% 94%',
};

export const radius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
};

export const space = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  12: '3rem',
  16: '4rem',
  24: '6rem',
};

export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
};

export const font = {
  sans: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  display: "'Inter', ui-sans-serif, system-ui, sans-serif",
};

export const shadow = {
  sm: '0 1px 2px 0 rgb(28 25 23 / 0.05)',
  md: '0 4px 6px -1px rgb(28 25 23 / 0.08), 0 2px 4px -2px rgb(28 25 23 / 0.05)',
  lg: '0 10px 15px -3px rgb(28 25 23 / 0.10), 0 4px 6px -4px rgb(28 25 23 / 0.05)',
};

export const motion = {
  'duration-fast': '120ms',
  'duration-base': '200ms',
  'duration-slow': '320ms',
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
};
