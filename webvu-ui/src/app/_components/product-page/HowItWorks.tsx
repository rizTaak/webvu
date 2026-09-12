import { STEPS } from './content';

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-16 bg-surface-sunken px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-text sm:text-4xl">
            How it works
          </h2>
        </div>

        <ol className="mt-12 flex flex-col gap-8 md:flex-row md:gap-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-1 flex-col gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-action text-sm font-semibold text-text-on-brand">
                {index + 1}
              </span>
              <h3 className="text-lg font-semibold text-text">{step.title}</h3>
              <p className="text-text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
