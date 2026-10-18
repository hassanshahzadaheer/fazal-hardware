import Database from 'better-sqlite3';
import { Result, ProductWithNames } from '../../shared/types';
import { BaseUnit } from '../../shared/constants';
import { productCreateSchema, productUpdateSchema } from '../../shared/schemas';

interface ProductRow {
  id: number;
  name: string;
  category_id: number | null;
  brand_id: number | null;
  variant_attributes: string | null;
  base_unit: string;
  purchase_unit: string | null;
  purchase_unit_factor: number | null;
  retail_price: number | null;
  wholesale_price: number | null;
  cost_price: number | null;
  reorder_level: number | null;
  rack_location: string | null;
  barcode: string | null;
  stock_on_hand: number;
  is_active: number;
  created_date: string;
  updated_date: string;
  created_by_id: number | null;
  category_name: string | null;
  brand_name: string | null;
}

function mapRow(row: ProductRow): ProductWithNames {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    brandId: row.brand_id,
    variantAttributes: row.variant_attributes ? JSON.parse(row.variant_attributes) : null,
    baseUnit: row.base_unit as BaseUnit,
    purchaseUnit: row.purchase_unit,
    purchaseUnitFactor: row.purchase_unit_factor,
    retailPrice: row.retail_price,
    wholesalePrice: row.wholesale_price,
    costPrice: row.cost_price,
    reorderLevel: row.reorder_level,
    rackLocation: row.rack_location,
    barcode: row.barcode,
    stockOnHand: row.stock_on_hand,
    isActive: !!row.is_active,
    createdDate: row.created_date,
    updatedDate: row.updated_date,
    createdById: row.created_by_id,
    categoryName: row.category_name,
    brandName: row.brand_name,
  };
}

const SELECT_WITH_NAMES = `
  SELECT p.*, c.name as category_name, b.name as brand_name
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN brands b ON b.id = p.brand_id
`;

export function list(db: Database.Database): Result<ProductWithNames[]> {
  const rows = db.prepare(`${SELECT_WITH_NAMES} ORDER BY p.name`).all() as ProductRow[];
  return { ok: true, data: rows.map(mapRow) };
}

export function create(db: Database.Database, payload: unknown): Result<ProductWithNames> {
  const parsed = productCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const d = parsed.data;
  const info = db
    .prepare(
      `INSERT INTO products (
        name, category_id, brand_id, variant_attributes, base_unit, purchase_unit,
        purchase_unit_factor, retail_price, wholesale_price, cost_price, reorder_level,
        rack_location, barcode, stock_on_hand, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`
    )
    .run(
      d.name,
      d.categoryId ?? null,
      d.brandId ?? null,
      d.variantAttributes ? JSON.stringify(d.variantAttributes) : null,
      d.baseUnit,
      d.purchaseUnit ?? null,
      d.purchaseUnitFactor ?? null,
      d.retailPrice ?? null,
      d.wholesalePrice ?? null,
      d.costPrice ?? null,
      d.reorderLevel ?? null,
      d.rackLocation ?? null,
      d.barcode ?? null
    );
  const row = db.prepare(`${SELECT_WITH_NAMES} WHERE p.id = ?`).get(info.lastInsertRowid) as ProductRow;
  return { ok: true, data: mapRow(row) };
}

const UPDATE_COLUMN_MAP: Record<string, string> = {
  name: 'name',
  categoryId: 'category_id',
  brandId: 'brand_id',
  baseUnit: 'base_unit',
  purchaseUnit: 'purchase_unit',
  purchaseUnitFactor: 'purchase_unit_factor',
  retailPrice: 'retail_price',
  wholesalePrice: 'wholesale_price',
  costPrice: 'cost_price',
  reorderLevel: 'reorder_level',
  rackLocation: 'rack_location',
  barcode: 'barcode',
};

export function update(db: Database.Database, id: number, payload: unknown): Result<ProductWithNames> {
  const existing = db.prepare('SELECT 1 FROM products WHERE id = ?').get(id);
  if (!existing) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } };
  }

  const parsed = productUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const d = parsed.data as Record<string, unknown>;

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, column] of Object.entries(UPDATE_COLUMN_MAP)) {
    if (key in d) {
      fields.push(`${column} = ?`);
      values.push(d[key] ?? null);
    }
  }
  if ('variantAttributes' in d) {
    fields.push('variant_attributes = ?');
    values.push(d.variantAttributes ? JSON.stringify(d.variantAttributes) : null);
  }

  if (fields.length > 0) {
    fields.push("updated_date = datetime('now')");
    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);
  }

  const row = db.prepare(`${SELECT_WITH_NAMES} WHERE p.id = ?`).get(id) as ProductRow;
  return { ok: true, data: mapRow(row) };
}

export function remove(db: Database.Database, id: number): Result<null> {
  const existing = db.prepare('SELECT 1 FROM products WHERE id = ?').get(id);
  if (!existing) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } };
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return { ok: true, data: null };
}
