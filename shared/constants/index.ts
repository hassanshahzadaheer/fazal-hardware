export type Role = 'admin' | 'manager' | 'cashier' | 'storekeeper' | 'accountant';

export const Roles = {
  ADMIN: 'admin' as Role,
  MANAGER: 'manager' as Role,
  CASHIER: 'cashier' as Role,
  STOREKEEPER: 'storekeeper' as Role,
  ACCOUNTANT: 'accountant' as Role,
} as const;

export type DocType = 'opening' | 'sale' | 'sale_return' | 'purchase' | 'purchase_return' | 'receipt' | 'payment' | 'adjustment';

export const DocTypes = {
  OPENING: 'opening' as DocType,
  SALE: 'sale' as DocType,
  SALE_RETURN: 'sale_return' as DocType,
  PURCHASE: 'purchase' as DocType,
  PURCHASE_RETURN: 'purchase_return' as DocType,
  RECEIPT: 'receipt' as DocType,
  PAYMENT: 'payment' as DocType,
  ADJUSTMENT: 'adjustment' as DocType,
} as const;

export type PaymentMode = 'cash' | 'credit' | 'card' | 'bank' | 'cheque' | 'mixed';

export const PaymentModes = {
  CASH: 'cash' as PaymentMode,
  CREDIT: 'credit' as PaymentMode,
  CARD: 'card' as PaymentMode,
  BANK: 'bank' as PaymentMode,
  CHEQUE: 'cheque' as PaymentMode,
  MIXED: 'mixed' as PaymentMode,
} as const;

export type UnitType = 'pcs' | 'sheet' | 'sqft' | 'rft' | 'kg' | 'set';

export const UnitTypes = {
  PCS: 'pcs' as UnitType,
  SHEET: 'sheet' as UnitType,
  SQFT: 'sqft' as UnitType,
  RFT: 'rft' as UnitType,
  KG: 'kg' as UnitType,
  SET: 'set' as UnitType,
} as const;
