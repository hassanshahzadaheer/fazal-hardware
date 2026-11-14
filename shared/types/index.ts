// Shared types for Fazal Hardware, per docs/Fazal_Hardware_PRD.md §4.
// IDs are `number` (SQLite INTEGER PRIMARY KEY AUTOINCREMENT), not the PRD's
// illustrative `string` (which assumed Mongo-style ids from the old Base44 backend).
// Field names are camelCase at the API/type boundary; electron/db stores snake_case
// columns — handlers (Phase 2+) are responsible for mapping between the two.

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: any } };

import {
  BaseUnit,
  CustomerType,
  PriceTier,
  DocPaymentMode,
  SaleStatus,
  PurchaseStatus,
  QuotationStatus,
  ExpensePaymentMode,
  StockMovementType,
  StockMovementReferenceType,
  PaymentPartyType,
  PaymentDirection,
  PaymentMode,
  PaymentReferenceType,
  UserRole,
} from '../constants';

export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  createdDate: string;
  updatedDate: string;
  createdById: number | null;
}

export interface Brand {
  id: number;
  name: string;
  createdDate: string;
  updatedDate: string;
  createdById: number | null;
}

export interface Product {
  id: number;
  productCode: string | null;
  name: string;
  categoryId: number | null;
  brandId: number | null;
  variantAttributes: Record<string, string> | null;
  baseUnit: BaseUnit;
  purchaseUnit: string | null;
  purchaseUnitFactor: number | null;
  retailPrice: number | null;
  wholesalePrice: number | null;
  costPrice: number | null;
  reorderLevel: number | null;
  rackLocation: string | null;
  barcode: string | null;
  color: string | null;
  packingSize: string | null;
  minSalePrice: number | null;
  length: number | null;
  width: number | null;
  stockOnHand: number;
  isActive: boolean;
  createdDate: string;
  updatedDate: string;
  createdById: number | null;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  type: CustomerType | null;
  address: string | null;
  balance: number;
  createdDate: string;
  updatedDate: string;
  createdById: number | null;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  balance: number;
  createdDate: string;
  updatedDate: string;
  createdById: number | null;
}

// Sales/Quotation line item — supports dimensional (L×W) selling per §22.1.
export interface LineItem {
  productId: number;
  productName: string;
  quantity: number;
  unit: string;
  length?: number | null;
  width?: number | null;
  unitPrice: number;
  discountPercent?: number;
  lineTotal: number;
}

// Purchase line item — no dimensional selling, no per-line discount (§10.2).
export interface PurchaseLineItem {
  productId: number;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export interface SaleInvoice {
  id: number;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string | null;
  items: LineItem[];
  subtotal: number;
  discountAmount: number;
  freightAmount: number;
  total: number;
  paidAmount: number;
  paymentMode: DocPaymentMode | null;
  status: SaleStatus;
  priceTier: PriceTier;
  quotationId: number | null;
  notes: string | null;
  createdDate: string;
  updatedDate: string;
  createdById: number | null;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId: number | null;
  supplierName: string | null;
  items: PurchaseLineItem[];
  subtotal: number;
  freightAmount: number;
  total: number;
  paidAmount: number;
  paymentMode: DocPaymentMode | null;
  status: PurchaseStatus;
  notes: string | null;
  createdDate: string;
  updatedDate: string;
  createdById: number | null;
}

export interface Quotation {
  id: number;
  quotationNumber: string;
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  remarks: string | null;
  items: LineItem[];
  subtotal: number;
  discountAmount: number;
  freightAmount: number;
  total: number;
  status: QuotationStatus;
  convertedToInvoiceId: number | null;
  validUntil: string | null;
  notes: string | null;
  createdDate: string;
  updatedDate: string;
  createdById: number | null;
}

export interface Expense {
  id: number;
  date: string;
  expenseHead: string;
  description: string | null;
  amount: number;
  paymentMode: ExpensePaymentMode;
  reference: string | null;
  notes: string | null;
  createdDate: string;
  updatedDate: string;
  createdById: number | null;
}

export interface StockMovement {
  id: number;
  productId: number;
  type: StockMovementType;
  quantity: number;
  referenceType: StockMovementReferenceType | null;
  referenceId: number | null;
  notes: string | null;
  costPriceAtTime: number | null;
  createdDate: string;
  updatedDate: string;
  createdById: number | null;
}

export interface Payment {
  id: number;
  partyType: PaymentPartyType;
  partyId: number;
  partyName: string | null;
  amount: number;
  direction: PaymentDirection;
  mode: PaymentMode;
  referenceType: PaymentReferenceType | null;
  referenceId: number | null;
  notes: string | null;
  createdDate: string;
  updatedDate: string;
  createdById: number | null;
}

// Report aggregation shapes (§17), computed server-side in electron/handlers/reports.ts.
export interface ReportSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  stockValue: number;
  lowStockCount: number;
  totalReceivable: number;
  totalPayable: number;
}

export interface SalesByDay {
  date: string;
  revenue: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  qtySold: number;
  revenue: number;
}

export interface LowStockRow {
  id: number;
  name: string;
  stockOnHand: number;
  reorderLevel: number;
  deficit: number;
}

export interface BalanceRow {
  id: number;
  name: string;
  phone: string | null;
  balance: number;
}

// §18: AI Invoice Scanner — structured extraction from a supplier invoice image.
export interface ExtractedInvoiceLineItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface ExtractedInvoice {
  supplierName: string | null;
  invoiceDate: string | null;
  notes: string | null;
  lineItems: ExtractedInvoiceLineItem[];
  total: number | null;
}

// §27: Licensing & Activation — result of checking the signed license file
// against the embedded public key (electron/license/verify.ts).
export type LicenseStatus =
  | { state: 'valid'; clientName: string; expiresAt: string }
  | { state: 'expired'; clientName: string; expiresAt: string }
  | { state: 'invalid' }
  | { state: 'missing' };

// §6: Dashboard aggregate, computed server-side in electron/handlers/dashboard.ts.
export interface DashboardData {
  todayRevenue: number;
  stockValue: number;
  totalReceivable: number;
  totalPayable: number;
  lowStockCount: number;
  lowStockProducts: { id: number; name: string; stockOnHand: number; reorderLevel: number }[];
  recentSales: SaleInvoice[];
}

export interface User {
  id: number;
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdDate: string;
  updatedDate: string;
}

export interface SessionUser {
  id: number;
  email: string;
  fullName: string | null;
  role: UserRole;
}

// Product list/detail views need category/brand names (PRD §7.2 table columns),
// which isn't part of the canonical Product shape above.
export interface ProductWithNames extends Product {
  categoryName: string | null;
  brandName: string | null;
}

// Single-row company info consumed by print templates (resolved Open Question, Task 1.1).
export interface Settings {
  id: 1;
  companyName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdDate: string;
  updatedDate: string;
}
