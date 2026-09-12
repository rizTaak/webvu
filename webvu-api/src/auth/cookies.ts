import type { CookieOptions, Response } from 'express';

/**
 * Session cookie attributes, decided in exactly one place.
 *
 * SPEC.md § Domains & Session Model, rule 1: no cookie is ever scoped to the
 * parent domain. Omitting `Domain` makes a cookie host-only, so one set on
 * `dashboard.webvu.io` is unreadable from `<slug>.webvu.io` — which matters
 * because users control the content served there.
 *
 * If you are tempted to add `domain:` to share a session across subdomains,
 * that is the exact change this file exists to prevent.
 */

export const ACCESS_COOKIE = 'wv_at';
export const REFRESH_COOKIE = 'wv_rt';

/** The refresh cookie is only ever sent to the refresh and logout routes. */
export const REFRESH_COOKIE_PATH = '/api/auth';

export interface CookieConfig {
  /** False for local http, where a Secure cookie would never be stored. */
  secure: boolean;
}

function baseOptions(config: CookieConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.secure,
    sameSite: 'lax',
    // `domain` is deliberately absent — see the note above.
  };
}

export function accessCookieOptions(
  config: CookieConfig,
  maxAgeMs: number,
): CookieOptions {
  return { ...baseOptions(config), path: '/', maxAge: maxAgeMs };
}

export function refreshCookieOptions(
  config: CookieConfig,
  maxAgeMs: number,
): CookieOptions {
  return { ...baseOptions(config), path: REFRESH_COOKIE_PATH, maxAge: maxAgeMs };
}

export function setSessionCookies(
  res: Response,
  config: CookieConfig,
  tokens: { accessToken: string; accessMaxAgeMs: number; refreshToken: string; refreshMaxAgeMs: number },
): void {
  res.cookie(
    ACCESS_COOKIE,
    tokens.accessToken,
    accessCookieOptions(config, tokens.accessMaxAgeMs),
  );
  res.cookie(
    REFRESH_COOKIE,
    tokens.refreshToken,
    refreshCookieOptions(config, tokens.refreshMaxAgeMs),
  );
}

export function clearSessionCookies(res: Response, config: CookieConfig): void {
  // Clearing must repeat path and the other attributes, or the browser keeps
  // the original cookie alongside the cleared one.
  res.clearCookie(ACCESS_COOKIE, accessCookieOptions(config, 0));
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions(config, 0));
}
