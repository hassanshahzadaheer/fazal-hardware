import { describe, it, expect } from 'vitest';
import { findBestMatch } from '../productMatch';

describe('findBestMatch (Task 10.3) — §18.3 fuzzy matching', () => {
  const products = [
    { id: 1, name: 'Plywood Commercial 18mm' },
    { id: 2, name: 'Cement Bag 50kg' },
    { id: 3, name: 'PVC Pipe 1/2 inch' },
  ];

  it('matches on word overlap when the score meets the threshold', () => {
    const match = findBestMatch('Plywood 18mm Commercial Grade', products);
    expect(match?.id).toBe(1);
  });

  it('picks the highest-scoring product when multiple share some words', () => {
    const match = findBestMatch('Cement Bag good quality 50kg', products);
    expect(match?.id).toBe(2);
  });

  it('returns null when nothing scores at or above the threshold', () => {
    const match = findBestMatch('Steel Rod 12mm', products);
    expect(match).toBeNull();
  });

  it('returns null for an empty product list', () => {
    expect(findBestMatch('Plywood 18mm', [])).toBeNull();
  });

  it('ignores short words (<=2 chars) that would otherwise cause noisy matches', () => {
    // "PVC" and "Pipe" are the only words with enough signal; "of" etc. should not count.
    const match = findBestMatch('PVC Pipe of good quality', products);
    expect(match?.id).toBe(3);
  });
});
