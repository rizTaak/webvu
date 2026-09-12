import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOut } from '../../lib/auth-actions';
import { getSession } from '../../lib/session';

/**
 * dashboard.webvu.io. SPEC.md § dashboard.webvu.io — Builder Dashboard.
 *
 * Auth is resolved server-side during render, so a signed-out visitor is
 * redirected before any dashboard chrome is sent — no flash of a shell that
 * then disappears.
 */
export const metadata: Metadata = {
  title: 'Dashboard — Webvu',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/auth/signin');

  return (
    <div className="flex min-h-screen flex-col bg-surface text-text">
      <header className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <span className="font-semibold">Webvu</span>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-muted">{session.email}</span>
            {session.role !== 'user' && (
              <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-text-muted">
                {session.role}
              </span>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-border px-3 py-1.5 transition-colors hover:bg-surface-sunken"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
