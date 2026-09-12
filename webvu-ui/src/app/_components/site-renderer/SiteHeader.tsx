import type { Header, Page } from '@webvu/shared';

/**
 * Rendered from header config on every page. SPEC.md § Header & Footer Editor.
 *
 * Navigation is derived from the enabled pages in their stored order — there
 * is no manual navigation configuration.
 */
export function SiteHeader({
  header,
  pages,
  currentPath,
}: {
  header: Header;
  pages: Page[];
  currentPath: string;
}) {
  return (
    <header
      className="w-full border-b"
      style={{
        background: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        borderColor: 'hsl(var(--border))',
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <a href="/" className="flex items-center gap-3 font-semibold">
          {header.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={header.logoUrl} alt="" className="h-8 w-8 object-contain" />
          )}
          <span style={{ fontFamily: 'var(--site-font)' }}>{header.businessName}</span>
        </a>

        <nav aria-label="Pages">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {pages.map((page) => {
              const isCurrent = page.path === currentPath;
              return (
                <li key={page.key}>
                  <a
                    href={page.path}
                    aria-current={isCurrent ? 'page' : undefined}
                    className="transition-opacity hover:opacity-70"
                    style={{ opacity: isCurrent ? 1 : 0.75 }}
                  >
                    {page.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
