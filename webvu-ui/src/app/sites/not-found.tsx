/**
 * Shown for an unknown, unpublished or suspended slug. SPEC.md § Error &
 * Empty States — all three look identical to a visitor.
 *
 * This is Webvu's own chrome, not a user's, so it uses --wv-* tokens.
 */
export default function SiteNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold">This website isn&apos;t available</h1>
      <p className="max-w-md text-text-muted">
        The address may be mistyped, or the website may have been taken offline.
      </p>
      <a
        href="https://webvu.io"
        className="mt-2 inline-flex items-center rounded-md bg-action px-5 py-2.5 text-sm font-medium text-text-on-brand transition-colors hover:bg-action-hover"
      >
        Build your own with Webvu
      </a>
    </main>
  );
}
