import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import type { AuthProvider, ProviderIdentity } from './auth-provider.interface';

/**
 * Local sign-in without Google. SPEC.md § Local Development — "Auth".
 *
 * Exists because Google refuses to register an `http://` redirect URI for any
 * host other than `localhost`, so `http://dashboard.webvu.localhost/auth/callback`
 * cannot be used — and because an end-to-end test cannot drive a real Google
 * login. It mints exactly the session the real flow would; everything
 * downstream (cookies, guards, rotation, role routing) is unchanged.
 *
 * This class is only ever registered when NODE_ENV !== 'production'. See
 * AuthModule for guard 1 and config/env.ts for guards 2 and 3.
 */
@Injectable()
export class DevStubAuthProvider implements AuthProvider {
  readonly name = 'dev';

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /** The accounts the sign-in screen offers. */
  async listUsers(): Promise<User[]> {
    return this.users.find({ order: { role: 'ASC', email: 'ASC' } });
  }

  async identify(input: Record<string, unknown>): Promise<ProviderIdentity> {
    const userId = typeof input.userId === 'string' ? input.userId : null;
    if (!userId) throw new BadRequestException('userId is required');

    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('No such seeded user');

    return {
      provider: this.name,
      providerId: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      // The stub only ever selects an existing seeded row, so the address is
      // as verified as the seed made it.
      emailVerified: true,
    };
  }
}
