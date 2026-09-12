import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { DASHBOARD_URL } from './content';

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold text-text sm:text-4xl">
          Simple pricing
        </h2>
        <p className="mt-4 text-lg text-text-muted">
          Try Webvu free for 30 days. No card required to start.
        </p>
      </div>

      <Card className="mx-auto mt-12 max-w-md">
        <CardHeader>
          <CardTitle>One simple plan</CardTitle>
          <CardDescription>Cancel anytime.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-text-muted">
            <li>30-day free trial, every feature included</li>
            <li>A single monthly subscription once your trial ends</li>
            <li>Your site goes offline if the subscription lapses — nothing is deleted, and resubscribing brings it straight back</li>
          </ul>
        </CardContent>
        <CardFooter>
          <a href={DASHBOARD_URL} className={buttonVariants({ className: 'w-full' })}>
            Start your free trial
          </a>
        </CardFooter>
      </Card>
    </section>
  );
}
