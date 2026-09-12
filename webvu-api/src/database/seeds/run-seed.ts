import 'reflect-metadata';
import {
  createStarterFooter,
  createStarterHeader,
  createStarterPages,
  defaultTheme,
  websiteSnapshotSchema,
} from '@webvu/shared';
import dataSource from '../data-source';
import { User, type UserRole } from '../entities/user.entity';
import { Website, type SubscriptionStatus } from '../entities/website.entity';

/**
 * Local seed data. SPEC.md § Local Development — "Seed data".
 *
 * Idempotent: fixed ids and upserts, so running it twice changes nothing.
 * Run with `npm run seed` in webvu-api.
 */

const DAY = 24 * 60 * 60 * 1000;

interface SeedUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

const USERS: SeedUser[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'owner@webvu.localhost',
    displayName: 'Bea Baker',
    role: 'user',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'admin@webvu.localhost',
    displayName: 'Webvu Admin',
    role: 'admin',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'support@webvu.localhost',
    displayName: 'Webvu Support',
    role: 'support',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    email: 'trial@webvu.localhost',
    displayName: 'Tilly Trial',
    role: 'user',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    email: 'lapsed@webvu.localhost',
    displayName: 'Lapsed Larry',
    role: 'user',
  },
];

interface SeedWebsite {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  published: boolean;
  subscriptionStatus: SubscriptionStatus;
  trialEndsInDays: number;
  note: string;
}

const WEBSITES: SeedWebsite[] = [
  {
    id: '00000000-0000-4000-9000-000000000001',
    ownerId: USERS[0]!.id,
    slug: 'beardbaker',
    name: 'Beard Baker',
    published: true,
    subscriptionStatus: 'trialing',
    trialEndsInDays: 30,
    note: 'published, renders at beardbaker.webvu.localhost',
  },
  {
    id: '00000000-0000-4000-9000-000000000002',
    ownerId: USERS[3]!.id,
    slug: 'tillys',
    name: "Tilly's Flowers",
    published: true,
    subscriptionStatus: 'trialing',
    trialEndsInDays: 3,
    note: 'trial ending soon, banner state',
  },
  {
    id: '00000000-0000-4000-9000-000000000003',
    ownerId: USERS[4]!.id,
    slug: 'lapsed',
    name: 'Lapsed Larry Ltd',
    published: true,
    subscriptionStatus: 'trial_expired',
    trialEndsInDays: -5,
    note: 'suspended: published but trial expired, so the live site 404s',
  },
];

function snapshotFor(site: SeedWebsite) {
  const snapshot = {
    slug: site.slug,
    name: site.name,
    theme: defaultTheme,
    header: createStarterHeader(site.name),
    footer: createStarterFooter(),
    pages: createStarterPages(),
  };

  // Seeded content must satisfy the same schema as user content; a seed that
  // cannot be published is not a useful fixture.
  const result = websiteSnapshotSchema.safeParse(snapshot);
  if (!result.success) {
    throw new Error(
      `Starter template failed validation for ${site.slug}:\n${JSON.stringify(
        result.error.issues,
        null,
        2,
      )}`,
    );
  }
  return snapshot;
}

async function seed(): Promise<void> {
  await dataSource.initialize();

  try {
    const users = dataSource.getRepository(User);
    const websites = dataSource.getRepository(Website);

    /**
     * Load-then-assign rather than `upsert`, because TypeORM's
     * QueryDeepPartialEntity recurses into jsonb column types and does not
     * terminate usefully for the block `props` record. Assigning onto a
     * concrete entity keeps the types honest and is just as idempotent.
     */
    for (const seedUser of USERS) {
      const user = (await users.findOneBy({ id: seedUser.id })) ?? new User();
      Object.assign(user, seedUser);
      await users.save(user);
    }
    console.log(`seeded ${USERS.length} users`);

    const now = Date.now();

    for (const site of WEBSITES) {
      const snapshot = snapshotFor(site);
      const publishedAt = site.published ? new Date(now - DAY) : null;

      const website = (await websites.findOneBy({ id: site.id })) ?? new Website();
      Object.assign(website, {
        id: site.id,
        slug: site.slug,
          name: site.name,
        currency: 'GBP',
        notificationEmail: `hello@${site.slug}.example`,
        notificationEmailVerified: true,
        termsAcceptedAt: new Date(now - 2 * DAY),

        theme: snapshot.theme,
        header: snapshot.header,
        footer: snapshot.footer,
        pages: snapshot.pages,

        draftTheme: snapshot.theme,
        draftHeader: snapshot.header,
        draftFooter: snapshot.footer,
        draftPages: snapshot.pages,

        // Draft edited before the publish, so a freshly seeded published site
        // reads as "Published" rather than "Unpublished changes".
        draftUpdatedAt: publishedAt ? new Date(publishedAt.getTime() - 60_000) : new Date(),
        publishedAt,
        unpublishedByUser: false,
        trialEndsAt: new Date(now + site.trialEndsInDays * DAY),
        subscriptionStatus: site.subscriptionStatus,
        ownerId: site.ownerId,
      });
      await websites.save(website);

      console.log(`seeded website ${site.slug.padEnd(12)} — ${site.note}`);
    }

    console.log('\nseed complete. Try: http://beardbaker.webvu.localhost');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error('seed failed:', error);
  process.exitCode = 1;
});
