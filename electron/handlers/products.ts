import { Database } from 'better-sqlite3';
import log from 'electron-log';
import { Result, Paged, Product, ProductQuery } from '../../shared/types';

/**
 * Products Business Logic Handler
 * All product CRUD operations and queries
 */

export class ProductsHandler {
  constructor(private db: Database.Database) {}

  /**
   * List products with search, filters, and pagination
   */
  list(query: ProductQuery): Result<Paged<Product>> {
    try {
      let sql = 'SELECT * FROM products WHERE deleted_at IS NULL';
      const params: any[] = [];

      // Search by code or name
      if (query.search) {
        sql += ' AND (code LIKE ? OR name LIKE ?)';
        const searchTerm = `%${query.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Filter by category
      if (query.categoryId) {
        sql += ' AND category_id = ?';
        params.push(query.categoryId);
      }

      // Filter by supplier
      if (query.supplierId) {
        sql += ' AND supplier_id = ?';
        params.push(query.supplierId);
      }

      // Filter low stock items
      if (query.onlyLowStock) {
        sql += ' AND current_stock <= reorder_level AND current_stock > 0';
      }

      // Get total count before pagination
      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
      const countStmt = this.db.prepare(countSql);
      const countResult = countStmt.get(...params) as any;
      const totalCount = countResult.count;

      // Add pagination
      const pageSize = query.pageSize || 50;
      const offset = ((query.page || 1) - 1) * pageSize;
      sql += ` ORDER BY code ASC LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);

      const stmt = this.db.prepare(sql);
      const items = stmt.all(...params) as Product[];

      return {
        ok: true,
        data: {
          items: items.map(p => this.normalizeProduct(p)),
          totalCount,
          page: query.page || 1,
          pageSize
        }
      };
    } catch (err: any) {
      log.error('Products list error:', err);
      return { ok: false, error: { code: 'DB_ERROR', message: err.message } };
    }
  }

