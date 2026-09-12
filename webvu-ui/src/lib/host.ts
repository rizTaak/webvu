import { RESERVED_SLUGS, isValidSlug } from '@webvu/shared';

/**
 * Resolves a slug from the Host header. SPEC.md § Routing.
 *
 * Only the leftmost label is considered, and reserved labels are never
 * treated as slugs — that is what stops `dashboard.webvu.io` being read as a
 * user website. Kept as a pure function so it is unit-testable without a
 * request object.
 */

export type HostResolution =
  | { kind: 'product' }
  | { kind: 'dashboard' }
  | { kind: 'admin' }
  | { kind: 'site'; slug: string }
  | { kind: 'unknown' };

const SURFACE_LABELS: Record<string, HostResolution['kind']> = {
  dashboard: 'dashboard',
  admin: 'admin',
};

export function resolveHost(hostHeader: string | null, baseDomain: string): HostResolution {
  if (!hostHeader) return { kind: 'unknown' };

  // Strip the port, and any IPv6 brackets.
  const host = hostHeader.split(':')[0]!.toLowerCase().replace(/^\[|\]$/g, '');
  const base = baseDomain.toLowerCase();

  if (host === base) return { kind: 'product' };
  if (!host.endsWith(`.${base}`)) return { kind: 'unknown' };

  const label = host.slice(0, -(base.length + 1));

  // A slug is a single DNS label: the wildcard certificate does not cover
  // multi-label subdomains, so anything deeper is not a website.
  if (label.includes('.')) return { kind: 'unknown' };

  const surface = SURFACE_LABELS[label];
  if (surface) return { kind: surface } as HostResolution;

  if (RESERVED_SLUGS.has(label) || !isValidSlug(label)) return { kind: 'unknown' };

  return { kind: 'site', slug: label };
}
