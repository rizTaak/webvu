import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

/**
 * Registered by hand rather than via the documented side-effect import
 * (`import '@testing-library/jest-dom/vitest'`): in this npm-workspaces
 * monorepo that import resolves a second copy of the `vitest` module and
 * extends its `expect`, not the one test files actually use, so matchers
 * silently never attach. Importing `expect` directly here uses the same
 * instance the tests run against. Types come from vitest.d.ts instead.
 */
expect.extend(matchers);

// Without `globals: true` in vitest.config.mts, @testing-library/react
// can't auto-detect `afterEach` to register its own cleanup, so each
// `render()` in a later test would otherwise stack onto document.body
// from earlier tests in the same file.
afterEach(() => {
  cleanup();
});

/**
 * Radix/Base UI components probe for these on mount; jsdom implements
 * neither, so component tests would throw without the stubs.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub;
// @ts-expect-error - test environment polyfill, real IntersectionObserver
// has more members (root, rootMargin, thresholds, takeRecords) this stub
// doesn't need for the tests that trigger it.
global.IntersectionObserver = IntersectionObserverStub;

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
