import type { MigrationInterface, QueryRunner } from 'typeorm';

/** OAuth account linkage and rotating refresh tokens. SPEC.md § Entities. */
export class AuthTables1789300000000 implements MigrationInterface {
  name = 'AuthTables1789300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "oauth_accounts" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"     uuid NOT NULL,
        "provider"   varchar(32) NOT NULL,
        "providerId" varchar(255) NOT NULL,
        "createdAt"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_oauth_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    // One provider subject maps to exactly one account.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_oauth_provider_subject"
        ON "oauth_accounts" ("provider", "providerId")
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"     uuid NOT NULL,
        "tokenHash"  varchar(64) NOT NULL,
        "familyId"   uuid NOT NULL,
        "consumedAt" timestamptz,
        "revokedAt"  timestamptz,
        "expiresAt"  timestamptz NOT NULL,
        "createdAt"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_refresh_user"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    // Lookup is always by hash; uniqueness also rules out a hash collision
    // silently authenticating the wrong session.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_refresh_token_hash" ON "refresh_tokens" ("tokenHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_family" ON "refresh_tokens" ("familyId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_user" ON "refresh_tokens" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "oauth_accounts"`);
  }
}
