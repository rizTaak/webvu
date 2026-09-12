import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { DASHBOARD_URL, NAV_LINKS } from './content';
import { MobileNav } from './MobileNav';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold text-text">
          Webvu
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text-muted transition-colors hover:text-text"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a href={DASHBOARD_URL} className={buttonVariants({ variant: 'outline' })}>
            Login
          </a>
          <a href={DASHBOARD_URL} className={buttonVariants()}>
            Start Creating
          </a>
        </div>

        <MobileNav />
      </div>
    </header>
  );
}
