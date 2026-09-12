import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';
import { DASHBOARD_URL, NAV_LINKS } from './content';

describe('Header', () => {
  it('links the brand to the homepage', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Webvu' })).toHaveAttribute('href', '/');
  });

  it('renders the anchor nav for every section', () => {
    render(<Header />);
    for (const link of NAV_LINKS) {
      expect(screen.getByRole('link', { name: link.label })).toHaveAttribute('href', link.href);
    }
  });

  it('points Login and Start Creating at the dashboard host', () => {
    render(<Header />);
    const logins = screen.getAllByRole('link', { name: 'Login' });
    const startCreatings = screen.getAllByRole('link', { name: 'Start Creating' });
    expect(logins.length).toBeGreaterThan(0);
    expect(startCreatings.length).toBeGreaterThan(0);
    for (const link of [...logins, ...startCreatings]) {
      expect(link).toHaveAttribute('href', DASHBOARD_URL);
    }
  });
});
