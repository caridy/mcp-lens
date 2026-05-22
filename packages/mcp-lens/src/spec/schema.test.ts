import { describe, it, expect } from 'vitest';
import { lensSpecSchema } from './schema.js';
import { LENS_SPEC_VERSION, type LensSpec } from './types.js';

describe('lensSpecSchema', () => {
  it('accepts a minimal text-only lens', () => {
    const spec: LensSpec = {
      specVersion: LENS_SPEC_VERSION,
      root: { type: 'text', text: 'Hello' },
    };
    expect(lensSpecSchema.parse(spec)).toEqual(spec);
  });

  it('accepts a nested card with a button', () => {
    const spec: LensSpec = {
      specVersion: LENS_SPEC_VERSION,
      root: {
        type: 'card',
        title: 'Nike Vaporfly',
        children: [
          {
            type: 'column',
            gap: 'sm',
            children: [
              { type: 'text', text: 'Carbon plate racing shoe' },
              {
                type: 'button',
                label: 'Compare',
                prompt: 'Compare this shoe with the Alphafly',
                variant: 'primary',
              },
            ],
          },
        ],
      },
    };
    expect(lensSpecSchema.parse(spec)).toEqual(spec);
  });

  it('accepts a table node', () => {
    const spec: LensSpec = {
      specVersion: LENS_SPEC_VERSION,
      root: {
        type: 'table',
        title: 'Vaporfly vs Alphafly',
        fields: [
          { key: 'weight', label: 'Weight' },
          { key: 'drop', label: 'Heel drop' },
        ],
        items: [
          {
            label: 'Vaporfly 3',
            values: { weight: '196g', drop: '8mm' },
          },
          {
            label: 'Alphafly 3',
            values: { weight: '210g', drop: '8mm' },
          },
        ],
        highlightDifferences: true,
      },
    };
    expect(lensSpecSchema.parse(spec)).toEqual(spec);
  });

  it('accepts a link node with https href', () => {
    const spec: LensSpec = {
      specVersion: LENS_SPEC_VERSION,
      root: {
        type: 'link',
        label: 'Track shipment',
        href: 'https://carrier.example.com/track/abc',
        variant: 'standalone',
      },
    };
    expect(lensSpecSchema.parse(spec)).toEqual(spec);
  });

  it('accepts a link node with http href', () => {
    const spec: LensSpec = {
      specVersion: LENS_SPEC_VERSION,
      root: {
        type: 'link',
        label: 'Docs',
        href: 'http://localhost:3000/docs',
      },
    };
    expect(lensSpecSchema.parse(spec)).toEqual(spec);
  });

  it('rejects a link with a javascript: href', () => {
    expect(() =>
      lensSpecSchema.parse({
        specVersion: LENS_SPEC_VERSION,
        root: {
          type: 'link',
          label: 'Click me',
          // eslint-disable-next-line no-script-url
          href: 'javascript:alert(1)',
        },
      }),
    ).toThrow();
  });

  it('rejects a link with a data: href', () => {
    expect(() =>
      lensSpecSchema.parse({
        specVersion: LENS_SPEC_VERSION,
        root: {
          type: 'link',
          label: 'Click me',
          href: 'data:text/html,<script>alert(1)</script>',
        },
      }),
    ).toThrow();
  });

  it('rejects a link with an empty label', () => {
    expect(() =>
      lensSpecSchema.parse({
        specVersion: LENS_SPEC_VERSION,
        root: {
          type: 'link',
          label: '',
          href: 'https://example.com',
        },
      }),
    ).toThrow();
  });

  it('rejects a spec with the wrong version', () => {
    expect(() =>
      lensSpecSchema.parse({
        specVersion: '0.2',
        root: { type: 'text', text: 'x' },
      }),
    ).toThrow();
  });

  it('rejects an unknown node type', () => {
    expect(() =>
      lensSpecSchema.parse({
        specVersion: LENS_SPEC_VERSION,
        root: { type: 'heading', text: 'x' },
      }),
    ).toThrow();
  });

  it('rejects a button without a prompt', () => {
    expect(() =>
      lensSpecSchema.parse({
        specVersion: LENS_SPEC_VERSION,
        root: { type: 'button', label: 'Click' },
      }),
    ).toThrow();
  });

  it('rejects a table with only one item', () => {
    expect(() =>
      lensSpecSchema.parse({
        specVersion: LENS_SPEC_VERSION,
        root: {
          type: 'table',
          fields: [{ key: 'x', label: 'x' }],
          items: [{ label: 'only', values: { x: '1' } }],
        },
      }),
    ).toThrow();
  });

  it('rejects an image without alt text', () => {
    expect(() =>
      lensSpecSchema.parse({
        specVersion: LENS_SPEC_VERSION,
        root: { type: 'image', src: 'https://example.com/a.png' },
      }),
    ).toThrow();
  });

  it('accepts chrome.suppressFeedback', () => {
    const spec: LensSpec = {
      specVersion: LENS_SPEC_VERSION,
      chrome: { suppressFeedback: true },
      root: { type: 'text', text: 'Confirm?' },
    };
    expect(lensSpecSchema.parse(spec)).toEqual(spec);
  });

  it('accepts a button with closeOnClick', () => {
    const spec: LensSpec = {
      specVersion: LENS_SPEC_VERSION,
      root: {
        type: 'button',
        label: 'Pick the Vaporfly',
        prompt: "I'll go with the Vaporfly 3",
        variant: 'primary',
        closeOnClick: true,
      },
    };
    expect(lensSpecSchema.parse(spec)).toEqual(spec);
  });
});
