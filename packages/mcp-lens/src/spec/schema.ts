/**
 * Zod runtime validator for the lens spec.
 *
 * The TypeScript types in `types.ts` are the authoring surface for server
 * authors writing TypeScript. This file is the runtime contract — everything
 * crossing the tool-call boundary flows through here.
 *
 * Kept in lockstep with `types.ts` by hand. If the two drift, tests fail.
 */

import { z } from 'zod';
import { LENS_SPEC_VERSION, type LensNode } from './types.js';

// ── Shared enums ────────────────────────────────────────────────────────────

const spacingSchema = z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']);
const alignCrossAxisSchema = z.enum(['start', 'center', 'end', 'stretch']);
const justifyMainAxisSchema = z.enum([
  'start',
  'center',
  'end',
  'space-between',
  'space-around',
]);
const backgroundSchema = z.enum(['none', 'subtle', 'muted']);
const textVariantSchema = z.enum([
  'display',
  'heading',
  'subheading',
  'body',
  'caption',
  'label',
]);
const toneSchema = z.enum(['neutral', 'info', 'success', 'warning', 'danger']);
const buttonVariantSchema = z.enum(['primary', 'secondary', 'ghost']);
const linkVariantSchema = z.enum(['inline', 'standalone']);

/**
 * Enforce http(s) on link hrefs — prevents `javascript:`, `data:`,
 * `file:`, and other schemes that could be abused or are meaningless
 * outside a browser context.
 */
const httpUrlSchema = z
  .string()
  .url()
  .refine((s) => /^https?:\/\//i.test(s), {
    message: 'href must start with http:// or https://',
  });

// ── Forward declaration for recursive schemas ───────────────────────────────
//
// The discriminated union references container schemas which reference it
// back. We declare the union as a `z.lazy` wrapper first so container
// schemas can close over it, then materialize the union body at the bottom.

// eslint-disable-next-line @typescript-eslint/no-use-before-define
export const lensNodeSchema: z.ZodType<LensNode> = z.lazy(() => lensNodeUnion);

// ── Leaf nodes ──────────────────────────────────────────────────────────────

const textNodeSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  variant: textVariantSchema.optional(),
  tone: toneSchema.optional(),
});

const markdownNodeSchema = z.object({
  type: z.literal('markdown'),
  markdown: z.string(),
});

const imageNodeSchema = z.object({
  type: z.literal('image'),
  src: z.string().url(),
  alt: z.string(),
  aspectRatio: z.enum(['square', 'video', 'wide', 'portrait']).optional(),
  fit: z.enum(['cover', 'contain']).optional(),
});

const badgeNodeSchema = z.object({
  type: z.literal('badge'),
  label: z.string(),
  tone: toneSchema.optional(),
});

const separatorNodeSchema = z.object({
  type: z.literal('separator'),
});

const buttonNodeSchema = z.object({
  type: z.literal('button'),
  label: z.string().min(1),
  prompt: z.string().min(1),
  variant: buttonVariantSchema.optional(),
  tone: toneSchema.optional(),
  closeOnClick: z.boolean().optional(),
});

const linkNodeSchema = z.object({
  type: z.literal('link'),
  label: z.string().min(1),
  href: httpUrlSchema,
  variant: linkVariantSchema.optional(),
  tone: toneSchema.optional(),
});

const tableFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
});

const tableItemSchema = z.object({
  label: z.string().min(1),
  subtitle: z.string().optional(),
  imageSrc: z.string().url().optional(),
  values: z.record(z.string(), z.string()),
});

const tableNodeSchema = z.object({
  type: z.literal('table'),
  title: z.string().optional(),
  fields: z.array(tableFieldSchema).min(1),
  items: z.array(tableItemSchema).min(2),
  highlightDifferences: z.boolean().optional(),
});

// ── Container nodes (reference lensNodeSchema via closure) ──────────────────

const columnNodeSchema = z.object({
  type: z.literal('column'),
  gap: spacingSchema.optional(),
  align: alignCrossAxisSchema.optional(),
  children: z.array(lensNodeSchema),
});

const rowNodeSchema = z.object({
  type: z.literal('row'),
  gap: spacingSchema.optional(),
  align: alignCrossAxisSchema.optional(),
  justify: justifyMainAxisSchema.optional(),
  equalWidth: z.boolean().optional(),
  children: z.array(lensNodeSchema),
});

const boxNodeSchema = z.object({
  type: z.literal('box'),
  padding: spacingSchema.optional(),
  background: backgroundSchema.optional(),
  children: z.array(lensNodeSchema),
});

const cardNodeSchema = z.object({
  type: z.literal('card'),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  padding: spacingSchema.optional(),
  children: z.array(lensNodeSchema),
});

const listNodeSchema = z.object({
  type: z.literal('list'),
  items: z.array(lensNodeSchema),
  divider: z.enum(['none', 'line']).optional(),
});

// ── Materialize the discriminated union ─────────────────────────────────────

const lensNodeUnion = z.discriminatedUnion('type', [
  textNodeSchema,
  markdownNodeSchema,
  imageNodeSchema,
  badgeNodeSchema,
  separatorNodeSchema,
  buttonNodeSchema,
  linkNodeSchema,
  tableNodeSchema,
  columnNodeSchema,
  rowNodeSchema,
  boxNodeSchema,
  cardNodeSchema,
  listNodeSchema,
]);

// ── Root schema ─────────────────────────────────────────────────────────────

export const lensChromeSchema = z.object({
  suppressFeedback: z.boolean().optional(),
});

export const lensSpecSchema = z.object({
  specVersion: z.literal(LENS_SPEC_VERSION),
  chrome: lensChromeSchema.optional(),
  root: lensNodeSchema,
});

export type LensSpecParsed = z.infer<typeof lensSpecSchema>;
