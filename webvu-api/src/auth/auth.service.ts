import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthAccount } from '../database/entities/oauth-account.entity';
import { User } from '../database/entities/user.entity';
import { Website } from '../database/entities/website.entity';
import type { ProviderIdentity } from './providers/auth-provider.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(OAuthAccount)
    private readonly accounts: Repository<OAuthAccount>,
    @InjectRepository(Website) private readonly websites: Repository<Website>,
  ) {}

  /**
   * Queried here rather than through WebsitesService, so AuthModule does not
   * import WebsitesModule — WebsitesModule needs AuthModule for the guard,
   * and a cycle between them would need forwardRef on both sides.
   */
  async hasWebsite(userId: string): Promise<boolean> {
    return (await this.websites.countBy({ ownerId: userId })) > 0;
  }

  /**
   * Resolve a verified provider identity to a User, creating one on first
   * sign-in. SPEC.md § Authentication.
   */
  async resolveUser(identity: ProviderIdentity): Promise<User> {
    const linked = await this.accounts.findOne({
      where: { provider: identity.provider, providerId: identity.providerId },
    });

    if (linked) {
      const user = await this.users.findOneBy({ id: linked.userId });
      if (user) return user;
    }

    const email = identity.email.toLowerCase();
    const existing = await this.users
      .createQueryBuilder('user')
      .where('lower(user.email) = :email', { email })
      .getOne();

    /**
     * An existing account with the same address is linked only when the
     * provider actually verifies email. Otherwise anyone who can assert an
     * address at a sloppy provider could take over the account — which is why
     * SPEC.md calls this out for future providers.
     */
    if (existing) {
      if (!identity.emailVerified) {
        throw new Error(
          `Refusing to link ${identity.provider} to an existing account: provider does not verify email`,
        );
      }
      await this.linkAccount(existing.id, identity);
      return existing;
    }

    const created = await this.users.save(
      Object.assign(new User(), {
        email: identity.email,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        role: 'user' as const,
      }),
    );
    await this.linkAccount(created.id, identity);
    return created;
  }

  private async linkAccount(userId: string, identity: ProviderIdentity): Promise<void> {
    const already = await this.accounts.findOne({
      where: { provider: identity.provider, providerId: identity.providerId },
    });
    if (already) return;

    await this.accounts.save(
      Object.assign(new OAuthAccount(), {
        userId,
        provider: identity.provider,
        providerId: identity.providerId,
      }),
    );
  }

  async findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }
}
