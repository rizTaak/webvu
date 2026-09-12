import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import jwt from 'jsonwebtoken';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import type { User, UserRole } from '../database/entities/user.entity';

/**
 * Access and refresh token issuing. SPEC.md § Domains & Session Model.
 *
 * Access tokens are short-lived JWTs; refresh tokens are opaque, single-use
 * and rotated. Only a SHA-256 hash of a refresh token is stored.
 */

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface IssuedSession {
  accessToken: string;
  accessMaxAgeMs: number;
  refreshToken: string;
  refreshMaxAgeMs: number;
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class TokenService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  /**
   * `jsonwebtoken` directly rather than @nestjs/jwt: that package is now
   * ESM-only, and `require(esm)` needs Node 22. This keeps the API running on
   * Node 20 as well, for a two-function surface.
   */
  private get secret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  signAccess(user: Pick<User, 'id' | 'email' | 'role'>): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, this.secret, {
      expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    });
  }

  verifyAccess(token: string): AccessTokenPayload {
    return jwt.verify(token, this.secret) as AccessTokenPayload;
  }

  /** Start a brand new session: a fresh rotation family. */
  async issueSession(user: Pick<User, 'id' | 'email' | 'role'>): Promise<IssuedSession> {
    return this.issueFor(user, randomUUID());
  }

  private async issueFor(
    user: Pick<User, 'id' | 'email' | 'role'>,
    familyId: string,
  ): Promise<IssuedSession> {
    const raw = randomBytes(32).toString('base64url');

    await this.refreshTokens.save(
      Object.assign(new RefreshToken(), {
        userId: user.id,
        tokenHash: hashToken(raw),
        familyId,
        consumedAt: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      }),
    );

    return {
      accessToken: this.signAccess(user),
      accessMaxAgeMs: ACCESS_TOKEN_TTL_MS,
      refreshToken: raw,
      refreshMaxAgeMs: REFRESH_TOKEN_TTL_MS,
    };
  }

  /**
   * Exchange a refresh token for a new pair.
   *
   * Replaying an already-consumed token means two parties hold it, so the
   * whole family is revoked and both are forced to re-authenticate. This is
   * the standard stolen-token detection: the legitimate holder and a thief
   * cannot both rotate the same token without one of them replaying.
   */
  async rotate(
    raw: string,
    loadUser: (userId: string) => Promise<Pick<User, 'id' | 'email' | 'role'> | null>,
  ): Promise<IssuedSession> {
    const existing = await this.refreshTokens.findOne({
      where: { tokenHash: hashToken(raw) },
    });

    if (!existing) throw new UnauthorizedException('Invalid refresh token');

    if (existing.revokedAt) {
      throw new UnauthorizedException('Session revoked');
    }

    if (existing.consumedAt) {
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException('Refresh token reused');
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await loadUser(existing.userId);
    if (!user) throw new UnauthorizedException('Account no longer exists');

    existing.consumedAt = new Date();
    await this.refreshTokens.save(existing);

    return this.issueFor(user, existing.familyId);
  }

  /** Revoke every unrevoked token in a rotation family. */
  async revokeFamily(familyId: string): Promise<void> {
    await this.refreshTokens.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /** Used by logout, which knows the presented token but not the family. */
  async revokeByToken(raw: string): Promise<void> {
    const existing = await this.refreshTokens.findOne({
      where: { tokenHash: hashToken(raw) },
    });
    if (existing) await this.revokeFamily(existing.familyId);
  }
}
