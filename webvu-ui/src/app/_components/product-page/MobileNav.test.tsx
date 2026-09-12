import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileNav } from './MobileNav';

describe('MobileNav', () => {
  it('is closed until the trigger is clicked', () => {
    render(<MobileNav />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the drawer when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('closes the drawer when an in-drawer nav link is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('link', { name: 'Features' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
