import { z } from 'zod';
import { UnitTypes, PaymentModes } from '../constants';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

export const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').trim(),
  fullName: z.string().min(1, 'Full name is required').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['admin', 'manager', 'cashier', 'storekeeper', 'accountant']),
  overridePin: z.string().regex(/^\d{4}$/, 'Override PIN must be 4 digits').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const citySchema = z.object({
  name: z.string().min(1, 'City name is required').trim(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').trim(),
  defaultMarginPercent: z.number().nonnegative().default(0),
  loyaltyPointsPer: z.number().nonnegative().default(0),
  loyaltyPointValue: z.number().nonnegative().default(0),
});

export const colorSchema = z.object({
  name: z.string().min(1, 'Color name is required').trim(),
  note: z.string().optional().nullable(),
});

export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').trim(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
  address: z.string().optional().nullable(),
  openingBalance: z.number().default(0), // in paisa
  isActive: z.boolean().default(true),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').trim(),
  fatherName: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
  cityId: z.number().optional().nullable(),
  address: z.string().optional().nullable(),
  cnic: z.string().optional().nullable(),
  openingBalance: z.number().default(0), // in paisa
  creditLimit: z.number().nonnegative().default(0), // in paisa
  isClubMember: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const productSchema = z.object({
  code: z.string().min(1, 'Product code is required').trim(),
  name: z.string().min(1, 'Product name is required').trim(),
  categoryId: z.number().optional().nullable(),
  supplierId: z.number().optional().nullable(),
  colorId: z.number().optional().nullable(),
  unit: z.enum([UnitTypes.PCS, UnitTypes.SHEET, UnitTypes.SQFT, UnitTypes.RFT, UnitTypes.KG, UnitTypes.SET]),
  packSize: z.string().optional().nullable(),
  isCutToSize: z.boolean().default(false),
  purchasePrice: z.number().nonnegative('Purchase price must be positive or zero').default(0), // in paisa
  salePrice: z.number().nonnegative('Sale price must be positive or zero').default(0), // in paisa
  minPrice: z.number().nonnegative('Minimum price must be positive or zero').default(0), // in paisa
  defaultLength: z.number().nonnegative().optional().nullable(),
  defaultWidth: z.number().nonnegative().optional().nullable(),
  reorderLevel: z.number().nonnegative().default(0),
  openingStock: z.number().default(0),
  isActive: z.boolean().default(true),
}).refine(data => {
  if (data.salePrice < data.minPrice) {
    return false;
  }
  return true;
}, {
  message: "Sale price cannot be less than minimum sale price",
  path: ["salePrice"]
});

export const carpenterSchema = z.object({
  name: z.string().min(1, 'Carpenter name is required').trim(),
  mobile: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const deliveryManSchema = z.object({
  name: z.string().min(1, 'Delivery man name is required').trim(),
  mobile: z.string().optional().nullable(),
});

export const expenseHeadSchema = z.object({
  name: z.string().min(1, 'Expense head name is required').trim(),
});

export const expenseSchema = z.object({
  docDate: z.string().min(1, 'Date is required'),
  headId: z.number().min(1, 'Expense head is required'),
  description: z.string().optional().nullable(),
  amount: z.number().positive('Amount must be positive'), // in paisa
  mode: z.string().optional().nullable(),
});

// Item details schemas for transactions
export const saleInvoiceItemSchema = z.object({
  productId: z.number().min(1),
  productCode: z.string().min(1),
  productName: z.string().min(1),
  qty: z.number().positive('Quantity must be greater than zero'),
  length: z.number().nonnegative().optional().nullable(),
  width: z.number().nonnegative().optional().nullable(),
  unitPrice: z.number().nonnegative(), // in paisa
  saleType: z.string().optional().nullable(),
  lineTotal: z.number().nonnegative(), // in paisa
  costPrice: z.number().nonnegative(), // in paisa
  remarks: z.string().optional().nullable(),
});

export const saleInvoiceSchema = z.object({
  docDate: z.string().min(1, 'Invoice date is required'),
  customerId: z.number().min(1, 'Customer is required'),
  salesmanId: z.number().optional().nullable(),
  carpenterId: z.number().optional().nullable(),
  quotationId: z.number().optional().nullable(),
  reference: z.string().optional().nullable(),
  cellNo: z.string().optional().nullable(),
  cnic: z.string().optional().nullable(),
  driver: z.string().optional().nullable(),
  grossValue: z.number().nonnegative(), // in paisa
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().nonnegative().default(0), // in paisa
  freight: z.number().nonnegative().default(0), // in paisa
  netValue: z.number().nonnegative(), // in paisa
  paidAmount: z.number().nonnegative().default(0), // in paisa
  paymentMode: z.enum([
    PaymentModes.CASH,
    PaymentModes.CREDIT,
    PaymentModes.CARD,
    PaymentModes.BANK,
    PaymentModes.CHEQUE,
    PaymentModes.MIXED
  ]),
  remarks: z.string().optional().nullable(),
  items: z.array(saleInvoiceItemSchema).min(1, 'Invoice must have at least one item'),
  overrideApprovedBy: z.number().optional().nullable(), // user ID of approving manager/admin
});

export const quotationItemSchema = z.object({
  productId: z.number().min(1),
  productCode: z.string().min(1),
  productName: z.string().min(1),
  qty: z.number().positive('Quantity must be greater than zero'),
  length: z.number().nonnegative().optional().nullable(),
  width: z.number().nonnegative().optional().nullable(),
  unitPrice: z.number().nonnegative(), // in paisa
  lineTotal: z.number().nonnegative(), // in paisa
  remarks: z.string().optional().nullable(),
});

export const quotationSchema = z.object({
  docDate: z.string().min(1, 'Quotation date is required'),
  customerId: z.number().min(1, 'Customer is required'),
  reference: z.string().optional().nullable(),
  cellNo: z.string().optional().nullable(),
  grossValue: z.number().nonnegative(), // in paisa
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().nonnegative().default(0), // in paisa
  freight: z.number().nonnegative().default(0), // in paisa
  netValue: z.number().nonnegative(), // in paisa
  validUntil: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  items: z.array(quotationItemSchema).min(1, 'Quotation must have at least one item'),
});

export const purchaseItemSchema = z.object({
  productId: z.number().min(1),
  productCode: z.string().min(1),
  productName: z.string().min(1),
  qty: z.number().positive('Quantity must be greater than zero'),
  length: z.number().nonnegative().optional().nullable(),
  width: z.number().nonnegative().optional().nullable(),
  unitCost: z.number().nonnegative(), // in paisa
  lineTotal: z.number().nonnegative(), // in paisa
  remarks: z.string().optional().nullable(),
});

export const purchaseSchema = z.object({
  docDate: z.string().min(1, 'Purchase date is required'),
  supplierId: z.number().min(1, 'Supplier is required'),
  supplierInvoiceRef: z.string().optional().nullable(),
  grossValue: z.number().nonnegative(), // in paisa
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().nonnegative().default(0), // in paisa
  freight: z.number().nonnegative().default(0), // in paisa
  netValue: z.number().nonnegative(), // in paisa
  paidAmount: z.number().nonnegative().default(0), // in paisa
  paymentMode: z.string().default('credit'),
  remarks: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, 'Purchase must have at least one item'),
});

export const customerPaymentSchema = z.object({
  docDate: z.string().min(1, 'Payment date is required'),
  customerId: z.number().min(1, 'Customer is required'),
  amount: z.number().positive('Amount must be greater than zero'), // in paisa
  mode: z.enum(['cash', 'cheque', 'bank', 'card']),
  chequeNo: z.string().optional().nullable(),
  chequeDate: z.string().optional().nullable(),
  bank: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const supplierPaymentSchema = z.object({
  docDate: z.string().min(1, 'Payment date is required'),
  supplierId: z.number().min(1, 'Supplier is required'),
  amount: z.number().positive('Amount must be greater than zero'), // in paisa
  mode: z.enum(['cash', 'cheque', 'bank', 'card']),
  chequeNo: z.string().optional().nullable(),
  chequeDate: z.string().optional().nullable(),
  bank: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});
