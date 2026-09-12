import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Features } from './Features';
import { FEATURES } from './content';

describe('Features', () => {
  it('has the #features anchor id nav links point to', () => {
    const { container } = render(<Features />);
    expect(container.querySelector('#features')).not.toBeNull();
  });

  it('renders exactly six feature tiles', () => {
    render(<Features />);
    expect(FEATURES).toHaveLength(6);
    for (const feature of FEATURES) {
      expect(screen.getByText(feature.title)).toBeInTheDocument();
    }
  });
});
