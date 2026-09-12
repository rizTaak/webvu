/**
 * webvu.io — the product page. SPEC.md § webvu.io — Product Page.
 *
 * Placeholder for the walking skeleton: the real sections (hero, features,
 * how it works, pricing) are a later slice. Styled with semantic tokens, not
 * Tailwind's stock palette, which no longer generates any CSS.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-widest text-text-subtle uppercase">
        Webvu
      </p>
      <h1 className="max-w-2xl text-4xl font-semibold text-balance text-text sm:text-5xl">
        Mini websites for small businesses
      </h1>
      <p className="max-w-prose text-lg text-pretty text-text-muted">
        Pick your blocks, set your colours, share your link. Your own website at
        your own address, without the website-building part.
      </p>
      <a
        href="http://dashboard.webvu.localhost"
        className="mt-2 inline-flex items-center rounded-md bg-action px-6 py-3 text-sm font-medium text-text-on-brand transition-colors hover:bg-action-hover"
      >
        Start Creating
      </a>
    </main>
  );
}
