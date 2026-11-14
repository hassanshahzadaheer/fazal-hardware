import { contextBridge, ipcRenderer } from 'electron';
import { Result, SessionUser, Category, Brand, Settings, ProductWithNames, Customer, Supplier, StockMovement, SaleInvoice, PurchaseOrder, Payment, Quotation, Expense, ReportSummary, SalesByDay, TopProduct, LowStockRow, BalanceRow, ExtractedInvoice, DashboardData, LicenseStatus } from '../shared/types';

// IPC surface will grow here module-by-module per docs/Fazal_Hardware_PRD.md.
contextBridge.exposeInMainWorld('api', {
  app: {
    getVersion: (): Promise<Result<string>> => ipcRenderer.invoke('app:getVersion'),
  },
  license: {
    getStatus: (): Promise<Result<LicenseStatus>> => ipcRenderer.invoke('license:getStatus'),
    import: (): Promise<Result<LicenseStatus>> => ipcRenderer.invoke('license:import'),
  },
  auth: {
    login: (email: string, password: string): Promise<Result<SessionUser>> =>
      ipcRenderer.invoke('auth:login', { email, password }),
    logout: (): Promise<Result<null>> => ipcRenderer.invoke('auth:logout'),
    getCurrentUser: (): Promise<Result<SessionUser | null>> =>
      ipcRenderer.invoke('auth:getCurrentUser'),
  },
  categories: {
    list: (): Promise<Result<Category[]>> => ipcRenderer.invoke('categories:list'),
    create: (payload: unknown): Promise<Result<Category>> =>
      ipcRenderer.invoke('categories:create', payload),
    delete: (id: number): Promise<Result<null>> => ipcRenderer.invoke('categories:delete', id),
  },
  brands: {
    list: (): Promise<Result<Brand[]>> => ipcRenderer.invoke('brands:list'),
    create: (payload: unknown): Promise<Result<Brand>> => ipcRenderer.invoke('brands:create', payload),
    delete: (id: number): Promise<Result<null>> => ipcRenderer.invoke('brands:delete', id),
  },
  settings: {
    get: (): Promise<Result<Settings>> => ipcRenderer.invoke('settings:get'),
    update: (payload: unknown): Promise<Result<Settings>> => ipcRenderer.invoke('settings:update', payload),
  },
  products: {
    list: (): Promise<Result<ProductWithNames[]>> => ipcRenderer.invoke('products:list'),
    create: (payload: unknown): Promise<Result<ProductWithNames>> =>
      ipcRenderer.invoke('products:create', payload),
    update: (id: number, payload: unknown): Promise<Result<ProductWithNames>> =>
      ipcRenderer.invoke('products:update', { id, payload }),
    delete: (id: number): Promise<Result<null>> => ipcRenderer.invoke('products:delete', id),
  },
  customers: {
    list: (): Promise<Result<Customer[]>> => ipcRenderer.invoke('customers:list'),
    create: (payload: unknown): Promise<Result<Customer>> => ipcRenderer.invoke('customers:create', payload),
    update: (id: number, payload: unknown): Promise<Result<Customer>> =>
      ipcRenderer.invoke('customers:update', { id, payload }),
    delete: (id: number): Promise<Result<null>> => ipcRenderer.invoke('customers:delete', id),
  },
  suppliers: {
    list: (): Promise<Result<Supplier[]>> => ipcRenderer.invoke('suppliers:list'),
    create: (payload: unknown): Promise<Result<Supplier>> => ipcRenderer.invoke('suppliers:create', payload),
    update: (id: number, payload: unknown): Promise<Result<Supplier>> =>
      ipcRenderer.invoke('suppliers:update', { id, payload }),
    delete: (id: number): Promise<Result<null>> => ipcRenderer.invoke('suppliers:delete', id),
  },
  stock: {
    adjust: (payload: unknown): Promise<Result<StockMovement>> => ipcRenderer.invoke('stock:adjust', payload),
    history: (productId: number): Promise<Result<StockMovement[]>> =>
      ipcRenderer.invoke('stock:history', productId),
  },
  sales: {
    list: (): Promise<Result<SaleInvoice[]>> => ipcRenderer.invoke('sales:list'),
    get: (id: number): Promise<Result<SaleInvoice>> => ipcRenderer.invoke('sales:get', id),
    create: (payload: unknown): Promise<Result<SaleInvoice>> => ipcRenderer.invoke('sales:create', payload),
    return: (id: number, items: unknown, notes?: string | null): Promise<Result<SaleInvoice>> =>
      ipcRenderer.invoke('sales:return', { id, items, notes }),
  },
  purchases: {
    list: (): Promise<Result<PurchaseOrder[]>> => ipcRenderer.invoke('purchases:list'),
    get: (id: number): Promise<Result<PurchaseOrder>> => ipcRenderer.invoke('purchases:get', id),
    create: (payload: unknown): Promise<Result<PurchaseOrder>> => ipcRenderer.invoke('purchases:create', payload),
  },
  payments: {
    list: (): Promise<Result<Payment[]>> => ipcRenderer.invoke('payments:list'),
    create: (payload: unknown): Promise<Result<Payment>> => ipcRenderer.invoke('payments:create', payload),
  },
  quotations: {
    list: (): Promise<Result<Quotation[]>> => ipcRenderer.invoke('quotations:list'),
    get: (id: number): Promise<Result<Quotation>> => ipcRenderer.invoke('quotations:get', id),
    create: (payload: unknown): Promise<Result<Quotation>> => ipcRenderer.invoke('quotations:create', payload),
  },
  expenses: {
    list: (): Promise<Result<Expense[]>> => ipcRenderer.invoke('expenses:list'),
    create: (payload: unknown): Promise<Result<Expense>> => ipcRenderer.invoke('expenses:create', payload),
    update: (id: number, payload: unknown): Promise<Result<Expense>> =>
      ipcRenderer.invoke('expenses:update', { id, payload }),
    delete: (id: number): Promise<Result<null>> => ipcRenderer.invoke('expenses:delete', id),
  },
  reports: {
    summary: (): Promise<Result<ReportSummary>> => ipcRenderer.invoke('reports:summary'),
    salesByDay: (days?: number): Promise<Result<SalesByDay[]>> => ipcRenderer.invoke('reports:salesByDay', days),
    topProducts: (): Promise<Result<TopProduct[]>> => ipcRenderer.invoke('reports:topProducts'),
    lowStock: (): Promise<Result<LowStockRow[]>> => ipcRenderer.invoke('reports:lowStock'),
    receivables: (): Promise<Result<BalanceRow[]>> => ipcRenderer.invoke('reports:receivables'),
    payables: (): Promise<Result<BalanceRow[]>> => ipcRenderer.invoke('reports:payables'),
  },
  aiScanner: {
    selectFile: (): Promise<Result<string | null>> => ipcRenderer.invoke('ai:selectFile'),
    scan: (filePath: string): Promise<Result<ExtractedInvoice>> => ipcRenderer.invoke('ai:scan', filePath),
  },
  dashboard: {
    get: (): Promise<Result<DashboardData>> => ipcRenderer.invoke('dashboard:get'),
  },
  backup: {
    now: (): Promise<Result<string>> => ipcRenderer.invoke('backup:now'),
    restore: (): Promise<Result<null>> => ipcRenderer.invoke('backup:restore'),
  },
});
