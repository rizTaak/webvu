import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TermsPage from './page';

describe('TermsPage', () => {
  it('renders the placeholder notice with the shared header and footer', () => {
    render(<TermsPage />);
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText(/placeholder/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Webvu' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toBeInTheDocument();
  });
});
