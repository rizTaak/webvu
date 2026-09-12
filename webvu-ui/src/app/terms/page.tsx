import type { Metadata } from 'next';
import { Header } from '../_components/product-page/Header';
import { Footer } from '../_components/product-page/Footer';

export const metadata: Metadata = { title: 'Terms of Service — Webvu' };

/**
 * Placeholder ahead of real legal copy. SPEC.md § Legal — Interim state.
 */
export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold text-text">Terms of Service</h1>
        <p className="mt-4 text-text-muted">
          This is a placeholder — the full Terms of Service are pending. See
          SPEC.md § Legal for the clauses this document will cover.
        </p>
      </main>
      <Footer />
    </div>
  );
}
