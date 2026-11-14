// Shared zod validation schemas for Fazal Hardware, per docs/Fazal_Hardware_PRD.md §4.
// `*CreateSchema` validates the payload an IPC `*:create` handler accepts;
// `*UpdateSchema` is the same shape made partial (PATCH-style) unless noted.

import { z } from 'zod';
import {
  BASE_UNITS,
  CUSTOMER_TYPES,
  PRICE_TIERS,
  PAYMENT_MODES_DOC,
  EXPENSE_PAYMENT_MODES,
  STOCK_MOVEMENT_TYPES,
  STOCK_MOVEMENT_REFERENCE_TYPES,
  PAYMENT_PARTY_TYPES,
  PAYMENT_DIRECTIONS,
  PAYMENT_MODES,
  PAYMENT_REFERENCE_TYPES,
  USER_ROLES,
} from '../constants';

export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required').trim(),
  parentId: z.number().int().positive().nullable().optional(),
});
export const categoryUpdateSchema = categoryCreateSchema.partial();

export const brandCreateSchema = z.object({
  name: z.string().min(1, 'Brand name is required').trim(),
});
export const brandUpdateSchema = brandCreateSchema.partial();

export const customerCreateSchema = z.object({
  name: z.string().min(1, 'Customer name is required').trim(),
  phone: z.string().trim().nullable().optional(),
  type: z.enum(CUSTOMER_TYPES).nullable().optional(),
  address: z.string().trim().nullable().optional(),
});
export const customerUpdateSchema = customerCreateSchema.partial();

export const supplierCreateSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').trim(),
  phone: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
});
export const supplierUpdateSchema = supplierCreateSchema.partial();

export const productCreateSchema = z.object({
  productCode: z
    // Free text: dashes, symbols and special characters are all allowed (client call 2026-11-14).
    .string()
    .trim()
    .nullable()
    .optional(),
  name: z.string().min(1, 'Product name is required').trim(),
  categoryId: z.number().int().positive().nullable().optional(),
  brandId: z.number().int().positive().nullable().optional(),
  variantAttributes: z.record(z.string()).nullable().optional(),
  baseUnit: z.enum(BASE_UNITS),
  purchaseUnit: z.string().trim().nullable().optional(),
  purchaseUnitFactor: z.number().positive().nullable().optional(),
  retailPrice: z.number().nonnegative().nullable().optional(),
  wholesalePrice: z.number().nonnegative().nullable().optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  reorderLevel: z.number().nonnegative().nullable().optional(),
  rackLocation: z.string().trim().nullable().optional(),
  barcode: z.string().trim().nullable().optional(),
  color: z.string().trim().nullable().optional(),
  packingSize: z.string().trim().nullable().optional(),
  minSalePrice: z.number().nonnegative().nullable().optional(),
  length: z.number().positive().nullable().optional(),
  width: z.number().positive().nullable().optional(),
});
export const productUpdateSchema = productCreateSchema.partial();

const lineItemSchema = z.object({
  productId: z.number().int().positive(),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  length: z.number().positive().nullable().optional(),
  width: z.number().positive().nullable().optional(),
  unitPrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional(),
  lineTotal: z.number().nonnegative(),
});

const purchaseLineItemSchema = z.object({
  productId: z.number().int().positive(),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
});

// Editing an existing sale: lines + order-level discount/freight. Totals are recomputed server-side.
export const saleInvoiceUpdateSchema = z.object({
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  discountAmount: z.number().nonnegative().default(0),
  freightAmount: z.number().nonnegative().default(0),
  notes: z.string().trim().nullable().optional(),
});

export const saleInvoiceCreateSchema = z.object({
  customerId: z.number().int().positive().nullable().optional(),
  customerName: z.string().trim().nullable().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  subtotal: z.number().nonnegative(),
  discountAmount: z.number().nonnegative().default(0),
  freightAmount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  paidAmount: z.number().nonnegative().default(0),
  paymentMode: z.enum(PAYMENT_MODES_DOC).nullable().optional(),
  priceTier: z.enum(PRICE_TIERS).default('retail'),
  quotationId: z.number().int().positive().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const purchaseOrderCreateSchema = z.object({
  supplierId: z.number().int().positive().nullable().optional(),
  supplierName: z.string().trim().nullable().optional(),
  items: z.array(purchaseLineItemSchema).min(1, 'At least one line item is required'),
  subtotal: z.number().nonnegative(),
  freightAmount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  paidAmount: z.number().nonnegative().default(0),
  paymentMode: z.enum(PAYMENT_MODES_DOC).nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const quotationCreateSchema = z.object({
  customerId: z.number().int().positive().nullable().optional(),
  customerName: z.string().trim().nullable().optional(),
  customerPhone: z.string().trim().nullable().optional(),
  remarks: z.string().trim().nullable().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  subtotal: z.number().nonnegative(),
  discountAmount: z.number().nonnegative().default(0),
  freightAmount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  validUntil: z.string().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const expenseCreateSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  expenseHead: z.string().min(1, 'Expense head is required'),
  description: z.string().trim().nullable().optional(),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMode: z.enum(EXPENSE_PAYMENT_MODES).default('cash'),
  reference: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});
export const expenseUpdateSchema = expenseCreateSchema.partial();

export const stockMovementCreateSchema = z.object({
  productId: z.number().int().positive(),
  type: z.enum(STOCK_MOVEMENT_TYPES),
  quantity: z.number().refine((v) => v !== 0, 'Quantity cannot be zero'),
  referenceType: z.enum(STOCK_MOVEMENT_REFERENCE_TYPES).nullable().optional(),
  referenceId: z.number().int().positive().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  costPriceAtTime: z.number().nonnegative().nullable().optional(),
});

export const paymentCreateSchema = z.object({
  partyType: z.enum(PAYMENT_PARTY_TYPES),
  partyId: z.number().int().positive(),
  partyName: z.string().trim().nullable().optional(),
  amount: z.number().positive('Amount must be greater than 0'),
  direction: z.enum(PAYMENT_DIRECTIONS),
  mode: z.enum(PAYMENT_MODES),
  referenceType: z.enum(PAYMENT_REFERENCE_TYPES).nullable().optional(),
  referenceId: z.number().int().positive().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email('Invalid email address').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().trim().nullable().optional(),
  role: z.enum(USER_ROLES).default('admin'),
  isActive: z.boolean().default(true),
});
export const userUpdateSchema = userCreateSchema
  .omit({ password: true })
  .partial()
  .extend({ password: z.string().min(6, 'Password must be at least 6 characters').optional() });

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim(),
  password: z.string().min(1, 'Password is required'),
});

export const settingsUpdateSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').trim(),
  address: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().email('Invalid email address').trim().nullable().optional(),
});
