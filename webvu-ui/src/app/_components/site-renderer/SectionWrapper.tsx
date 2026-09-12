import type { ReactNode } from 'react';
import type { SectionSettings } from '@webvu/shared';

/**
 * Applies the shared section settings to every block, including placeholders.
 * SPEC.md § Component Library — "Section settings".
 *
 * No component implements its own background or padding: this is the single
 * place those decisions are honoured, which is what makes a stack of blocks
 * read as one designed page.
 *
 * Colours resolve against the user's injected theme, so every option stays
 * on-brand for whoever owns the website.
 */

const PADDING: Record<SectionSettings['padding'], string> = {
  sm: 'py-8',
  md: 'py-14',
  lg: 'py-24',
};

const WIDTH: Record<SectionSettings['width'], string> = {
  contained: 'max-w-3xl',
  wide: 'max-w-6xl',
  full: 'max-w-none',
};

function backgroundStyle(section: SectionSettings): React.CSSProperties {
  switch (section.background) {
    case 'muted':
      return { background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' };
    case 'accent':
      return { background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' };
    case 'dark':
      return { background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' };
    case 'image':
      return {
        backgroundImage: section.backgroundImageUrl
          ? `url(${JSON.stringify(section.backgroundImageUrl)})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'hsl(var(--background))',
      };
    case 'none':
    default:
      return { background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' };
  }
}

export function SectionWrapper({
  section,
  children,
}: {
  section: SectionSettings;
  children: ReactNode;
}) {
  const isImage = section.background === 'image';

  return (
    <section
      id={section.anchorId ?? undefined}
      data-background={section.background}
      className="relative w-full"
      style={backgroundStyle(section)}
    >
      {/* Keeps text legible over a background image. */}
      {isImage && section.overlayOpacity > 0 && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `rgb(0 0 0 / ${section.overlayOpacity}%)` }}
        />
      )}
      <div className={`relative mx-auto px-5 sm:px-8 ${PADDING[section.padding]} ${WIDTH[section.width]}`}>
        {children}
      </div>
    </section>
  );
}
