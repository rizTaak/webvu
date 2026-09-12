import {
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CookieConfigService } from './cookie-config.service';
import { REFRESH_COOKIE, clearSessionCookies, setSessionCookies } from './cookies';
import { JwtAuthGuard, type RequestWithUser } from './jwt-auth.guard';
import { TokenService } from './token.service';

/**
 * Session routes. Provider-specific sign-in lives elsewhere — Google will be
 * its own controller, as the dev stub already is — so this file never depends
 * on which provider issued the identity.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly cookies: CookieConfigService,
  ) {}

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate the session; reuse revokes the token family' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!raw) throw new UnauthorizedException('No refresh token');

    try {
      const session = await this.tokens.rotate(raw, (id) => this.auth.findById(id));
      setSessionCookies(res, this.cookies.config, session);
      // Also returned in the body so the dashboard route handler can re-issue
      // them on its own host — see the note in DevAuthController.
      return { refreshed: true, tokens: session };
    } catch (error) {
      // A rejected refresh must not leave a stale cookie behind, or the
      // browser retries forever with a token that can never work.
      clearSessionCookies(res, this.cookies.config);
      throw error;
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'Clear cookies and revoke the refresh token family' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (raw) await this.tokens.revokeByToken(raw);

    clearSessionCookies(res, this.cookies.config);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'The current authenticated user' })
  async me(@Req() req: RequestWithUser) {
    const user = await this.auth.findById(req.user.sub);
    if (!user) throw new NotFoundException('Account no longer exists');

    // `hasWebsite` is what the dashboard uses to decide whether onboarding is
    // still needed, so it does not have to probe /websites/me for a 404.
    const hasWebsite = await this.auth.hasWebsite(user.id);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      hasWebsite,
    };
  }
}
