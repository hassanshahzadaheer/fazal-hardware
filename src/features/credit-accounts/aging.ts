// §14.2: age in days = days since the oldest pending (credit/partial) invoice;
// overdue if that age exceeds 30 days.
export function ageDays(createdDate: string, now: Date = new Date()): number {
  const created = new Date(createdDate);
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function maxAgeDays(createdDates: string[], now: Date = new Date()): number {
  if (createdDates.length === 0) return 0;
  return Math.max(...createdDates.map((d) => ageDays(d, now)));
}

export function isOverdue(days: number): boolean {
  return days > 30;
}
