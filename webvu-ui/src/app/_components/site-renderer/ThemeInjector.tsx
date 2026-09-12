import type { Theme } from '@webvu/shared';

/**
 * Injects the user's theme as CSS variables. SPEC.md § Per-User Theming.
 *
 * These are Shadcn's unprefixed names and are only ever set inside a rendered
 * website document — never in the dashboard document. That separation is what
 * stops a user's colours leaking into Webvu's own chrome, and is why the
 * editor preview is an iframe. Webvu's own tokens are `--wv-*` prefixed and
 * cannot collide with these.
 *
 * Derived tokens are computed here so the user never has to pick them.
 */
export function ThemeInjector({ theme }: { theme: Theme }) {
  const css = `
[data-webvu-site] {
  --background: ${theme.background};
  --foreground: ${theme.foreground};
  --primary: ${theme.primaryColor};
  --primary-foreground: ${readableOn(theme.primaryColor)};
  --accent: ${theme.accentColor};
  --accent-foreground: ${readableOn(theme.accentColor)};
  --muted: ${theme.mutedColor};
  --muted-foreground: ${mix(theme.foreground, 0.65)};
  --border: ${mix(theme.foreground, 0.88)};
  --ring: ${theme.primaryColor};
  --radius: ${theme.borderRadius};
  --site-font: ${cssFontStack(theme.fontFamily)};
}`.trim();

  return <style data-webvu-theme dangerouslySetInnerHTML={{ __html: css }} />;
}

/** Parse an "H S% L%" triplet. Returns null if it is not well formed. */
function parseHsl(triple: string): [number, number, number] | null {
  const match = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(triple.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Black or white, whichever reads on the given colour. Uses the HSL
 * lightness as a cheap stand-in for relative luminance, which is accurate
 * enough to choose between two extremes.
 */
function readableOn(triple: string): string {
  const parsed = parseHsl(triple);
  if (!parsed) return '0 0% 100%';
  return parsed[2] > 60 ? '0 0% 10%' : '0 0% 100%';
}

/** Lighten a colour towards its background, for muted text and borders. */
function mix(triple: string, towardsLight: number): string {
  const parsed = parseHsl(triple);
  if (!parsed) return triple;
  const [h, s, l] = parsed;
  const lightened = Math.round(l + (100 - l) * towardsLight);
  return `${h} ${Math.round(s * 0.6)}% ${lightened}%`;
}

/**
 * The curated fonts are self-hosted and bundled; no request is made to
 * fonts.googleapis.com at render time. SPEC.md § Per-User Theming.
 */
function cssFontStack(family: string): string {
  return `'${family}', ui-sans-serif, system-ui, sans-serif`;
}
