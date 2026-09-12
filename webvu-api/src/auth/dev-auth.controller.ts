import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CookieConfigService } from './cookie-config.service';
import { setSessionCookies } from './cookies';
import { DevStubAuthProvider } from './providers/dev-stub.provider';
import { TokenService } from './token.service';

/**
 * Local sign-in without Google. SPEC.md § Local Development.
 *
 * GUARD 1 of 3: this controller and the stub provider are registered only
 * when NODE_ENV !== 'production' — see AuthModule. Guard 2 is the explicit
 * DEV_AUTH_ENABLED flag and guard 3 is the startup assertion against a
 * non-local DATABASE_URL, both in config/env.ts.
 *
 * Kept separate from AuthController so that in production these routes do not
 * exist at all, rather than existing and refusing.
 */
@ApiTags('auth')
@Controller('auth/dev')
export class DevAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly cookies: CookieConfigService,
    private readonly devStub: DevStubAuthProvider,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'Local only: seeded users for the dev sign-in screen' })
  async users() {
    const users = await this.devStub.listUsers();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    }));
  }

  @Post('session')
  @ApiOperation({ summary: 'Local only: start a session as a seeded user' })
  async session(
    @Body() body: { userId?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const identity = await this.devStub.identify({ userId: body.userId });
    const user = await this.auth.resolveUser(identity);
    const session = await this.tokens.issueSession(user);

    // Cookies are set here so the API is usable directly (curl, tests), but
    // the browser never talks to this host: the dashboard's own route handler
    // reads the tokens from the body and re-issues them as host-only cookies
    // on dashboard.webvu.io. SPEC.md § Authentication, step 3.
    setSessionCookies(res, this.cookies.config, session);
    return {
      user: { id: user.id, email: user.email, role: user.role },
      tokens: session,
    };
  }
}
