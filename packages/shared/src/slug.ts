/**
 * Slug rules and the reserved list. SPEC.md § Slug Rules.
 *
 * The reserved list exists because a slug becomes a DNS label under
 * webvu.io: without it a user could claim `www`, `api`, or `dashboard` and
 * shadow a real Webvu subdomain. The test alongside this module asserts that
 * every host Webvu itself uses is present here.
 */

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 30;

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'www', 'api', 'app', 'admin', 'dashboard', 'mail', 'smtp', 'imap', 'pop',
  'ftp', 'cdn', 'assets', 'static', 'media', 'img', 'images', 'files',
  'download', 'downloads', 'blog', 'docs', 'help', 'support', 'status',
  'about', 'terms', 'privacy', 'legal', 'security', 'login', 'logout',
  'signup', 'signin', 'register', 'auth', 'oauth', 'account', 'accounts',
  'billing', 'pay', 'payments', 'checkout', 'stripe', 'webhook', 'webhooks',
  'test', 'staging', 'dev', 'demo', 'preview', 'beta', 'alpha', 'internal',
  'system', 'root', 'webvu', 'ns1', 'ns2', 'mx', 'email', 'autodiscover',
  '_domainkey', 'dmarc', 'analytics', 'metrics', 'monitor',
  // Backs the static /sites/unavailable route the proxy sends unknown hosts to.
  'unavailable',
]);

export type SlugRejection = 'too-short' | 'too-long' | 'invalid' | 'reserved';

export interface SlugCheck {
  valid: boolean;
  reason?: SlugRejection;
}

export function checkSlug(input: string): SlugCheck {
  const slug = input.toLowerCase();

  if (slug.length < SLUG_MIN_LENGTH) return { valid: false, reason: 'too-short' };
  if (slug.length > SLUG_MAX_LENGTH) return { valid: false, reason: 'too-long' };
  if (!SLUG_PATTERN.test(slug)) return { valid: false, reason: 'invalid' };
  if (slug.includes('--')) return { valid: false, reason: 'invalid' };
  if (RESERVED_SLUGS.has(slug)) return { valid: false, reason: 'reserved' };

  return { valid: true };
}

export function isValidSlug(input: string): boolean {
  return checkSlug(input).valid;
}

export function isReservedSlug(input: string): boolean {
  return RESERVED_SLUGS.has(input.toLowerCase());
}
