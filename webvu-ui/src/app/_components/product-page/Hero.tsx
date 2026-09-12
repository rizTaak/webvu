import { buttonVariants } from '@/components/ui/button';
import { DASHBOARD_URL } from './content';

export function Hero() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
      <p className="text-sm font-medium tracking-widest text-text-subtle uppercase">
        Webvu
      </p>
      <h1 className="text-4xl font-semibold text-balance text-text sm:text-5xl">
        A web presence for your business, live in minutes
      </h1>
      <p className="max-w-prose text-lg text-pretty text-text-muted">
        Add your products or services, pick a look you like, and share your
        link. No designer, no developer, no waiting around.
      </p>
      <a
        href={DASHBOARD_URL}
        className={buttonVariants({
          size: 'lg',
          className: 'mt-2 w-full px-6 py-3 text-base sm:w-auto',
        })}
      >
        Start Creating
      </a>
    </section>
  );
}
