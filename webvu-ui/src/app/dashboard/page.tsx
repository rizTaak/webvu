import { getOwnerWebsite, getSession } from '../../lib/session';

/**
 * The dashboard home. SPEC.md § Main Dashboard.
 *
 * Shows the signed-in user's own website. The editor, inbox, analytics and
 * the rest are later slices; what exists here is the page list and publish
 * state, which is what the sidebar in the spec leads with.
 */

const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'webvu.localhost';

function publishLabel(site: {
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
}): { text: string; tone: 'live' | 'draft' | 'none' } {
  if (!site.publishedAt) return { text: 'Never published', tone: 'none' };
  if (site.hasUnpublishedChanges) return { text: 'Unpublished changes', tone: 'draft' };
  return { text: 'Published', tone: 'live' };
}

export default async function DashboardPage() {
  const session = await getSession();
  const site = await getOwnerWebsite();

  // No website yet. SPEC.md puts a non-dismissible onboarding modal here;
  // that is the next slice, so for now the state is named rather than faked.
  if (!site) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <h1 className="text-2xl font-semibold">No website yet</h1>
        <p className="mt-3 text-text-muted">
          {session?.role === 'user'
            ? 'Slug onboarding is the next thing to build. Until then, sign in as a seeded account that already owns a website.'
            : 'Internal accounts do not own a website. Sign in as a user account to see one.'}
        </p>
      </div>
    );
  }

  const status = publishLabel(site);
  const liveUrl = `http://${site.slug}.${SITE_DOMAIN}`;
  const pages = site.draft.pages;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{site.name}</h1>
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-sm text-text-muted underline underline-offset-4 hover:text-text"
          >
            {site.slug}.{SITE_DOMAIN}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status.tone === 'live'
                ? 'bg-action-subtle text-action'
                : status.tone === 'draft'
                  ? 'bg-accent-subtle text-text'
                  : 'bg-surface-sunken text-text-muted'
            }`}
          >
            {status.text}
          </span>
          {!site.isPubliclyServed && (
            <span className="rounded-full bg-surface-sunken px-3 py-1 text-xs text-text-muted">
              Not public
            </span>
          )}
        </div>
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-surface-raised p-4">
          <dt className="text-xs tracking-wide text-text-subtle uppercase">Subscription</dt>
          <dd className="mt-1 text-sm">{site.subscriptionStatus.replace('_', ' ')}</dd>
        </div>
        <div className="rounded-md border border-border bg-surface-raised p-4">
          <dt className="text-xs tracking-wide text-text-subtle uppercase">
            Notification email
          </dt>
          <dd className="mt-1 text-sm break-all">
            {site.notificationEmail}
            {!site.notificationEmailVerified && (
              <span className="ml-1 text-text-subtle">(unverified)</span>
            )}
          </dd>
        </div>
        <div className="rounded-md border border-border bg-surface-raised p-4">
          <dt className="text-xs tracking-wide text-text-subtle uppercase">Currency</dt>
          <dd className="mt-1 text-sm">{site.currency}</dd>
        </div>
      </dl>

      <h2 className="mt-10 text-sm font-semibold tracking-wide uppercase">Pages</h2>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border bg-surface-raised">
        {pages.map((page) => (
          <li key={page.key} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm">
              {page.title}
              {!page.enabled && (
                <span className="ml-2 text-xs text-text-subtle">disabled</span>
              )}
            </span>
            <span className="text-xs text-text-subtle">
              {page.blocks.length} {page.blocks.length === 1 ? 'block' : 'blocks'}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-text-subtle">
        The stack editor is the next slice; these page contents are read-only for now.
      </p>
    </div>
  );
}
