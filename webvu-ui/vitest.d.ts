// Type-only: augments Vitest's `Assertion` with jest-dom matchers so
// `expect(...).toBeInTheDocument()` etc. typecheck. A .d.ts file is never
// part of the runtime module graph, so this can't hit the dual-module
// issue documented in vitest.setup.ts, where the same import as *runtime*
// code silently extends the wrong `expect` instance.
import '@testing-library/jest-dom/vitest';
