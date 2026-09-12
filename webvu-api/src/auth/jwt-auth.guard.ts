import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ACCESS_COOKIE } from './cookies';
import { TokenService, type AccessTokenPayload } from './token.service';

/** What a protected route can rely on being present. */
export interface RequestWithUser extends Request {
  user: AccessTokenPayload;
}

/**
 * Validates the access token on protected routes. SPEC.md § Guards & Roles.
 *
 * The token is read from an HttpOnly cookie rather than an Authorization
 * header: the dashboard is a browser surface, and a token readable by
 * JavaScript would be exfiltratable by any XSS.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = (request.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];

    if (!token) throw new UnauthorizedException('Not signed in');

    try {
      (request as RequestWithUser).user = this.tokens.verifyAccess(token);
    } catch {
      // Expired or tampered. The client should refresh and retry.
      throw new UnauthorizedException('Session expired');
    }

    return true;
  }
}
