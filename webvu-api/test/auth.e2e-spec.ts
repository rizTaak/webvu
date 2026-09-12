import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { Client } from 'pg';
import { DataSource, Repository } from 'typeorm';
import {
  createStarterFooter,
  createStarterHeader,
  createStarterPages,
  defaultTheme,
} from '@webvu/shared';
import { AuthModule } from '../src/auth/auth.module';
import { OAuthAccount } from '../src/database/entities/oauth-account.entity';
import { RefreshToken } from '../src/database/entities/refresh-token.entity';
import { User } from '../src/database/entities/user.entity';
import { Website } from '../src/database/entities/website.entity';
import { WebsitesModule } from '../src/websites/websites.module';
import { InitialSchema1789200000000 } from '../src/database/migrations/1789200000000-InitialSchema';
import { AuthTables1789300000000 } from '../src/database/migrations/1789300000000-AuthTables';

/**
 * Integration tests for the session flow against a real Postgres.
 *
 * The tests that matter most here are the isolation ones: a signed-in user
 * must never reach another user's website, and a replayed refresh token must
 * kill the whole family.
 */

const ADMIN_URL = process.env.DATABASE_URL ?? 'postgresql://webvu:webvu@localhost:5432/webvu';
const TEST_DB = 'webvu_auth_test';
const TEST_URL = new URL(ADMIN_URL);
TEST_URL.pathname = `/${TEST_DB}`;

