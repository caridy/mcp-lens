import type { TableNode } from '../../../src/spec/types.js';

export function Table({ node }: { node: TableNode }) {
  const diffSet = node.highlightDifferences
    ? computeDiffFields(node)
    : new Set<string>();

  return (
    <div className="lens-table">
      {node.title ? (
        <div className="lens-table-title">{node.title}</div>
      ) : null}
      <div
        className="lens-table-grid"
        style={
          {
            ['--lens-table-cols' as never]: node.items.length,
          } as React.CSSProperties
        }
      >
        {/* Header row: item labels */}
        <div className="lens-table-corner" />
        {node.items.map((item, i) => (
          <div key={`h-${i}`} className="lens-table-header">
            {item.imageSrc ? (
              <img
                className="lens-table-image"
                src={item.imageSrc}
                alt={item.label}
              />
            ) : null}
            <div className="lens-table-item-label">{item.label}</div>
            {item.subtitle ? (
              <div className="lens-table-item-subtitle">{item.subtitle}</div>
            ) : null}
          </div>
        ))}

        {/* Body rows: one per field */}
        {node.fields.map((field) => (
          <div key={`row-${field.key}`} className="lens-table-row">
            <div className="lens-table-field-label">{field.label}</div>
            {node.items.map((item, i) => (
              <div
                key={`cell-${field.key}-${i}`}
                className={
                  'lens-table-cell' +
                  (diffSet.has(field.key) ? ' lens-table-cell-diff' : '')
                }
              >
                {item.values[field.key] ?? '—'}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Return the set of field keys whose values differ across the compared
 * items. Missing values normalize to the empty string; a field that is
 * missing on every item does NOT count as a diff. A field present on some
 * items and missing on others DOES.
 *
 * Exported for testing.
 */
export function computeDiffFields(node: TableNode): Set<string> {
  const diffs = new Set<string>();
  for (const field of node.fields) {
    const values = node.items.map((i) => i.values[field.key] ?? '');
    const unique = new Set(values);
    if (unique.size > 1) diffs.add(field.key);
  }
  return diffs;
}
