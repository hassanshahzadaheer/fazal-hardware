// Shared types for Fazal Hardware.
// Entity types (Product, Customer, Supplier, SaleInvoice, ...) will be added here
// per docs/Fazal_Hardware_PRD.md Section 4 as modules are built.

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: any } };
