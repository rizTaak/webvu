import type { HeroProps } from '@webvu/shared';

/**
 * `hero` — the first component built out. SPEC.md § Specified Component Schemas.
 *
 * Layout alternatives are a `variant` prop, never separate catalogue entries.
 * Background and padding come from SectionWrapper, so nothing here sets them.
 */
export function HeroBlock({ props }: { props: HeroProps }) {
  const { variant, headline, subheadline, ctaText, ctaLink, imageUrl } = props;
  const isSplit = variant === 'split-left' || variant === 'split-right';

  const copy = (
    <div className={isSplit ? 'flex-1' : 'mx-auto max-w-2xl'}>
      <h1
        className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl"
        style={{ fontFamily: 'var(--site-font)' }}
      >
        {headline}
      </h1>
      {subheadline && (
        <p className="mt-4 text-lg opacity-80 text-pretty">{subheadline}</p>
      )}
      {ctaText && ctaLink && (
        <a
          href={ctaLink}
          className="mt-8 inline-flex items-center justify-center px-6 py-3 text-sm font-medium transition-colors"
          style={{
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            borderRadius: 'var(--radius)',
          }}
        >
          {ctaText}
        </a>
      )}
    </div>
  );

  if (!isSplit) {
    return (
      <div className={variant === 'centred' ? 'text-center' : ''}>
        {copy}
        {imageUrl && variant === 'centred' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="mx-auto mt-12 w-full max-w-3xl object-cover"
            style={{ borderRadius: 'var(--radius)' }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`mx-auto flex max-w-5xl flex-col items-center gap-10 md:flex-row ${
        variant === 'split-right' ? 'md:flex-row-reverse' : ''
      }`}
    >
      {copy}
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="w-full flex-1 object-cover"
          style={{ borderRadius: 'var(--radius)' }}
        />
      )}
    </div>
  );
}
