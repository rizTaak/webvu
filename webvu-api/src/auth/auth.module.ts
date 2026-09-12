import { Module, type Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthAccount } from '../database/entities/oauth-account.entity';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import { User } from '../database/entities/user.entity';
import { Website } from '../database/entities/website.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CookieConfigService } from './cookie-config.service';
import { DevAuthController } from './dev-auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DevStubAuthProvider } from './providers/dev-stub.provider';
import { TokenService } from './token.service';

/**
 * GUARD 1 of 3 on the dev auth stub. SPEC.md § Dev auth guards.
 *
 * In production the stub provider and its controller are not registered at
 * all, so `/api/auth/dev/*` returns 404 rather than existing and refusing.
 * Guard 2 (DEV_AUTH_ENABLED) and guard 3 (the assertion that DATABASE_URL is
 * local) live in config/env.ts and run at startup.
 */
const devAuthEnabled = process.env.NODE_ENV !== 'production';

const devProviders: Provider[] = devAuthEnabled ? [DevStubAuthProvider] : [];

@Module({
  imports: [
    TypeOrmModule.forFeature([User, OAuthAccount, RefreshToken, Website]),
    // Declared rather than assumed global, so the module stands up in a test
    // harness without AppModule.
    ConfigModule,
  ],
  controllers: devAuthEnabled ? [AuthController, DevAuthController] : [AuthController],
  providers: [AuthService, TokenService, CookieConfigService, JwtAuthGuard, ...devProviders],
  exports: [AuthService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
