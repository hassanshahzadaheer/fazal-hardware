import { describe, it, expect } from 'vitest';
import { ageDays, maxAgeDays, isOverdue } from '../aging';

describe('aging (Task 6.4)', () => {
  it('computes whole days between a date and now', () => {
    const now = new Date('2026-10-18T12:00:00Z');
    const created = new Date('2026-10-10T12:00:00Z').toISOString();
    expect(ageDays(created, now)).toBe(8);
  });

  it('maxAgeDays takes the oldest of several pending invoices', () => {
    const now = new Date('2026-10-18T00:00:00Z');
    const dates = [
      new Date('2026-10-15T00:00:00Z').toISOString(),
      new Date('2026-09-01T00:00:00Z').toISOString(), // oldest
      new Date('2026-10-17T00:00:00Z').toISOString(),
    ];
    expect(maxAgeDays(dates, now)).toBe(47);
  });

  it('maxAgeDays is 0 for no pending invoices', () => {
    expect(maxAgeDays([])).toBe(0);
  });

  it('is not overdue at exactly 30 days', () => {
    expect(isOverdue(30)).toBe(false);
  });

  it('is overdue past 30 days', () => {
    expect(isOverdue(31)).toBe(true);
  });
});
