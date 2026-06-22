import { Role, PaymentMode, UnitType } from '../constants';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: any } };

export interface SessionUser {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  lastLoginAt: string | null;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: number;
  name: string;
  deletedAt: string | null;
}

export interface Category {
  id: number;
  name: string;
  defaultMarginPercent: number;
  loyaltyPointsPer: number;
  loyaltyPointValue: number;
  deletedAt: string | null;
}

export interface Color {
  id: number;
  name: string;
  note: string | null;
  deletedAt: string | null;
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  email: string | null;
  address: string | null;
  openingBalance: number; // in paisa
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  fatherName: string | null;
  contactPerson: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  email: string | null;
  cityId: number | null;
  cityName?: string;
  address: string | null;
  cnic: string | null;
  openingBalance: number; // in paisa
  creditLimit: number; // in paisa
  isClubMember: boolean;
  loyaltyPoints: number;
  picturePath: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  categoryId: number | null;
  categoryName?: string;
  supplierId: number | null;
  supplierName?: string;
  colorId: number | null;
  colorName?: string;
  unit: UnitType;
  packSize: string | null;
  isCutToSize: boolean;
  purchasePrice: number; // in paisa
  salePrice: number; // in paisa
  minPrice: number; // in paisa
  defaultLength: number | null;
  defaultWidth: number | null;
  reorderLevel: number;
  openingStock: number;
  currentStock: number;
  picturePath: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Carpenter {
  id: number;
  name: string;
  mobile: string | null;
  address: string | null;
  deletedAt: string | null;
}

export interface DeliveryMan {
  id: number;
  name: string;
  mobile: string | null;
  deletedAt: string | null;
}

export interface ExpenseHead {
  id: number;
  name: string;
  deletedAt: string | null;
}

export interface Expense {
  id: number;
  docDate: string;
  headId: number;
  headName?: string;
  description: string | null;
  amount: number; // paisa
  mode: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface Settings {
  companyName: string;
  address: string | null;
  phone1: string | null;
  phone2: string | null;
  email: string | null;
  logoPath: string | null;
  currencySymbol: string;
  defaultCustomerId: number | null;
  invoiceFooter: string | null;
  quotationNote: string | null;
  idleLogoutMinutes: number;
  backupDir: string | null;
  lowStockAlert: boolean;
  fiscalYearStart: string | null;
  updatedAt: string;
}

// Transactional documents types
export interface SaleInvoice {
  id: number;
  invoiceNo: number;
  docDate: string;
  customerId: number;
  customerName?: string;
  salesmanId: number | null;
  salesmanName?: string;
  carpenterId: number | null;
  carpenterName?: string;
  quotationId: number | null;
  reference: string | null;
  cellNo: string | null;
  cnic: string | null;
  driver: string | null;
  grossValue: number; // paisa
  discountPercent: number;
  discountAmount: number; // paisa
  freight: number; // paisa
  netValue: number; // paisa
  paidAmount: number; // paisa
  paymentMode: PaymentMode;
  remarks: string | null;
  status: 'posted' | 'void';
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  items?: SaleInvoiceItem[];
}

export interface SaleInvoiceItem {
  id: number;
  invoiceId: number;
  productId: number;
  productCode: string;
  productName: string;
  qty: number;
  length: number | null;
  width: number | null;
  unitPrice: number; // paisa
  saleType: string | null;
  lineTotal: number; // paisa
  costPrice: number; // paisa
  remarks: string | null;
}

export interface Quotation {
  id: number;
  quotationNo: number;
  docDate: string;
  customerId: number;
  customerName?: string;
  reference: string | null;
  cellNo: string | null;
  grossValue: number; // paisa
  discountPercent: number;
  discountAmount: number; // paisa
  freight: number; // paisa
  netValue: number; // paisa
  validUntil: string | null;
  convertedInvoiceId: number | null;
  remarks: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  items?: QuotationItem[];
}

export interface QuotationItem {
  id: number;
  quotationId: number;
  productId: number;
  productCode: string;
  productName: string;
  qty: number;
  length: number | null;
  width: number | null;
  unitPrice: number; // paisa
  lineTotal: number; // paisa
  remarks: string | null;
}

export interface Purchase {
  id: number;
  purchaseNo: number;
  docDate: string;
  supplierId: number;
  supplierName?: string;
  supplierInvoiceRef: string | null;
  grossValue: number; // paisa
  discountPercent: number;
  discountAmount: number; // paisa
  freight: number; // paisa
  netValue: number; // paisa
  paidAmount: number; // paisa
  paymentMode: string | null;
  remarks: string | null;
  status: 'posted' | 'void';
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: number;
  purchaseId: number;
  productId: number;
  productCode: string;
  productName: string;
  qty: number;
  length: number | null;
  width: number | null;
  unitCost: number; // paisa
  lineTotal: number; // paisa
  remarks: string | null;
}

export interface CustomerPayment {
  id: number;
  receiptNo: number;
  docDate: string;
  customerId: number;
  customerName?: string;
  amount: number; // paisa
  mode: 'cash' | 'cheque' | 'bank' | 'card';
  chequeNo: string | null;
  chequeDate: string | null;
  bank: string | null;
  remarks: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface SupplierPayment {
  id: number;
  paymentNo: number;
  docDate: string;
  supplierId: number;
  supplierName?: string;
  amount: number; // paisa
  mode: 'cash' | 'cheque' | 'bank' | 'card';
  chequeNo: string | null;
  chequeDate: string | null;
  bank: string | null;
  remarks: string | null;
  createdBy: number | null;
  createdAt: string;
}

// Ledger Types
export interface StockLedgerRow {
  id: number;
  productId: number;
  productCode?: string;
  productName?: string;
  docDate: string;
  docType: string;
  docId: number | null;
  docNo: number | null;
  qtyIn: number;
  qtyOut: number;
  rate: number; // paisa
  length: number | null;
  width: number | null;
  balanceAfter: number;
  remarks: string | null;
  createdAt: string;
}

export interface PartyLedgerRow {
  id: number;
  partyType: 'customer' | 'supplier';
  partyId: number;
  docDate: string;
  docType: string;
  docId: number | null;
  docNo: number | null;
  debit: number; // paisa
  credit: number; // paisa
  balanceAfter: number; // paisa
  remarks: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: number;
  userId: number | null;
  username?: string;
  action: string;
  entity: string;
  entityId: number | null;
  detailsJson: string | null;
  createdAt: string;
}

// Paging and Queries
export interface Paged<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ProductQuery {
  search?: string;
  categoryId?: number;
  supplierId?: number;
  onlyLowStock?: boolean;
  page: number;
  pageSize: number;
}
