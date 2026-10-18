import Decimal from 'decimal.js';

// §22.1 Dimensional Selling: when both length and width are provided, the
// effective quantity is area-based (qty × L × W); otherwise it's just qty.
// Stock movements still use the raw `quantity` (piece/sheet count), not this —
// see electron/handlers/sales.ts.
export function effectiveQuantity(
  quantity: number,
  length?: number | null,
  width?: number | null
): number {
  if (length && length > 0 && width && width > 0) {
    return new Decimal(quantity).times(length).times(width).toNumber();
  }
  return quantity;
}

export function calcLineTotal(
  quantity: number,
  length: number | null | undefined,
  width: number | null | undefined,
  unitPrice: number,
  discountPercent: number = 0
): number {
  const effQty = effectiveQuantity(quantity, length, width);
  return new Decimal(effQty)
    .times(unitPrice)
    .times(new Decimal(1).minus(new Decimal(discountPercent).div(100)))
    .toNumber();
}
