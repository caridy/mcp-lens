/**
 * Shared helpers used by the tool modules (show-lens, presets).
 * Kept deliberately small — just the two tiny error-formatting helpers — so
 * each tool module stays readable on its own.
 *
 * Intentionally not re-exported from the package index; these are for
 * internal use across sibling tool modules.
 */

export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'unknown error';
}

export function toolError(message: string) {
  return {
    isError: true as const,
    content: [
      {
        type: 'text' as const,
        text: message,
      },
    ],
  };
}
