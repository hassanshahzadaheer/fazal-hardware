import { describe, it, expect } from 'vitest';
import { effectiveQuantity, calcLineTotal } from '../lineTotal';

describe('lineTotal (Task 4.2)', () => {
  it('effectiveQuantity is just quantity when no dimensions are given', () => {
    expect(effectiveQuantity(5)).toBe(5);
    expect(effectiveQuantity(5, null, null)).toBe(5);
    expect(effectiveQuantity(5, 0, 0)).toBe(5);
  });

  it('effectiveQuantity is qty × L × W when both dimensions are given', () => {
    expect(effectiveQuantity(2, 8, 4)).toBe(64);
  });

  it('ignores a single dimension without its pair', () => {
    expect(effectiveQuantity(2, 8, null)).toBe(2);
    expect(effectiveQuantity(2, null, 4)).toBe(2);
  });

  it('calcLineTotal with no discount', () => {
    expect(calcLineTotal(2, 8, 4, 2500)).toBe(160000); // 2*8*4 * 2500
  });

  it('calcLineTotal applies discount percent', () => {
    expect(calcLineTotal(2, null, null, 100, 10)).toBe(180); // 2 * 100 * 0.9
  });

  it('avoids float drift that plain JS multiplication would introduce', () => {
    // 0.1 + 0.2 !== 0.3 in plain float math; this case exercises decimal.js
    // doing the same kind of fractional multiplication without drift.
    const total = calcLineTotal(3, null, null, 0.1, 0);
    expect(total).toBe(0.3);
  });
});
