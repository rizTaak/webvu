import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signInAsDevUser } from '../../../lib/auth-actions';
import { getSession } from '../../../lib/session';

/**
 * Local sign-in screen. SPEC.md § Local Development — "Auth".
 *
 * Stands in for Google, which cannot be used locally: it refuses to register
 * an http:// redirect URI for any host other than localhost. Selecting a user
 * mints exactly the session the real flow would, so cookies, guards, rotation
 * and role routing are all genuinely exercised.
 *
 * When the Google provider lands this page gains a "Sign in with Google"
 * button and this list stays behind the dev driver.
 */

export const metadata: Metadata = {
  title: 'Sign in — Webvu',
  robots: { index: false, follow: false },
};

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

interface DevUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

async function loadDevUsers(): Promise<DevUser[]> {
  try {
    const response = await fetch(`${API_URL}/api/auth/dev/users`, { cache: 'no-store' });
    if (!response.ok) return [];
    return (await response.json()) as DevUser[];
  } catch {
    return [];
  }
}

export default async function SignInPage() {
  if (await getSession()) redirect('/dashboard');

  const users = await loadDevUsers();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-widest text-text-subtle uppercase">
        Webvu
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-text">Sign in</h1>
      <p className="mt-2 text-sm text-text-muted">
        Local development sign-in. Choose a seeded account.
      </p>

      {users.length === 0 ? (
        <div className="mt-8 rounded-md border border-border bg-surface-raised p-4 text-sm text-text-muted">
          No seeded users found. Run <code className="font-mono">npm run seed</code> in{' '}
          <code className="font-mono">webvu-api</code>, and check the API is running.
        </div>
      ) : (
        <ul className="mt-8 space-y-2">
          {users.map((user) => (
            <li key={user.id}>
              <form action={signInAsDevUser}>
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-md border border-border bg-surface-raised px-4 py-3 text-left transition-colors hover:border-border-strong hover:bg-surface-sunken"
                >
                  <span>
                    <span className="block text-sm font-medium text-text">
                      {user.displayName}
                    </span>
                    <span className="block text-xs text-text-subtle">{user.email}</span>
                  </span>
                  <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-text-muted">
                    {user.role}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
