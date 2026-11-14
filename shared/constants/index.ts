// Shared enums/constants for Fazal Hardware, per docs/Fazal_Hardware_PRD.md §4.

export const BASE_UNITS = [
  'piece', 'foot', 'meter', 'kg', 'sheet', 'litre', 'box',
  'set', 'pair', 'roll', 'bag', 'bundle', 'carton', 'dozen',
] as const;
export type BaseUnit = typeof BASE_UNITS[number];

export const CUSTOMER_TYPES = ['retail', 'contractor', 'wholesale'] as const;
export type CustomerType = typeof CUSTOMER_TYPES[number];

export const PRICE_TIERS = ['retail', 'wholesale'] as const;
export type PriceTier = typeof PRICE_TIERS[number];

// Shared by SaleInvoice.payment_mode and PurchaseOrder.payment_mode (§4.7, §4.8).
export const PAYMENT_MODES_DOC = ['cash', 'card', 'credit', 'partial'] as const;
export type DocPaymentMode = typeof PAYMENT_MODES_DOC[number];

export const SALE_STATUSES = ['completed', 'credit', 'partial', 'returned'] as const;
export type SaleStatus = typeof SALE_STATUSES[number];

export const PURCHASE_STATUSES = ['received', 'partial', 'credit', 'returned'] as const;
export type PurchaseStatus = typeof PURCHASE_STATUSES[number];

export const QUOTATION_STATUSES = ['draft', 'sent', 'converted', 'cancelled'] as const;
export type QuotationStatus = typeof QUOTATION_STATUSES[number];

export const EXPENSE_PAYMENT_MODES = ['cash', 'bank_transfer', 'cheque', 'other'] as const;
export type ExpensePaymentMode = typeof EXPENSE_PAYMENT_MODES[number];

export const EXPENSE_HEADS = [
  'Rent', 'Electricity', 'Salary / Wages', 'Transport / Freight', 'Maintenance',
  'Telephone / Internet', 'Printing & Stationery', 'Bank Charges', 'Miscellaneous', 'Other',
] as const;
export type ExpenseHead = typeof EXPENSE_HEADS[number];

export const STOCK_MOVEMENT_TYPES = [
  'purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment', 'wastage', 'opening',
] as const;
export type StockMovementType = typeof STOCK_MOVEMENT_TYPES[number];

export const STOCK_MOVEMENT_REFERENCE_TYPES = [
  'sale_invoice', 'purchase_order', 'adjustment', 'wastage', 'opening', 'sale_return', 'purchase_return',
] as const;
export type StockMovementReferenceType = typeof STOCK_MOVEMENT_REFERENCE_TYPES[number];

export const PAYMENT_PARTY_TYPES = ['customer', 'supplier'] as const;
export type PaymentPartyType = typeof PAYMENT_PARTY_TYPES[number];

export const PAYMENT_DIRECTIONS = ['received', 'paid'] as const;
export type PaymentDirection = typeof PAYMENT_DIRECTIONS[number];

export const PAYMENT_MODES = ['cash', 'card', 'bank_transfer', 'cheque', 'other'] as const;
export type PaymentMode = typeof PAYMENT_MODES[number];

export const PAYMENT_REFERENCE_TYPES = ['sale_invoice', 'purchase_order', 'general'] as const;
export type PaymentReferenceType = typeof PAYMENT_REFERENCE_TYPES[number];

// Ships admin-only (Phase 1 Task 1.3 decision); 'user' reserved for a future
// permission matrix so the column never needs a migration to grow roles.
export const USER_ROLES = ['admin', 'user'] as const;
export type UserRole = typeof USER_ROLES[number];

// The Product screen offers exactly these categories (client call 2026-11-14).
export const PRODUCT_CATEGORIES = ['Wood', 'Plywood', 'Hardware'] as const;
