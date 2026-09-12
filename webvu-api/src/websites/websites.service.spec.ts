import {
  createStarterFooter,
  createStarterHeader,
  createStarterPages,
  defaultTheme,
} from '@webvu/shared';
import { Website } from '../database/entities/website.entity';
import { toSnapshot, unavailableReasonFor } from './websites.service';

/**
 * Unit tests for the rule that decides whether a website is served publicly.
 * SPEC.md § Entities — a website is served only when published, not
 * unpublished by its owner, email-verified, and in a served billing state.
 */

function makeWebsite(overrides: Partial<Website> = {}): Website {
  const website = new Website();
  Object.assign(website, {
    id: 'w1',
    slug: 'beardbaker',
    name: 'Beard Baker',
    currency: 'GBP',
    notificationEmail: 'hi@beardbaker.example',
    notificationEmailVerified: true,
    pendingNotificationEmail: null,
    termsAcceptedAt: new Date(),
    theme: defaultTheme,
    header: createStarterHeader('Beard Baker'),
    footer: createStarterFooter(),
    pages: createStarterPages(),
    draftTheme: defaultTheme,
    draftHeader: createStarterHeader('Beard Baker'),
    draftFooter: createStarterFooter(),
    draftPages: createStarterPages(),
    draftUpdatedAt: new Date(),
    publishedAt: new Date(),
    unpublishedByUser: false,
    trialEndsAt: new Date(),
    subscriptionStatus: 'trialing',
    ownerId: 'u1',
  } as Partial<Website>);
  Object.assign(website, overrides);
  return website;
}

describe('unavailableReasonFor', () => {
  it('serves a published, verified website on an active trial', () => {
    expect(unavailableReasonFor(makeWebsite())).toBeNull();
  });

  it.each(['trialing', 'active', 'past_due'] as const)(
    'serves a website in %s state',
    (subscriptionStatus) => {
      expect(unavailableReasonFor(makeWebsite({ subscriptionStatus }))).toBeNull();
    },
  );

  it.each(['unpaid', 'cancelled', 'trial_expired'] as const)(
    'suspends a website in %s state',
    (subscriptionStatus) => {
      expect(unavailableReasonFor(makeWebsite({ subscriptionStatus }))).toBe('suspended');
    },
  );

  it('reports unpublished when never published', () => {
    expect(unavailableReasonFor(makeWebsite({ publishedAt: null }))).toBe('unpublished');
  });

  it('reports unpublished when the owner took it offline', () => {
    expect(unavailableReasonFor(makeWebsite({ unpublishedByUser: true }))).toBe(
      'unpublished',
    );
  });

  it('reports unverified when the notification email is not confirmed', () => {
    expect(unavailableReasonFor(makeWebsite({ notificationEmailVerified: false }))).toBe(
      'unverified',
    );
  });

  it('reports suspension ahead of unpublished, so billing is the headline reason', () => {
    const website = makeWebsite({
      subscriptionStatus: 'trial_expired',
      publishedAt: null,
    });
    expect(unavailableReasonFor(website)).toBe('suspended');
  });
});

describe('toSnapshot', () => {
  it('exposes only the public fields, never draft or billing state', () => {
    const snapshot = toSnapshot(makeWebsite());
    expect(Object.keys(snapshot).sort()).toEqual([
      'footer',
      'header',
      'name',
      'pages',
      'slug',
      'theme',
    ]);
  });

  it('returns the live snapshot, not the draft', () => {
    const website = makeWebsite({
      header: { logoUrl: null, businessName: 'Live name' },
      draftHeader: { logoUrl: null, businessName: 'Draft name' },
    });
    expect(toSnapshot(website).header.businessName).toBe('Live name');
  });
});
