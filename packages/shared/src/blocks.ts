import { z } from 'zod';
import { sectionSettingsSchema, type SectionSettings } from './section';
import { REGISTRY, isBlockType, type BlockType } from './registry';

/**
 * The block contract. Every block, of every type, has this shape.
 * SPEC.md § Component Library — "The block contract".
 */

export interface Block {
  id: string;
  type: BlockType;
  section: SectionSettings;
  props: Record<string, unknown>;
}

export const blockBaseSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.string().min(1),
  section: sectionSettingsSchema,
  props: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Merge a component's defaults *under* stored props.
 *
 * This is what makes promoting a component from `placeholder` to
 * `implemented` backward-compatible: blocks already sitting in drafts and
 * versions carry props that predate the schema, and merging defaults
 * underneath turns them into valid, empty instances of the real component
 * rather than validation failures. SPEC.md § Component Build-Out.
 */
export function mergeDefaultProps(
  type: BlockType,
  props: Record<string, unknown>,
): Record<string, unknown> {
  return { ...REGISTRY[type].defaultProps, ...props };
}

/**
 * Full block validation, including the status gate: `section` is validated
 * strictly always; `props` strictly only when the component is implemented.
 */
export const blockSchema = blockBaseSchema.transform((block, ctx): Block => {
  if (!isBlockType(block.type)) {
    ctx.addIssue({
      code: 'custom',
      path: ['type'],
      message: `Unknown component type "${block.type}"`,
    });
    return z.NEVER;
  }

  const entry = REGISTRY[block.type];

  // Placeholder components accept any props object untouched.
  if (entry.status !== 'implemented' || !entry.propsSchema) {
    return { ...block, type: block.type } as Block;
  }

  const result = entry.propsSchema.safeParse(mergeDefaultProps(block.type, block.props));
  if (!result.success) {
    for (const issue of result.error.issues) {
      ctx.addIssue({
        code: 'custom',
        path: ['props', ...issue.path],
        message: issue.message,
      });
    }
    return z.NEVER;
  }

  return {
    ...block,
    type: block.type,
    props: result.data as Record<string, unknown>,
  };
});

/** A page's stack. SPEC.md caps a page at 30 blocks. */
export const MAX_BLOCKS_PER_PAGE = 30;

export const blocksSchema = z
  .array(blockSchema)
  .max(MAX_BLOCKS_PER_PAGE)
  .superRefine((blocks, ctx) => {
    const seenIds = new Set<string>();
    const seenAnchors = new Set<string>();
    blocks.forEach((block, index) => {
      if (seenIds.has(block.id)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: `Duplicate block id "${block.id}"`,
        });
      }
      seenIds.add(block.id);

      const anchor = block.section.anchorId;
      if (anchor) {
        if (seenAnchors.has(anchor)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'section', 'anchorId'],
            message: `Duplicate anchor id "${anchor}"`,
          });
        }
        seenAnchors.add(anchor);
      }
    });
  });