  /**
   * Get single product by ID
   */
  get(id: number): Result<Product> {
    try {
      const stmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
      const product = stmt.get(id) as Product | undefined;

      if (!product) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } };
      }

      return { ok: true, data: this.normalizeProduct(product) };
    } catch (err: any) {
      log.error('Product get error:', err);
      return { ok: false, error: { code: 'DB_ERROR', message: err.message } };
    }
  }

  /**
   * Create a new product
   */
  create(dto: any): Result<Product> {
    try {
      // Validate required fields
      if (!dto.code || !dto.name) {
        return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } };
      }

      // Check for duplicate code
      const existing = this.db.prepare('SELECT id FROM products WHERE code = ?').get(dto.code);
      if (existing) {
        return { ok: false, error: { code: 'DUPLICATE_CODE', message: `Product code ${dto.code} already exists` } };
      }

      const now = new Date().toISOString();
      const stmt = this.db.prepare(`
        INSERT INTO products (
          code, name, category_id, supplier_id, color_id, unit, pack_size,
          is_cut_to_size, purchase_price, sale_price, min_price, default_length,
          default_width, reorder_level, opening_stock, current_stock, picture_path,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        dto.code,
        dto.name,
        dto.categoryId || null,
        dto.supplierId || null,
        dto.colorId || null,
        dto.unit || 'pcs',
        dto.packSize || null,
        dto.isCutToSize ? 1 : 0,
        dto.purchasePrice || 0,
        dto.salePrice || 0,
        dto.minPrice || 0,
        dto.defaultLength || null,
        dto.defaultWidth || null,
        dto.reorderLevel || 0,
        dto.openingStock || 0,
        dto.openingStock || 0, // current_stock = opening_stock initially
        dto.picturePath || null,
        1, // is_active = true
        now,
        now
      );

      // Get created product
      const created = this.db.prepare('SELECT * FROM products WHERE code = ?').get(dto.code) as Product;
      log.info(`Product created: ${dto.code}`);

      return { ok: true, data: this.normalizeProduct(created) };
    } catch (err: any) {
      log.error('Product create error:', err);
      return { ok: false, error: { code: 'DB_ERROR', message: err.message } };
    }
  }

  /**
   * Update existing product
   */
  update(id: number, dto: any): Result<Product> {
    try {
      // Verify product exists
      const existing = this.db.prepare('SELECT id, code FROM products WHERE id = ?').get(id) as any;
      if (!existing) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } };
      }

      // If code is being changed, check uniqueness
      if (dto.code && dto.code !== existing.code) {
        const duplicate = this.db.prepare('SELECT id FROM products WHERE code = ?').get(dto.code);
        if (duplicate) {
          return { ok: false, error: { code: 'DUPLICATE_CODE', message: `Code ${dto.code} already exists` } };
        }
      }

      const now = new Date().toISOString();
      const updates: string[] = [];
      const values: any[] = [];

      // Build dynamic UPDATE statement based on provided fields
      const allowedFields = [
        'code', 'name', 'category_id', 'supplier_id', 'color_id', 'unit', 'pack_size',
        'is_cut_to_size', 'purchase_price', 'sale_price', 'min_price', 'default_length',
        'default_width', 'reorder_level', 'opening_stock', 'current_stock', 'picture_path', 'is_active'
      ];

      const dtoFieldMap: Record<string, string> = {
        'categoryId': 'category_id',
        'supplierId': 'supplier_id',
        'colorId': 'color_id',
        'packSize': 'pack_size',
        'isCutToSize': 'is_cut_to_size',
        'purchasePrice': 'purchase_price',
        'salePrice': 'sale_price',
        'minPrice': 'min_price',
        'defaultLength': 'default_length',
        'defaultWidth': 'default_width',
        'reorderLevel': 'reorder_level',
        'openingStock': 'opening_stock',
        'currentStock': 'current_stock',
        'picturePath': 'picture_path',
        'isActive': 'is_active'
      };

      for (const [key, value] of Object.entries(dto)) {
        const dbField = dtoFieldMap[key] || key;
        if (allowedFields.includes(dbField) && value !== undefined) {
          updates.push(`${dbField} = ?`);
          values.push(key === 'isCutToSize' ? (value ? 1 : 0) : value);
        }
      }

      if (updates.length === 0) {
        return { ok: false, error: { code: 'NO_UPDATES', message: 'No valid fields to update' } };
      }

      updates.push('updated_at = ?');
      values.push(now);
      values.push(id);

      const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
      this.db.prepare(sql).run(...values);

      // Return updated product
      const updated = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product;
      log.info(`Product updated: id=${id}`);

      return { ok: true, data: this.normalizeProduct(updated) };
    } catch (err: any) {
      log.error('Product update error:', err);
      return { ok: false, error: { code: 'DB_ERROR', message: err.message } };
    }
  }

  /**
   * Soft delete - deactivate product
   */
  deactivate(id: number): Result<boolean> {
    try {
      const existing = this.db.prepare('SELECT id FROM products WHERE id = ?').get(id);
      if (!existing) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } };
      }

      const now = new Date().toISOString();
      this.db.prepare('UPDATE products SET deleted_at = ?, is_active = 0, updated_at = ? WHERE id = ?')
        .run(now, now, id);

      log.info(`Product deactivated: id=${id}`);
      return { ok: true, data: true };
    } catch (err: any) {
      log.error('Product deactivate error:', err);
      return { ok: false, error: { code: 'DB_ERROR', message: err.message } };
    }
  }

  /**
   * Get product stock ledger
   */
  ledger(id: number): Result<any> {
    try {
      const product = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
      if (!product) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } };
      }

      // Get ledger entries for this product (if table exists)
      let ledgerItems: any[] = [];
      try {
        const stmt = this.db.prepare(`
          SELECT * FROM product_ledger_items 
          WHERE product_id = ? 
          ORDER BY transaction_date DESC 
          LIMIT 100
        `);
        ledgerItems = stmt.all(id) as any[];
      } catch {
        // Table might not exist in all versions
        log.debug('product_ledger_items table not found');
      }

      return {
        ok: true,
        data: {
          product: this.normalizeProduct(product),
          opening_stock: product.opening_stock,
          current_stock: product.current_stock,
          ledger_items: ledgerItems,
          total_items: ledgerItems.length
        }
      };
    } catch (err: any) {
      log.error('Product ledger error:', err);
      return { ok: false, error: { code: 'DB_ERROR', message: err.message } };
    }
  }

  /**
   * Get categories for dropdown
   */
  categories(): Result<any[]> {
    try {
      const stmt = this.db.prepare('SELECT id, name FROM categories WHERE deleted_at IS NULL ORDER BY name');
      const categories = stmt.all() as any[];
      return { ok: true, data: categories };
    } catch (err: any) {
      log.error('Categories list error:', err);
      return { ok: false, error: { code: 'DB_ERROR', message: err.message } };
    }
  }

  /**
   * Get suppliers for dropdown
   */
  suppliers(): Result<any[]> {
    try {
      const stmt = this.db.prepare(
        'SELECT id, name FROM suppliers WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name'
      );
      const suppliers = stmt.all() as any[];
      return { ok: true, data: suppliers };
    } catch (err: any) {
      log.error('Suppliers list error:', err);
      return { ok: false, error: { code: 'DB_ERROR', message: err.message } };
    }
  }

  /**
   * Get colors for dropdown
   */
  colors(): Result<any[]> {
    try {
      const stmt = this.db.prepare('SELECT id, name FROM colors WHERE deleted_at IS NULL ORDER BY name');
      const colors = stmt.all() as any[];
      return { ok: true, data: colors };
    } catch (err: any) {
      log.error('Colors list error:', err);
      return { ok: false, error: { code: 'DB_ERROR', message: err.message } };
    }
  }

  /**
   * Normalize product data (convert DB columns to API format)
   */
  private normalizeProduct(p: any): Product {
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      categoryId: p.category_id,
      supplierId: p.supplier_id,
      colorId: p.color_id,
      unit: p.unit,
      packSize: p.pack_size,
      isCutToSize: p.is_cut_to_size === 1,
      purchasePrice: p.purchase_price,
      salePrice: p.sale_price,
      minPrice: p.min_price,
      defaultLength: p.default_length,
      defaultWidth: p.default_width,
      reorderLevel: p.reorder_level,
      openingStock: p.opening_stock,
      currentStock: p.current_stock,
      picturePath: p.picture_path,
      isActive: p.is_active === 1,
      deletedAt: p.deleted_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    };
  }
}