async function recreateTestDatabase(): Promise<void> {
  const client = new Client({ connectionString: ADMIN_URL });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${TEST_DB}`);
  } finally {
    await client.end();
  }
}

/** Pull one cookie's value out of a Set-Cookie header list. */
function cookieValue(setCookie: string[] | undefined, name: string): string | null {
  const found = (setCookie ?? []).find((c) => c.startsWith(`${name}=`));
  if (!found) return null;
  return found.split(';')[0]!.slice(name.length + 1);
}

function cookieAttrs(setCookie: string[] | undefined, name: string): string {
  return (setCookie ?? []).find((c) => c.startsWith(`${name}=`)) ?? '';
}

describe('auth', () => {
  let app: INestApplication;
  let users: Repository<User>;
  let websites: Repository<Website>;
  let seq = 0;

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-long-enough-for-the-schema';

    await recreateTestDatabase();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: TEST_URL.toString(),
          entities: [User, Website, OAuthAccount, RefreshToken],
          migrations: [InitialSchema1789200000000, AuthTables1789300000000],
          migrationsRun: true,
          synchronize: false,
        }),
        TypeOrmModule.forFeature([User, Website]),
        AuthModule,
        WebsitesModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    users = moduleRef.get(getRepositoryToken(User));
    websites = moduleRef.get(getRepositoryToken(Website));
  }, 60_000);

  afterAll(async () => {
    const dataSource = app?.get(DataSource, { strict: false });
    await app?.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  async function givenUser(withWebsite: boolean): Promise<User> {
    seq += 1;
    const user = await users.save(
      Object.assign(new User(), {
        email: `user${seq}@webvu.localhost`,
        displayName: `User ${seq}`,
        role: 'user' as const,
      }),
    );

    if (withWebsite) {
      await websites.save(
        Object.assign(new Website(), {
          slug: `site${seq}`,
          name: `Site ${seq}`,
          currency: 'GBP',
          notificationEmail: `hi@site${seq}.example`,
          notificationEmailVerified: true,
          theme: defaultTheme,
          header: createStarterHeader(`Site ${seq}`),
          footer: createStarterFooter(),
          pages: createStarterPages(),
          draftTheme: defaultTheme,
          draftHeader: createStarterHeader(`Site ${seq}`),
          draftFooter: createStarterFooter(),
          draftPages: createStarterPages(),
          publishedAt: new Date(),
          subscriptionStatus: 'trialing',
          trialEndsAt: new Date(Date.now() + 86_400_000),
          ownerId: user.id,
        }),
      );
    }
    return user;
  }

  async function signIn(user: User) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/dev/session')
      .send({ userId: user.id })
      .expect(201);

    const setCookie = res.headers['set-cookie'] as unknown as string[];
    return {
      access: cookieValue(setCookie, 'wv_at')!,
      refresh: cookieValue(setCookie, 'wv_rt')!,
      setCookie,
      body: res.body,
    };
  }

  // ------------------------------------------------------------- unauthorised

  it('401s protected routes without a cookie', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    await request(app.getHttpServer()).get('/api/websites/me').expect(401);
  });

  it('401s a tampered access token', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', 'wv_at=not.a.jwt')
      .expect(401);
  });

  // ------------------------------------------------------------------ sign in

  it('signs in a seeded user and returns their identity', async () => {
    const user = await givenUser(true);
    const session = await signIn(user);

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', `wv_at=${session.access}`)
      .expect(200);

    expect(me.body.email).toBe(user.email);
    expect(me.body.hasWebsite).toBe(true);
  });

  it('issues host-only, HttpOnly cookies with no Domain', async () => {
    const user = await givenUser(false);
    const session = await signIn(user);

    const access = cookieAttrs(session.setCookie, 'wv_at');
    const refresh = cookieAttrs(session.setCookie, 'wv_rt');

    // The isolation rule from SPEC.md § Domains & Session Model.
    expect(access.toLowerCase()).not.toContain('domain=');
    expect(refresh.toLowerCase()).not.toContain('domain=');
    expect(access).toContain('HttpOnly');
    expect(refresh).toContain('HttpOnly');
    expect(refresh).toContain('Path=/api/auth');
  });

  it('links an oauth account on first sign-in', async () => {
    const user = await givenUser(false);
    await signIn(user);
    await signIn(user); // second sign-in must not duplicate the link

    const accounts = app.get<Repository<OAuthAccount>>(
      getRepositoryToken(OAuthAccount),
    );
    const count = await accounts.countBy({ userId: user.id });
    expect(count).toBe(1);
  });

  // ----------------------------------------------------------------- isolation

  it('never returns another user"s website', async () => {
    const a = await givenUser(true);
    const b = await givenUser(true);

    const sessionA = await signIn(a);
    const sessionB = await signIn(b);

    const resA = await request(app.getHttpServer())
      .get('/api/websites/me')
      .set('Cookie', `wv_at=${sessionA.access}`)
      .expect(200);

    const resB = await request(app.getHttpServer())
      .get('/api/websites/me')
      .set('Cookie', `wv_at=${sessionB.access}`)
      .expect(200);

    expect(resA.body.slug).not.toBe(resB.body.slug);
    expect(resA.body.ownerId).toBeUndefined();
  });

  it('404s /websites/me for a user with no website', async () => {
    const user = await givenUser(false);
    const session = await signIn(user);

    await request(app.getHttpServer())
      .get('/api/websites/me')
      .set('Cookie', `wv_at=${session.access}`)
      .expect(404);
  });

  it('never exposes draft-only or billing internals to the public route', async () => {
    const user = await givenUser(true);
    const session = await signIn(user);

    const mine = await request(app.getHttpServer())
      .get('/api/websites/me')
      .set('Cookie', `wv_at=${session.access}`)
      .expect(200);

    const publicView = await request(app.getHttpServer())
      .get(`/api/websites/${mine.body.slug}`)
      .expect(200);

    expect(mine.body.subscriptionStatus).toBeDefined();
    expect(publicView.body.subscriptionStatus).toBeUndefined();
    expect(publicView.body.draft).toBeUndefined();
  });

  // -------------------------------------------------------------------- rotate

  it('rotates the refresh token', async () => {
    const user = await givenUser(false);
    const session = await signIn(user);

    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `wv_rt=${session.refresh}`)
      .expect(201);

    const rotated = cookieValue(res.headers['set-cookie'] as unknown as string[], 'wv_rt');
    expect(rotated).toBeTruthy();
    expect(rotated).not.toBe(session.refresh);
  });

  it('revokes the whole family when a consumed token is replayed', async () => {
    const user = await givenUser(false);
    const session = await signIn(user);

    const first = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `wv_rt=${session.refresh}`)
      .expect(201);
    const rotated = cookieValue(
      first.headers['set-cookie'] as unknown as string[],
      'wv_rt',
    )!;

    // Replay the original: this is the signal that two parties hold it.
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `wv_rt=${session.refresh}`)
      .expect(401);

    // The legitimate holder's token must die too — that is the point.
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `wv_rt=${rotated}`)
      .expect(401);
  });

  it('401s an unknown refresh token', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', 'wv_rt=nonsense')
      .expect(401);
  });

  it('401s refresh with no cookie at all', async () => {
    await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
  });

  // -------------------------------------------------------------------- logout

  it('revokes the family on logout', async () => {
    const user = await givenUser(false);
    const session = await signIn(user);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', `wv_rt=${session.refresh}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `wv_rt=${session.refresh}`)
      .expect(401);
  });
});
