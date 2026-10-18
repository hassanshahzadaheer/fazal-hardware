// Parses the PRD's "Variant Details" free-text field (§7.3: "thickness:18mm, grade:Commercial")
// into the JSON object stored on Product.variantAttributes, and back for editing.

export function parseVariantText(text: string): Record<string, string> | null {
  const pairs = text
    .trim()
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const result: Record<string, string> = {};
  for (const pair of pairs) {
    const separatorIndex = pair.indexOf(':');
    if (separatorIndex === -1) continue;
    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (key && value) result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function stringifyVariant(attrs: Record<string, string> | null | undefined): string {
  if (!attrs) return '';
  return Object.entries(attrs)
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
}
