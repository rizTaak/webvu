import type { ComponentEntry } from '@webvu/shared';

/**
 * Rendered for any component whose registry status is still `placeholder`.
 * SPEC.md § Placeholder Rendering.
 *
 * It renders inside the real SectionWrapper, so it already carries the
 * block's true background, padding and width. Its height is deliberately
 * plausible for the component it stands in for, so a page of placeholders
 * shows the page's real rhythm rather than a row of identical strips.
 *
 * A page of these is publishable: it looks unfinished, not broken, and it
 * exercises the whole draft -> publish -> render path before any component
 * has been designed.
 */

const HEIGHT: Record<ComponentEntry['placeholderHeight'], string> = {
  sm: 'min-h-24',
  md: 'min-h-48',
  lg: 'min-h-72',
};

export function PlaceholderBlock({
  entry,
  note,
}: {
  entry: ComponentEntry;
  note?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center ${HEIGHT[entry.placeholderHeight]}`}
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      <span className="text-sm font-medium tracking-wide uppercase opacity-70">
        {entry.label}
      </span>
      {note ? (
        <p className="max-w-prose text-sm opacity-60">{note}</p>
      ) : (
        <p className="text-xs opacity-50">Not yet available</p>
      )}
    </div>
  );
}
