import { describe, it, expect } from 'vitest';
import { parseVariantText, stringifyVariant } from '../variantAttributes';

describe('variantAttributes', () => {
  it('parses comma-separated key:value pairs', () => {
    expect(parseVariantText('thickness:18mm, grade:Commercial')).toEqual({
      thickness: '18mm',
      grade: 'Commercial',
    });
  });

  it('returns null for empty input', () => {
    expect(parseVariantText('')).toBeNull();
    expect(parseVariantText('   ')).toBeNull();
  });

  it('skips malformed pairs without a colon', () => {
    expect(parseVariantText('thickness:18mm, junk, grade:Commercial')).toEqual({
      thickness: '18mm',
      grade: 'Commercial',
    });
  });

  it('round-trips through stringifyVariant', () => {
    const attrs = { thickness: '18mm', grade: 'Commercial' };
    expect(parseVariantText(stringifyVariant(attrs))).toEqual(attrs);
  });

  it('stringifyVariant returns empty string for null/undefined', () => {
    expect(stringifyVariant(null)).toBe('');
    expect(stringifyVariant(undefined)).toBe('');
  });
});
