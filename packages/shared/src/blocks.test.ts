import { describe, expect, it } from 'vitest';
import { blockSchema, blocksSchema, mergeDefaultProps } from './blocks';
import { makeSection } from './section';
import { heroDefaultProps } from './components/hero';

function block(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    type: 'hero',
    section: makeSection(),
    props: { ...heroDefaultProps },
    ...overrides,
  };
}

describe('section settings', () => {
  it('is validated strictly on every block, whatever the component status', () => {
    // `testimonials` is a placeholder, so its props are unchecked — but its
    // section is not.
    const result = blockSchema.safeParse({
      id: 'b1',
      type: 'testimonials',
      section: { ...makeSection(), padding: 'enormous' },
      props: { anything: true },
    });
    expect(result.success).toBe(false);
  });

  it('requires a background image URL when background is "image"', () => {
    const result = blockSchema.safeParse(
      block({ section: { ...makeSection(), background: 'image' } }),
    );
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('section.backgroundImageUrl');
  });

  it('bounds overlay opacity to 0-80', () => {
    expect(
      blockSchema.safeParse(block({ section: { ...makeSection(), overlayOpacity: 90 } })).success,
    ).toBe(false);
    expect(
      blockSchema.safeParse(block({ section: { ...makeSection(), overlayOpacity: 80 } })).success,
    ).toBe(true);
  });

  it('constrains anchorId to a slug pattern', () => {
    expect(
      blockSchema.safeParse(block({ section: { ...makeSection(), anchorId: 'Pricing!' } })).success,
    ).toBe(false);
    expect(
      blockSchema.safeParse(block({ section: { ...makeSection(), anchorId: 'pricing' } })).success,
    ).toBe(true);
  });
});

describe('the status gate', () => {
  it('rejects unknown component types', () => {
    const result = blockSchema.safeParse(block({ type: 'not-a-component' }));
    expect(result.success).toBe(false);
  });

  it('accepts any props object for a placeholder component', () => {
    const result = blockSchema.safeParse({
      id: 'b1',
      type: 'pricing-tiers',
      section: makeSection(),
      props: { whatever: 'the user typed', nested: { deeply: [1, 2, 3] } },
    });
    expect(result.success).toBe(true);
  });

  it('validates props strictly for an implemented component', () => {
    const result = blockSchema.safeParse(
      block({ props: { ...heroDefaultProps, headline: '' } }),
    );
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('props.headline');
  });

  it('rejects an invalid variant on an implemented component', () => {
    const result = blockSchema.safeParse(
      block({ props: { ...heroDefaultProps, variant: 'diagonal' } }),
    );
    expect(result.success).toBe(false);
  });
});

describe('defaultProps merge on promotion', () => {
  it('merges defaults underneath stored props, never over them', () => {
    const merged = mergeDefaultProps('hero', { headline: 'Mine' });
    expect(merged.headline).toBe('Mine');
    expect(merged.variant).toBe(heroDefaultProps.variant);
  });

  it('turns a bare placeholder block into a valid instance once implemented', () => {
    // A block stored while `hero` was still a placeholder would carry {}.
    const result = blockSchema.safeParse({
      id: 'b1',
      type: 'hero',
      section: makeSection(),
      props: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.props.headline).toBe(heroDefaultProps.headline);
    }
  });
});

describe('a page stack', () => {
  it('rejects duplicate block ids', () => {
    const result = blocksSchema.safeParse([block({ id: 'dup' }), block({ id: 'dup' })]);
    expect(result.success).toBe(false);
  });

  it('rejects duplicate anchor ids', () => {
    const result = blocksSchema.safeParse([
      block({ id: 'b1', section: { ...makeSection(), anchorId: 'same' } }),
      block({ id: 'b2', section: { ...makeSection(), anchorId: 'same' } }),
    ]);
    expect(result.success).toBe(false);
  });

  it('allows repeated null anchors', () => {
    const result = blocksSchema.safeParse([block({ id: 'b1' }), block({ id: 'b2' })]);
    expect(result.success).toBe(true);
  });

  it('caps a page at 30 blocks', () => {
    const many = Array.from({ length: 31 }, (_, i) => block({ id: `b${i}` }));
    expect(blocksSchema.safeParse(many).success).toBe(false);
  });
});
