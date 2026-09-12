import { z } from 'zod';

/**
 * Asset and link validation.
 *
 * SPEC.md requires every `*Url` field to be an absolute https:// URL. Local
 * development serves assets from http://cdn.webvu.localhost, so http is
 * permitted for *.localhost hosts only — never for anything routable.
 */

export function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost');
}

export function isValidAbsoluteUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && isLocalhostHost(url.hostname);
}

export const absoluteUrlSchema = z
  .string()
  .max(2048)
  .refine(isValidAbsoluteUrl, {
    message: 'Must be an absolute https:// URL',
  });

/** An uploaded asset served from the CDN host. */
export const assetUrlSchema = absoluteUrlSchema;

/**
 * A CTA target: an internal page path, a same-page anchor, or an absolute URL.
 * Internal paths are checked against the six page paths at render time rather
 * than here, because this package has no view of which pages are enabled.
 */
export const linkSchema = z
  .string()
  .max(2048)
  .refine(
    (value) =>
      value.startsWith('/') || value.startsWith('#') || isValidAbsoluteUrl(value),
    { message: 'Must be an internal path, a #anchor, or an absolute https:// URL' },
  );

/** Known hosts per social platform, per SPEC.md § Website JSON Structure. */
export const socialPlatforms = [
  'instagram',
  'facebook',
  'x',
  'tiktok',
  'linkedin',
  'youtube',
] as const;

export type SocialPlatform = (typeof socialPlatforms)[number];

export const socialPlatformHosts: Record<SocialPlatform, readonly string[]> = {
  instagram: ['instagram.com', 'www.instagram.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'fb.com'],
  x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com'],
  linkedin: ['linkedin.com', 'www.linkedin.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'youtu.be'],
};

export function isValidSocialUrl(platform: SocialPlatform, value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  return socialPlatformHosts[platform].includes(url.hostname.toLowerCase());
}
