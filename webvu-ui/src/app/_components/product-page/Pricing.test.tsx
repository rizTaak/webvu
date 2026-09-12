import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Pricing } from './Pricing';
import { DASHBOARD_URL } from './content';

describe('Pricing', () => {
  it('has the #pricing anchor id nav links point to', () => {
    const { container } = render(<Pricing />);
    expect(container.querySelector('#pricing')).not.toBeNull();
  });

  it('mentions the 30-day trial and cancel-anytime terms', () => {
    const { container } = render(<Pricing />);
    expect(container.textContent).toMatch(/30-day/i);
    expect(container.textContent).toMatch(/cancel anytime/i);
  });

  it('never hardcodes a dollar figure, per SPEC.md § Open Questions', () => {
    const { container } = render(<Pricing />);
    expect(container.textContent).not.toMatch(/\$\d/);
  });

  it('links its CTA to the dashboard host', () => {
    render(<Pricing />);
    expect(screen.getByRole('link', { name: 'Start your free trial' })).toHaveAttribute(
      'href',
      DASHBOARD_URL,
    );
  });
});
