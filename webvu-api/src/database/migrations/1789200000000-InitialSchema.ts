import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema: users and websites.
 *
 * Scope is the walking skeleton — enough to render a published website on its
 * subdomain. Remaining entities from SPEC.md § Entities arrive with the
 * modules that use them.
 */
export class InitialSchema1789200000000 implements MigrationInterface {
  name = 'InitialSchema1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('user', 'admin', 'support')
    `);

    await queryRunner.query(`
      CREATE TYPE "subscription_status_enum" AS ENUM (
        'trialing', 'active', 'past_due', 'unpaid', 'cancelled', 'trial_expired'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email"               varchar(254) NOT NULL,
        "displayName"         varchar(120) NOT NULL,
        "avatarUrl"           varchar(2048),
        "role"                "user_role_enum" NOT NULL DEFAULT 'user',
        "deletionRequestedAt" timestamptz,
        "createdAt"           timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_users_email" ON "users" (lower("email"))`,
    );

    await queryRunner.query(`
      CREATE TABLE "websites" (
        "id"                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "slug"                        varchar(30) NOT NULL,
        "name"                        varchar(60) NOT NULL,
        "currency"                    varchar(3) NOT NULL DEFAULT 'GBP',
        "notificationEmail"           varchar(254) NOT NULL,
        "notificationEmailVerified"   boolean NOT NULL DEFAULT false,
        "pendingNotificationEmail"    varchar(254),
        "termsAcceptedAt"             timestamptz,

        "theme"                       jsonb NOT NULL,
        "header"                      jsonb NOT NULL,
        "footer"                      jsonb NOT NULL,
        "pages"                       jsonb NOT NULL,

        "draftTheme"                  jsonb NOT NULL,
        "draftHeader"                 jsonb NOT NULL,
        "draftFooter"                 jsonb NOT NULL,
        "draftPages"                  jsonb NOT NULL,
        "draftUpdatedAt"              timestamptz NOT NULL DEFAULT now(),

        "publishedAt"                 timestamptz,
        "unpublishedByUser"           boolean NOT NULL DEFAULT false,

        "trialEndsAt"                 timestamptz,
        "subscriptionStatus"          "subscription_status_enum" NOT NULL DEFAULT 'trialing',
        "stripeCustomerId"            varchar(255),
        "stripeSubscriptionId"        varchar(255),
        "currentPeriodEnd"            timestamptz,

        "ownerId"                     uuid NOT NULL,
        "createdAt"                   timestamptz NOT NULL DEFAULT now(),
        "updatedAt"                   timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "fk_websites_owner"
          FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    // Slugs are compared case-insensitively, so uniqueness is on lower(slug).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_websites_slug_lower" ON "websites" (lower("slug"))`,
    );

    // One website per user in v1.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_websites_owner" ON "websites" ("ownerId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "websites"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
