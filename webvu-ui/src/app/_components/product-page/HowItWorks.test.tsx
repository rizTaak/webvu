import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HowItWorks } from './HowItWorks';
import { STEPS } from './content';

describe('HowItWorks', () => {
  it('has the #how-it-works anchor id nav links point to', () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelector('#how-it-works')).not.toBeNull();
  });

  it('renders exactly three steps in order', () => {
    render(<HowItWorks />);
    expect(STEPS).toHaveLength(3);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    STEPS.forEach((step, index) => {
      expect(items[index]).toHaveTextContent(step.title);
    });
  });
});
