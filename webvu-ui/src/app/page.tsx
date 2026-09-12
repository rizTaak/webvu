import { Header } from './_components/product-page/Header';
import { Hero } from './_components/product-page/Hero';
import { Features } from './_components/product-page/Features';
import { HowItWorks } from './_components/product-page/HowItWorks';
import { Pricing } from './_components/product-page/Pricing';
import { Footer } from './_components/product-page/Footer';

/**
 * webvu.io — the product page. SPEC.md § webvu.io — Product Page. Styled
 * with semantic tokens, not Tailwind's stock palette, which no longer
 * generates any CSS.
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
