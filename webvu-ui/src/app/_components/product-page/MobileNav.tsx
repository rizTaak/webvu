'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { DASHBOARD_URL, NAV_LINKS } from './content';

/**
 * Header nav + CTAs collapsed into a drawer below `md`. Client-only because
 * an in-drawer anchor click (`href="#features"`) doesn't trigger Base UI
 * Dialog's outside-click-to-close — closing on click has to be done by hand.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />
        }
      >
        <Menu />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Webvu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-text hover:bg-action-subtle"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <a
            href={DASHBOARD_URL}
            onClick={() => setOpen(false)}
            className={buttonVariants({ variant: 'outline' })}
          >
            Login
          </a>
          <a
            href={DASHBOARD_URL}
            onClick={() => setOpen(false)}
            className={buttonVariants()}
          >
            Start Creating
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
