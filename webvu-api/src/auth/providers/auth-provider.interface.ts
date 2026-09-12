import type { User } from '../../database/entities/user.entity';

/**
 * The seam that lets a provider be swapped without touching callers.
 * SPEC.md § Local Development — drivers, and § Authentication.
 *
 * `google` is the production implementation; `dev-stub` is the local one.
 * Adding Microsoft or Facebook later means another class here and a row in
 * `oauth_accounts` — no entity change, no change to the session machinery.
 */

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');

/** What a provider has verified about the person signing in. */
export interface ProviderIdentity {
  provider: string;
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  /** Whether the provider guarantees the email address. */
  emailVerified: boolean;
}

export interface AuthProvider {
  readonly name: string;
  /** Exchange whatever the surface collected for a verified identity. */
  identify(input: Record<string, unknown>): Promise<ProviderIdentity>;
}

export type AuthenticatedUser = Pick<User, 'id' | 'email' | 'role'>;
