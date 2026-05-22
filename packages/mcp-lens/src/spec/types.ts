/**
 * Lens spec type definitions.
 *
 * A lens is a small, structural description of a view. The agent composes a
 * lens at runtime; the renderer displays it. The spec is deliberately narrow:
 * containers, a small set of content primitives, two interactive elements
 * (button → follow-up prompt; link → external navigation), and a table
 * primitive for side-by-side structured views. No expression language,
 * no data providers, no state.
 *
 * Every node is a discriminated union on `type`. Adding a node type is a
 * breaking spec change and bumps `specVersion`.
 */

/** Current lens spec version. Bump on breaking changes. */
export const LENS_SPEC_VERSION = '0.1' as const;
export type LensSpecVersion = typeof LENS_SPEC_VERSION;

// ────────────────────────────────────────────────────────────────────────────
// Root
// ────────────────────────────────────────────────────────────────────────────

export interface LensSpec {
  /** Spec version this lens is authored against. */
  specVersion: LensSpecVersion;

  /**
   * Renderer chrome controls. Chrome is the renderer's own UI (e.g., the
   * thumbs-up/down affordances) that sits outside the composed content.
   */
  chrome?: LensChrome;

  /** The single root node of the lens. */
  root: LensNode;
}

export interface LensChrome {
  /**
   * Suppress the thumbs-up / thumbs-down feedback affordances for this lens.
   * Use sparingly — for confirmation dialogs or destructive-action prompts
   * where "did you like this view?" is out of place.
   */
  suppressFeedback?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Nodes (discriminated union on `type`)
// ────────────────────────────────────────────────────────────────────────────

export type LensNode =
  | ColumnNode
  | RowNode
  | BoxNode
  | CardNode
  | TextNode
  | MarkdownNode
  | ImageNode
  | BadgeNode
  | SeparatorNode
  | ButtonNode
  | LinkNode
  | ListNode
  | TableNode;

// ── Containers ──────────────────────────────────────────────────────────────

/** Vertical stack. Children flow top to bottom. */
export interface ColumnNode {
  type: 'column';
  gap?: Spacing;
  align?: AlignCrossAxis;
  children: LensNode[];
}

/** Horizontal stack. Children flow left to right. Wraps on narrow widths. */
export interface RowNode {
  type: 'row';
  gap?: Spacing;
  align?: AlignCrossAxis;
  justify?: JustifyMainAxis;
  /** When true, children share available width equally. */
  equalWidth?: boolean;
  children: LensNode[];
}

/** Plain container. No elevation, no border unless specified. */
export interface BoxNode {
  type: 'box';
  padding?: Spacing;
  background?: Background;
  children: LensNode[];
}

// ── Surfaces ────────────────────────────────────────────────────────────────

/** Elevated surface with built-in padding. The common wrapper for content. */
export interface CardNode {
  type: 'card';
  /** Optional title rendered at the top of the card. */
  title?: string;
  /** Optional subtitle rendered below the title. */
  subtitle?: string;
  padding?: Spacing;
  children: LensNode[];
}

// ── Content primitives ──────────────────────────────────────────────────────

/** Plain text. Use `variant` for semantic weight; no freeform styling. */
export interface TextNode {
  type: 'text';
  text: string;
  variant?: TextVariant;
  tone?: Tone;
}

/** Rendered markdown. For rich prose only; avoid for short labels. */
export interface MarkdownNode {
  type: 'markdown';
  markdown: string;
}

/** Image. Always include `alt` for accessibility. */
export interface ImageNode {
  type: 'image';
  src: string;
  alt: string;
  /** Aspect ratio hint. Renderer may adapt to available space. */
  aspectRatio?: 'square' | 'video' | 'wide' | 'portrait';
  fit?: 'cover' | 'contain';
}

/** Small pill-shaped label. For status, category, tag. */
export interface BadgeNode {
  type: 'badge';
  label: string;
  tone?: Tone;
}

/** Visual divider. Has no content. */
export interface SeparatorNode {
  type: 'separator';
}

// ── Interactive ─────────────────────────────────────────────────────────────

/**
 * Conversational action. Clicking a button emits a follow-up prompt to the
 * agent via the host bridge — as if the user had typed it. The widget never
 * calls tools or APIs directly; every action flows through the agent.
 *
 * Use a button when the action is something the user could have typed:
 * "cancel my order", "compare these two shoes". For external URLs that
 * should leave the conversation (tracking links, invoices, supplier pages),
 * use `link` instead.
 */
export interface ButtonNode {
  type: 'button';
  label: string;
  /**
   * Natural-language prompt emitted to the agent when clicked. Write it as
   * the user would type it, e.g. "Compare these two shoes side by side".
   */
  prompt: string;
  variant?: ButtonVariant;
  tone?: Tone;
  /**
   * If true, the renderer dismisses the widget after emitting the prompt
   * (via `window.openai.requestClose`). Defaults to false — the widget
   * stays on screen until the next lens replaces it.
   *
   * Set this on **decisive** clicks where the moment is clearly over:
   *   - "Pick the {item}" buttons in a comparison (the choice is final).
   *   - Buttons inside a confirmation dialog (the user has decided).
   *
   * Leave it default on **transitional** clicks where the next lens
   * replaces this one anyway:
   *   - "Details" / "Open" buttons in a browsing list.
   *   - "See similar" / "Compare with another" lateral moves.
   *
   * If the host doesn't expose a close capability, this flag silently
   * becomes a no-op — the widget stays on screen and the prompt still
   * goes through.
   */
  closeOnClick?: boolean;
}

/**
 * External navigation. Clicking a link opens the given URL via the host's
 * external-open capability (e.g., `window.openai.openExternal`), with a
 * best-effort `window.open(..., '_blank', 'noopener')` fallback. The widget
 * never navigates itself within the iframe.
 *
 * Use a link when the destination is genuinely outside the conversation
 * (tracking URL, product page, PDF invoice, supplier spec sheet). For any
 * action the user could express in words, use `button` instead.
 */
export interface LinkNode {
  type: 'link';
  label: string;
  /** Must start with `http://` or `https://`. */
  href: string;
  /**
   * `standalone` (default) renders as a button with an external-arrow icon.
   * `inline` renders as a text-flow hyperlink, suitable inside a sentence.
   */
  variant?: LinkVariant;
  tone?: Tone;
}

// ── List ────────────────────────────────────────────────────────────────────

/**
 * A list of items. Each item is itself a lens node (typically a card or
 * row). Prefer this over repeated children in a column when the items are
 * semantically a collection.
 */
export interface ListNode {
  type: 'list';
  items: LensNode[];
  /** Separator style between items. Default: none. */
  divider?: 'none' | 'line';
}

// ── Table ───────────────────────────────────────────────────────────────────

/**
 * Structured view of multiple items across a shared set of fields. The
 * motivating use case for MCP Lens: the agent composes a side-by-side view
 * at runtime without the tool author having pre-built one.
 *
 * Orientation (deliberate): each `field` is rendered as a **row** of the
 * table; each `item` is rendered as a **column**. This orientation suits
 * comparison ("how does A differ from B on N attributes?") better than
 * traditional rows-as-items tables when the item count is small and the
 * field count is moderate. The field names are preserved (`fields`,
 * `items`) to make the orientation explicit — do not assume a typical
 * columns-as-fields table.
 *
 * Values are indexed by field key.
 */
export interface TableNode {
  type: 'table';
  /** Optional heading above the table. */
  title?: string;
  /** Fields, rendered as rows. */
  fields: TableField[];
  /** Items, rendered as columns. Typically 2–4. */
  items: TableItem[];
  /**
   * Highlight cells whose values differ across items for a given field.
   * Useful for comparisons; purely presentational.
   */
  highlightDifferences?: boolean;
}

export interface TableField {
  /** Key used to look up values from each item. */
  key: string;
  /** Human-readable label for the field (rendered in the UI). */
  label: string;
}

export interface TableItem {
  /** Column header for this item. */
  label: string;
  /** Optional subtitle below the label. */
  subtitle?: string;
  /** Optional image for this item. */
  imageSrc?: string;
  /** Values, keyed by `TableField.key`. Missing keys render as "—". */
  values: Record<string, string>;
}

// ────────────────────────────────────────────────────────────────────────────
// Shared enums
// ────────────────────────────────────────────────────────────────────────────

export type Spacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AlignCrossAxis = 'start' | 'center' | 'end' | 'stretch';
export type JustifyMainAxis =
  | 'start'
  | 'center'
  | 'end'
  | 'space-between'
  | 'space-around';
export type Background = 'none' | 'subtle' | 'muted';
export type TextVariant =
  | 'display'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'caption'
  | 'label';
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type LinkVariant = 'inline' | 'standalone';
