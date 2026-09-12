import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieConfig } from './cookies';

/**
 * Resolves cookie settings once, so no controller reads env directly.
 *
 * `Secure` is off for local http — a Secure cookie is never stored over a
 * plain connection, and the resulting failure looks like a bug in the auth
 * code rather than a transport problem. Everything else about the cookie is
 * identical to production, so the host-only isolation rule is still
 * exercised locally. SPEC.md § Hostnames and TLS.
 */
@Injectable()
export class CookieConfigService {
  constructor(private readonly configService: ConfigService) {}

  get config(): CookieConfig {
    return {
      secure: this.configService.get<string>('COOKIE_SECURE') === 'true',
    };
  }
}
