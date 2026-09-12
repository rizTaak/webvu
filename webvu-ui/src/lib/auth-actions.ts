'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Session cookies are issued **here**, on the dashboard host, not by the API.
 *
 * SPEC.md § Authentication step 3 and § Domains & Session Model: a cookie set
 * by `api.webvu.io` would be scoped to that host and never sent to the
 * dashboard. Setting it here makes it host-only on `dashboard.webvu.io`,
 * which is also what keeps it unreadable from `<slug>.webvu.io`.
 *
 * `domain` is deliberately never passed to `cookies().set()`.
 */

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const SECURE = process.env.COOKIE_SECURE === 'true';

const ACCESS_COOKIE = 'wv_at';
const REFRESH_COOKIE = 'wv_rt';
const REFRESH_PATH = '/auth';

interface IssuedTokens {
  accessToken: string;
  accessMaxAgeMs: number;
  refreshToken: string;
  refreshMaxAgeMs: number;
}

async function storeSession(tokens: IssuedTokens): Promise<void> {
  const jar = await cookies();

  jar.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(tokens.accessMaxAgeMs / 1000),
  });

  jar.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: REFRESH_PATH,
    maxAge: Math.floor(tokens.refreshMaxAgeMs / 1000),
  });
}

/** Local sign-in as a seeded user. Dev stub only — see SPEC.md § Drivers. */
export async function signInAsDevUser(formData: FormData): Promise<void> {
  const userId = formData.get('userId');
  if (typeof userId !== 'string') throw new Error('userId is required');

  const response = await fetch(`${API_URL}/api/auth/dev/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`Sign-in failed: ${response.status}`);

  const { tokens } = (await response.json()) as { tokens: IssuedTokens };
  await storeSession(tokens);

  redirect('/dashboard');
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;

  // Revoke server-side so the refresh family dies, not just the browser copy.
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { cookie: `${REFRESH_COOKIE}=${refreshToken}` },
        cache: 'no-store',
      });
    } catch {
      // Even if revocation fails, still clear the browser's copy below.
    }
  }

  jar.delete({ name: ACCESS_COOKIE, path: '/' });
  jar.delete({ name: REFRESH_COOKIE, path: REFRESH_PATH });

  redirect('/auth/signin');
}
