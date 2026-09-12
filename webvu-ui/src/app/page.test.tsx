import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home (product page composition)', () => {
  it('renders every section in spec order: Hero, Features, How It Works, Pricing, Footer', () => {
    const { container } = render(<Home />);

    const hero = screen.getByRole('heading', {
      name: /a web presence for your business/i,
    });
    const features = container.querySelector('#features');
    const howItWorks = container.querySelector('#how-it-works');
    const pricing = container.querySelector('#pricing');
    const footer = container.querySelector('footer');

    expect(hero).toBeInTheDocument();
    expect(features).not.toBeNull();
    expect(howItWorks).not.toBeNull();
    expect(pricing).not.toBeNull();
    expect(footer).not.toBeNull();

    const positionOf = (node: Element) =>
      hero.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING ? 1 : -1;

    // Each later section must follow the previous one in document order.
    expect(positionOf(features!)).toBe(1);
    expect(features!.compareDocumentPosition(howItWorks!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(howItWorks!.compareDocumentPosition(pricing!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pricing!.compareDocumentPosition(footer!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('resolves every in-page anchor nav link to a real section id', () => {
    const { container } = render(<Home />);

    const anchorLinks = Array.from(container.querySelectorAll('a[href^="#"]'));
    expect(anchorLinks.length).toBeGreaterThan(0);

    for (const link of anchorLinks) {
      const id = link.getAttribute('href')!.slice(1);
      expect(container.querySelector(`#${id}`), `no element with id="${id}" for link "${link.textContent}"`).not.toBeNull();
    }
  });
});
