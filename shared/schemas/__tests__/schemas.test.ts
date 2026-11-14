import { describe, it, expect } from 'vitest';
import {
  categoryCreateSchema,
  brandCreateSchema,
  customerCreateSchema,
  supplierCreateSchema,
  productCreateSchema,
  saleInvoiceCreateSchema,
  purchaseOrderCreateSchema,
  quotationCreateSchema,
  expenseCreateSchema,
  stockMovementCreateSchema,
  paymentCreateSchema,
  userCreateSchema,
  loginSchema,
  settingsUpdateSchema,
} from '../index';

describe('shared/schemas — one valid/invalid pair per entity (Task 1.2)', () => {
  it('categoryCreateSchema', () => {
    expect(categoryCreateSchema.safeParse({ name: 'Sanitary' }).success).toBe(true);
    expect(categoryCreateSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('brandCreateSchema', () => {
    expect(brandCreateSchema.safeParse({ name: 'Master Paints' }).success).toBe(true);
    expect(brandCreateSchema.safeParse({}).success).toBe(false);
  });

  it('customerCreateSchema', () => {
    expect(
      customerCreateSchema.safeParse({ name: 'Ali Traders', type: 'wholesale' }).success
    ).toBe(true);
    expect(customerCreateSchema.safeParse({ name: 'Ali Traders', type: 'vip' }).success).toBe(
      false
    );
  });

  it('supplierCreateSchema', () => {
    expect(supplierCreateSchema.safeParse({ name: 'Agha Steel' }).success).toBe(true);
    expect(supplierCreateSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('productCreateSchema', () => {
    expect(
      productCreateSchema.safeParse({ name: 'Plywood 18mm', baseUnit: 'sheet' }).success
    ).toBe(true);
    expect(
      productCreateSchema.safeParse({ name: 'Plywood 18mm', baseUnit: 'cubit' }).success
    ).toBe(false);
  });

  it('saleInvoiceCreateSchema', () => {
    const valid = {
      items: [
        {
          productId: 1,
          productName: 'Plywood',
          quantity: 2,
          unit: 'sheet',
          unitPrice: 2500,
          lineTotal: 5000,
        },
      ],
      subtotal: 5000,
      total: 5000,
    };
    expect(saleInvoiceCreateSchema.safeParse(valid).success).toBe(true);
    expect(saleInvoiceCreateSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it('purchaseOrderCreateSchema', () => {
    const valid = {
      items: [
        { productId: 1, productName: 'Cement', quantity: 50, unit: 'bag', unitPrice: 1200, lineTotal: 60000 },
      ],
      subtotal: 60000,
      total: 60000,
    };
    expect(purchaseOrderCreateSchema.safeParse(valid).success).toBe(true);
    expect(purchaseOrderCreateSchema.safeParse({ ...valid, total: -1 }).success).toBe(false);
  });

  it('quotationCreateSchema', () => {
    const valid = {
      items: [
        { productId: 1, productName: 'Plywood', quantity: 1, unit: 'sheet', unitPrice: 2500, lineTotal: 2500 },
      ],
      subtotal: 2500,
      total: 2500,
    };
    expect(quotationCreateSchema.safeParse(valid).success).toBe(true);
    expect(quotationCreateSchema.safeParse({ ...valid, items: 'not-an-array' }).success).toBe(
      false
    );
  });

  it('expenseCreateSchema', () => {
    expect(
      expenseCreateSchema.safeParse({ date: '2026-10-18', expenseHead: 'Rent', amount: 15000 })
        .success
    ).toBe(true);
    expect(
      expenseCreateSchema.safeParse({ date: '2026-10-18', expenseHead: 'Rent', amount: 0 }).success
    ).toBe(false);
  });

  it('stockMovementCreateSchema', () => {
    expect(
      stockMovementCreateSchema.safeParse({ productId: 1, type: 'opening', quantity: 10 }).success
    ).toBe(true);
    expect(
      stockMovementCreateSchema.safeParse({ productId: 1, type: 'opening', quantity: 0 }).success
    ).toBe(false);
  });

  it('paymentCreateSchema', () => {
    expect(
      paymentCreateSchema.safeParse({
        partyType: 'customer',
        partyId: 1,
        amount: 500,
        direction: 'received',
        mode: 'cash',
      }).success
    ).toBe(true);
    expect(
      paymentCreateSchema.safeParse({
        partyType: 'customer',
        partyId: 1,
        amount: 500,
        direction: 'sideways',
        mode: 'cash',
      }).success
    ).toBe(false);
  });

  it('userCreateSchema', () => {
    expect(
      userCreateSchema.safeParse({ email: 'admin@fazal.test', password: 'secret1' }).success
    ).toBe(true);
    expect(
      userCreateSchema.safeParse({ email: 'not-an-email', password: 'secret1' }).success
    ).toBe(false);
  });

  it('loginSchema', () => {
    expect(loginSchema.safeParse({ email: 'admin@fazal.test', password: 'x' }).success).toBe(
      true
    );
    expect(loginSchema.safeParse({ email: 'admin@fazal.test', password: '' }).success).toBe(
      false
    );
  });

  it('settingsUpdateSchema', () => {
    expect(settingsUpdateSchema.safeParse({ companyName: 'Fazal Hardware' }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ companyName: '' }).success).toBe(false);
  });
});

describe('productCreateSchema productCode', () => {
  const base = { name: 'Nova', baseUnit: 'piece' as const };
  it.each(['UV-NOVA-7946', 'ABC', 'UV,NOVA', 'UV NOVA/7946', 'a_1#2'])('accepts %s (any characters)', (productCode) => {
    expect(productCreateSchema.safeParse({ ...base, productCode }).success).toBe(true);
  });
});
