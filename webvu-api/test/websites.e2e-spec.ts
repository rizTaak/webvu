import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Client } from 'pg';
import { DataSource, Repository } from 'typeorm';
import {
  createStarterFooter,
  createStarterHeader,
  createStarterPages,
  defaultTheme,
} from '@webvu/shared';
import { User } from '../src/database/entities/user.entity';
import { Website, type SubscriptionStatus } from '../src/database/entities/website.entity';
import { WebsitesModule } from '../src/websites/websites.module';
import { InitialSchema1789200000000 } from '../src/database/migrations/1789200000000-InitialSchema';

/**
 * Integration tests for GET /websites/:slug against a real Postgres.
 *
 * Uses its own database so it never touches development data, and runs the
 * real migration so the schema under test is the one that ships.
 */

const ADMIN_URL = process.env.DATABASE_URL ?? 'postgresql://webvu:webvu@localhost:5432/webvu';
const TEST_DB = 'webvu_test';
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

interface Fixture {
  slug: string;
  subscriptionStatus?: SubscriptionStatus;
  publishedAt?: Date | null;
  unpublishedByUser?: boolean;
  notificationEmailVerified?: boolean;
}

describe('GET /websites/:slug', () => {
  let app: INestApplication;
  let websites: Repository<Website>;
  let users: Repository<User>;
  let ownerSeq = 0;

  beforeAll(async () => {
    await recreateTestDatabase();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: TEST_URL.toString(),
          entities: [User, Website],
          migrations: [InitialSchema1789200000000],
          migrationsRun: true,
          synchronize: false,
        }),
        // WebsitesModule registers only the Website repository; fixtures here
        // also need User, so it is registered for the test context alone.
        TypeOrmModule.forFeature([User, Website]),
        WebsitesModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    websites = moduleRef.get(getRepositoryToken(Website));
    users = moduleRef.get(getRepositoryToken(User));
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    const dataSource = app?.get(DataSource, { strict: false });
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  async function givenWebsite(fixture: Fixture): Promise<Website> {
    ownerSeq += 1;
    const user = await users.save(
      Object.assign(new User(), {
        email: `owner${ownerSeq}@webvu.localhost`,
        displayName: `Owner ${ownerSeq}`,
        role: 'user' as const,
      }),
    );

    const website = Object.assign(new Website(), {
      slug: fixture.slug,
      name: 'Beard Baker',
      currency: 'GBP',
      notificationEmail: 'hi@beardbaker.example',
      notificationEmailVerified: fixture.notificationEmailVerified ?? true,
      termsAcceptedAt: new Date(),
      theme: defaultTheme,
      header: createStarterHeader('Beard Baker'),
      footer: createStarterFooter(),
      pages: createStarterPages(),
      draftTheme: defaultTheme,
      draftHeader: createStarterHeader('Beard Baker'),
      draftFooter: createStarterFooter(),
      draftPages: createStarterPages(),
      publishedAt: fixture.publishedAt === undefined ? new Date() : fixture.publishedAt,
      unpublishedByUser: fixture.unpublishedByUser ?? false,
      subscriptionStatus: fixture.subscriptionStatus ?? 'trialing',
      trialEndsAt: new Date(Date.now() + 86_400_000),
      ownerId: user.id,
    });
    return websites.save(website);
  }

  it('returns the live snapshot for a published website', async () => {
    await givenWebsite({ slug: 'published' });

    const res = await request(app.getHttpServer())
      .get('/api/websites/published')
      .expect(200);

    expect(res.body.slug).toBe('published');
    expect(res.body.name).toBe('Beard Baker');
    expect(res.body.pages).toHaveLength(6);
    expect(res.body.theme.fontFamily).toBe('Inter');
  });

  it('never exposes draft or billing state', async () => {
    await givenWebsite({ slug: 'nodraft' });

    const res = await request(app.getHttpServer()).get('/api/websites/nodraft').expect(200);

    expect(Object.keys(res.body).sort()).toEqual([
      'footer',
      'header',
      'name',
      'pages',
      'slug',
      'theme',
    ]);
  });

  it('matches the slug case-insensitively', async () => {
    await givenWebsite({ slug: 'mixedcase' });
    await request(app.getHttpServer()).get('/api/websites/MixedCase').expect(200);
  });

  it('404s an unknown slug with reason not-found', async () => {
    const res = await request(app.getHttpServer()).get('/api/websites/ghost').expect(404);
    expect(res.headers['x-webvu-reason']).toBe('not-found');
  });

  it('404s a website that was never published', async () => {
    await givenWebsite({ slug: 'neverpublished', publishedAt: null });
    const res = await request(app.getHttpServer())
      .get('/api/websites/neverpublished')
      .expect(404);
    expect(res.headers['x-webvu-reason']).toBe('unpublished');
  });

  it('404s a website the owner took offline', async () => {
    await givenWebsite({ slug: 'offline', unpublishedByUser: true });
    const res = await request(app.getHttpServer()).get('/api/websites/offline').expect(404);
    expect(res.headers['x-webvu-reason']).toBe('unpublished');
  });

  it('404s a suspended website with reason suspended', async () => {
    await givenWebsite({ slug: 'lapsed', subscriptionStatus: 'trial_expired' });
    const res = await request(app.getHttpServer()).get('/api/websites/lapsed').expect(404);
    expect(res.headers['x-webvu-reason']).toBe('suspended');
  });

  it('404s a website whose notification email is unverified', async () => {
    await givenWebsite({ slug: 'unverified', notificationEmailVerified: false });
    const res = await request(app.getHttpServer())
      .get('/api/websites/unverified')
      .expect(404);
    expect(res.headers['x-webvu-reason']).toBe('unverified');
  });

  it('does not let an unavailable website be cached at the edge', async () => {
    await givenWebsite({ slug: 'cachecheck', subscriptionStatus: 'cancelled' });
    const res = await request(app.getHttpServer())
      .get('/api/websites/cachecheck')
      .expect(404);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('marks a served website as edge-cacheable', async () => {
    await givenWebsite({ slug: 'cacheable' });
    const res = await request(app.getHttpServer()).get('/api/websites/cacheable').expect(200);
    expect(res.headers['cache-control']).toContain('s-maxage=300');
  });
});
