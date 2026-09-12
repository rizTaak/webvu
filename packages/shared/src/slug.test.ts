import { describe, expect, it } from 'vitest';
import { RESERVED_SLUGS, checkSlug, isValidSlug } from './slug';

describe('checkSlug', () => {
  it('accepts ordinary slugs', () => {
    for (const slug of ['beardbaker', 'a1b', 'my-shop', 'shop-2026']) {
      expect(checkSlug(slug)).toEqual({ valid: true });
    }
  });

  it('enforces length bounds', () => {
    expect(checkSlug('ab').reason).toBe('too-short');
    expect(checkSlug('a'.repeat(31)).reason).toBe('too-long');
    expect(isValidSlug('abc')).toBe(true);
    expect(isValidSlug('a'.repeat(30))).toBe(true);
  });

  it('rejects slugs that do not start and end alphanumerically', () => {
    expect(checkSlug('-shop').reason).toBe('invalid');
    expect(checkSlug('shop-').reason).toBe('invalid');
  });

  it('rejects consecutive hyphens', () => {
    expect(checkSlug('my--shop').reason).toBe('invalid');
  });

  it('rejects uppercase, spaces and dots', () => {
    // Input is lowercased first, so uppercase is accepted by normalisation;
    // characters outside the pattern are not.
    expect(checkSlug('my shop').reason).toBe('invalid');
    expect(checkSlug('my.shop').reason).toBe('invalid');
    expect(checkSlug('my_shop').reason).toBe('invalid');
  });

  it('compares reserved slugs case-insensitively', () => {
    expect(checkSlug('ADMIN').reason).toBe('reserved');
  });
});

describe('reserved slug list', () => {
  /**
   * SPEC.md § Slug Rules requires a test asserting every DNS label Webvu
   * itself uses is reserved. Without this a user could claim a slug that
   * shadows a real Webvu subdomain.
   */
  const webvuHosts = [
    'www',
    'api',
    'dashboard',
    'admin',
    'cdn',
    'mail',
    'ns1',
    'ns2',
    'mx',
    'dmarc',
    'autodiscover',
    'staging',
  ];

  it.each(webvuHosts)('refuses to issue the %s label', (host) => {
    expect(RESERVED_SLUGS.has(host)).toBe(true);
    expect(checkSlug(host).valid).toBe(false);
  });

  it('rejects every reserved entry', () => {
    for (const slug of RESERVED_SLUGS) {
      expect(checkSlug(slug).valid, `${slug} must not be claimable`).toBe(false);
    }
  });

  it('reports "reserved" for entries a user could actually type', () => {
    /**
     * Some entries are unreachable by another rule first — `mx` is shorter
     * than the 3-character minimum, `_domainkey` contains an underscore — and
     * those report the more useful reason. Entries that pass format and length
     * must report "reserved", otherwise the list is not what is stopping them.
     */
    for (const slug of RESERVED_SLUGS) {
      const check = checkSlug(slug);
      if (check.reason === 'too-short' || check.reason === 'invalid') continue;
      expect(check.reason, `${slug} should be rejected as reserved`).toBe('reserved');
    }
  });
});
