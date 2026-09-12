import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  accessCookieOptions,
  refreshCookieOptions,
} from './cookies';

/**
 * These assertions encode SPEC.md § Domains & Session Model, rule 1.
 *
 * Users control the content served on `<slug>.webvu.io`. A session cookie
 * scoped to `.webvu.io` would be readable from every customer website, so
 * "there is no Domain attribute" is a security property, not a style choice —
 * and it needs a test that fails loudly if someone adds one.
 */
describe('session cookies', () => {
  const config = { secure: true };

  it('never sets a Domain, so cookies stay host-only', () => {
    expect(accessCookieOptions(config, 1000)).not.toHaveProperty('domain');
    expect(refreshCookieOptions(config, 1000)).not.toHaveProperty('domain');
  });

  it('is HttpOnly, so an XSS cannot read the token', () => {
    expect(accessCookieOptions(config, 1000).httpOnly).toBe(true);
    expect(refreshCookieOptions(config, 1000).httpOnly).toBe(true);
  });

  it('is SameSite=Lax', () => {
    expect(accessCookieOptions(config, 1000).sameSite).toBe('lax');
    expect(refreshCookieOptions(config, 1000).sameSite).toBe('lax');
  });

  it('follows the Secure setting, which is off for local http', () => {
    expect(accessCookieOptions({ secure: true }, 1000).secure).toBe(true);
    expect(accessCookieOptions({ secure: false }, 1000).secure).toBe(false);
  });

  it('scopes the refresh cookie to the auth routes only', () => {
    // The refresh token is the long-lived credential; it should not be
    // attached to every request just to sit unused.
    expect(refreshCookieOptions(config, 1000).path).toBe(REFRESH_COOKIE_PATH);
    expect(accessCookieOptions(config, 1000).path).toBe('/');
  });

  it('uses distinct names', () => {
    expect(ACCESS_COOKIE).not.toBe(REFRESH_COOKIE);
  });
});
