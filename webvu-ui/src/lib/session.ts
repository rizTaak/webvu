import { cookies } from 'next/headers';

/**
 * Server-side session lookup.
 *
 * The session lives in an HttpOnly cookie, so only the server can read it —
 * which means auth state is resolved during rendering rather than after a
 * client-side round trip, and a signed-out visitor never sees a flash of
 * dashboard chrome.
 */

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'user' | 'admin' | 'support';
  hasWebsite: boolean;
}

export interface OwnerWebsite {
  slug: string;
  name: string;
  currency: string;
  notificationEmail: string;
  notificationEmailVerified: boolean;
  publishedAt: string | null;
  unpublishedByUser: boolean;
  hasUnpublishedChanges: boolean;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  isPubliclyServed: boolean;
  draft: { pages: { key: string; title: string; enabled: boolean; blocks: unknown[] }[] };
}

/** Forward the browser's cookies to the API, which is a different origin. */
async function authedFetch(path: string): Promise<Response | null> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;

  try {
    return await fetch(`${API_URL}/api${path}`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const response = await authedFetch('/auth/me');
  if (!response?.ok) return null;
  return (await response.json()) as SessionUser;
}

/** Null when the user has no website yet — onboarding is still needed. */
export async function getOwnerWebsite(): Promise<OwnerWebsite | null> {
  const response = await authedFetch('/websites/me');
  if (!response?.ok) return null;
  return (await response.json()) as OwnerWebsite;
}
