import type { WebsiteSnapshot } from '@webvu/shared';

/**
 * Server-side fetch of the live snapshot. SPEC.md § Data Flow.
 *
 * Goes direct to the API host rather than through the proxy, so rendering
 * does not depend on Caddy being up.
 */

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export type UnavailableReason = 'not-found' | 'unpublished' | 'unverified' | 'suspended';

export type SnapshotResult =
  | { available: true; snapshot: WebsiteSnapshot }
  | { available: false; reason: UnavailableReason }
  | { available: false; reason: 'error' };

export async function getLiveSnapshot(slug: string): Promise<SnapshotResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/websites/${encodeURIComponent(slug)}`, {
      // Tagged so publishing can invalidate exactly this website.
      next: { tags: [`website:${slug}`], revalidate: 300 },
    });
  } catch {
    // The API is unreachable. Never render a partial or unthemed page.
    return { available: false, reason: 'error' };
  }

  if (response.ok) {
    return { available: true, snapshot: (await response.json()) as WebsiteSnapshot };
  }

  if (response.status === 404) {
    const reason = (response.headers.get('x-webvu-reason') ?? 'not-found') as UnavailableReason;
    return { available: false, reason };
  }

  return { available: false, reason: 'error' };
}
