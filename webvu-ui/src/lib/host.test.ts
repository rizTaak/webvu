import { describe, expect, it } from 'vitest';
import { resolveHost } from './host';

const BASE = 'webvu.localhost';

describe('resolveHost', () => {
  it('resolves the apex to the product page', () => {
    expect(resolveHost(BASE, BASE)).toEqual({ kind: 'product' });
  });

  it('resolves a slug subdomain to a website', () => {
    expect(resolveHost('beardbaker.webvu.localhost', BASE)).toEqual({
      kind: 'site',
      slug: 'beardbaker',
    });
  });

  it('ignores the port', () => {
    expect(resolveHost('beardbaker.webvu.localhost:3001', BASE)).toEqual({
      kind: 'site',
      slug: 'beardbaker',
    });
  });

  it('lowercases the host', () => {
    expect(resolveHost('BeardBaker.WEBVU.localhost', BASE)).toEqual({
      kind: 'site',
      slug: 'beardbaker',
    });
  });

  it('resolves the Webvu surfaces', () => {
    expect(resolveHost('dashboard.webvu.localhost', BASE)).toEqual({ kind: 'dashboard' });
    expect(resolveHost('admin.webvu.localhost', BASE)).toEqual({ kind: 'admin' });
  });

  /**
   * The reason the reserved list exists: without it these would resolve as
   * user websites and shadow real Webvu hosts.
   */
  it.each(['www', 'api', 'cdn', 'mail', 'billing', 'support', 'login'])(
    'never treats the reserved label %s as a slug',
    (label) => {
      expect(resolveHost(`${label}.${BASE}`, BASE).kind).toBe('unknown');
    },
  );

  it('rejects a multi-label subdomain, which no wildcard certificate covers', () => {
    expect(resolveHost('a.b.webvu.localhost', BASE).kind).toBe('unknown');
  });

  it('rejects a host on a different domain', () => {
    expect(resolveHost('beardbaker.example.com', BASE).kind).toBe('unknown');
    // A domain that merely ends with the base string but is not a subdomain.
    expect(resolveHost('notwebvu.localhost', BASE).kind).toBe('unknown');
  });

  it('rejects labels that are not valid slugs', () => {
    expect(resolveHost('ab.webvu.localhost', BASE).kind).toBe('unknown'); // too short
    expect(resolveHost('-lead.webvu.localhost', BASE).kind).toBe('unknown');
    expect(resolveHost('double--hyphen.webvu.localhost', BASE).kind).toBe('unknown');
  });

  it('handles a missing Host header', () => {
    expect(resolveHost(null, BASE).kind).toBe('unknown');
  });

  it('works against the production domain too', () => {
    expect(resolveHost('beardbaker.webvu.io', 'webvu.io')).toEqual({
      kind: 'site',
      slug: 'beardbaker',
    });
    expect(resolveHost('webvu.io', 'webvu.io')).toEqual({ kind: 'product' });
  });
});
