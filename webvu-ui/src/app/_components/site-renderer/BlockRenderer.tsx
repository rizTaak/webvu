import {
  REGISTRY,
  isBlockType,
  mergeDefaultProps,
  type Block,
  type BlockType,
  type HeroProps,
} from '@webvu/shared';
import { SectionWrapper } from './SectionWrapper';
import { PlaceholderBlock } from './PlaceholderBlock';
import { HeroBlock } from './blocks/HeroBlock';
import type { ComponentType } from 'react';

/**
 * Maps a block type to its React component. The catalogue metadata lives in
 * @webvu/shared so the API can validate against it without importing React;
 * this file is the UI half of the registry.
 *
 * An entry appears here only once its component is built out. Everything else
 * falls through to PlaceholderBlock.
 */
const COMPONENTS: Partial<Record<BlockType, ComponentType<{ props: never }>>> = {
  hero: HeroBlock as ComponentType<{ props: never }>,
};

/**
 * Resolution order. SPEC.md § Component Registry.
 *
 *   1. unknown type            -> render nothing, warn. Never break the page.
 *   2. hidden on a live render -> render nothing.
 *   3. status placeholder      -> PlaceholderBlock.
 *   4. otherwise               -> the component, inside SectionWrapper.
 */
export function BlockRenderer({ block, preview = false }: { block: Block; preview?: boolean }) {
  if (!isBlockType(block.type)) {
    console.warn(`[webvu] unknown block type "${block.type}" — skipping`);
    return null;
  }

  if (block.section.hidden && !preview) return null;

  const entry = REGISTRY[block.type];
  const Component = COMPONENTS[block.type];

  if (entry.status !== 'implemented' || !Component) {
    const note = typeof block.props.placeholderNote === 'string'
      ? block.props.placeholderNote
      : undefined;
    return (
      <SectionWrapper section={block.section}>
        <PlaceholderBlock entry={entry} note={note} />
      </SectionWrapper>
    );
  }

  // Defaults merge underneath stored props so a block written while this
  // component was still a placeholder renders as a valid, empty instance.
  const props = mergeDefaultProps(block.type, block.props) as unknown as HeroProps;

  return (
    <SectionWrapper section={block.section}>
      <Component props={props as never} />
    </SectionWrapper>
  );
}
