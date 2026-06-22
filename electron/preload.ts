import { contextBridge, ipcRenderer } from 'electron';
import { Result, SessionUser, Paged, Product, Customer, Supplier, User, SaleInvoice, Quotation, Purchase, Settings } from './../shared/types';

contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (username: string, password: string): Promise<Result<SessionUser>> =>
      ipcRenderer.invoke('auth:login', { username, password }),
    logout: (): Promise<Result<null>> =>
      ipcRenderer.invoke('auth:logout'),
    getCurrentUser: (): Promise<Result<SessionUser | null>> =>
      ipcRenderer.invoke('auth:getCurrentUser')
  },
  products: {
    list: (query: any): Promise<Result<Paged<Product>>> =>
      ipcRenderer.invoke('products:list', query),
    get: (id: number): Promise<Result<Product>> =>
      ipcRenderer.invoke('products:get', id),
    create: (dto: any): Promise<Result<Product>> =>
      ipcRenderer.invoke('products:create', dto),
    update: (id: number, dto: any): Promise<Result<Product>> =>
      ipcRenderer.invoke('products:update', { id, dto }),
    deactivate: (id: number): Promise<Result<boolean>> =>
      ipcRenderer.invoke('products:deactivate', id),
    ledger: (id: number): Promise<Result<any>> =>
      ipcRenderer.invoke('products:ledger', id),
    categories: (): Promise<Result<any[]>> =>
      ipcRenderer.invoke('products:categories'),
    suppliers: (): Promise<Result<any[]>> =>
      ipcRenderer.invoke('products:suppliers'),
    colors: (): Promise<Result<any[]>> =>
      ipcRenderer.invoke('products:colors')
  },
  parties: {
    customers: {
      list: (query: any): Promise<Result<Paged<Customer>>> =>
        ipcRenderer.invoke('customers:list', query),
      get: (id: number): Promise<Result<Customer>> =>
        ipcRenderer.invoke('customers:get', id),
      create: (dto: any): Promise<Result<Customer>> =>
        ipcRenderer.invoke('customers:create', dto),
      update: (id: number, dto: any): Promise<Result<Customer>> =>
        ipcRenderer.invoke('customers:update', { id, dto }),
      deactivate: (id: number): Promise<Result<boolean>> =>
        ipcRenderer.invoke('customers:deactivate', id)
    },
    suppliers: {
      list: (query: any): Promise<Result<Paged<Supplier>>> =>
        ipcRenderer.invoke('suppliers:list', query),
      get: (id: number): Promise<Result<Supplier>> =>
        ipcRenderer.invoke('suppliers:get', id),
      create: (dto: any): Promise<Result<Supplier>> =>
        ipcRenderer.invoke('suppliers:create', dto),
      update: (id: number, dto: any): Promise<Result<Supplier>> =>
        ipcRenderer.invoke('suppliers:update', { id, dto }),
      deactivate: (id: number): Promise<Result<boolean>> =>
        ipcRenderer.invoke('suppliers:deactivate', id)
    },
    ledger: (partyType: 'customer' | 'supplier', partyId: number, range: any): Promise<Result<any>> =>
      ipcRenderer.invoke('parties:ledger', { partyType, partyId, range })
  },
  sales: {
    create: (dto: any): Promise<Result<SaleInvoice>> =>
      ipcRenderer.invoke('sales:create', dto),
    get: (id: number): Promise<Result<SaleInvoice>> =>
      ipcRenderer.invoke('sales:get', id),
    list: (query: any): Promise<Result<Paged<SaleInvoice>>> =>
      ipcRenderer.invoke('sales:list', query),
    void: (id: number, reason: string): Promise<Result<boolean>> =>
      ipcRenderer.invoke('sales:void', { id, reason }),
    fromQuotation: (qid: number): Promise<Result<any>> =>
      ipcRenderer.invoke('sales:fromQuotation', qid)
  },
  quotations: {
    create: (dto: any): Promise<Result<Quotation>> =>
      ipcRenderer.invoke('quotations:create', dto),
    get: (id: number): Promise<Result<Quotation>> =>
      ipcRenderer.invoke('quotations:get', id),
    list: (query: any): Promise<Result<Paged<Quotation>>> =>
      ipcRenderer.invoke('quotations:list', query),
    convert: (id: number): Promise<Result<any>> =>
      ipcRenderer.invoke('quotations:convert', id)
  },
  purchases: {
    create: (dto: any): Promise<Result<Purchase>> =>
      ipcRenderer.invoke('purchases:create', dto),
    get: (id: number): Promise<Result<Purchase>> =>
      ipcRenderer.invoke('purchases:get', id),
    list: (query: any): Promise<Result<Paged<Purchase>>> =>
      ipcRenderer.invoke('purchases:list', query),
    void: (id: number): Promise<Result<boolean>> =>
      ipcRenderer.invoke('purchases:void', id)
  },
  payments: {
    customer: (dto: any): Promise<Result<any>> =>
      ipcRenderer.invoke('payments:customer', dto),
    supplier: (dto: any): Promise<Result<any>> =>
      ipcRenderer.invoke('payments:supplier', dto),
    list: (query: any): Promise<Result<any>> =>
      ipcRenderer.invoke('payments:list', query)
  },
  expenses: {
    create: (dto: any): Promise<Result<any>> =>
      ipcRenderer.invoke('expenses:create', dto),
    list: (query: any): Promise<Result<any>> =>
      ipcRenderer.invoke('expenses:list', query)
  },
  reports: {
    run: (name: string, params: any): Promise<Result<any>> =>
      ipcRenderer.invoke('reports:run', { name, params })
  },
  print: {
    invoice: (id: number, format: 'a4' | 'thermal'): Promise<Result<boolean>> =>
      ipcRenderer.invoke('print:invoice', { id, format }),
    quotation: (id: number): Promise<Result<boolean>> =>
      ipcRenderer.invoke('print:quotation', id),
    receipt: (id: number): Promise<Result<boolean>> =>
      ipcRenderer.invoke('print:receipt', id),
    report: (name: string, params: any): Promise<Result<boolean>> =>
      ipcRenderer.invoke('print:report', { name, params })
  },
  settings: {
    get: (): Promise<Result<Settings>> =>
      ipcRenderer.invoke('settings:get'),
    update: (dto: any): Promise<Result<Settings>> =>
      ipcRenderer.invoke('settings:update', dto)
  },
  users: {
    list: (query: any): Promise<Result<Paged<User>>> =>
      ipcRenderer.invoke('users:list', query),
    get: (id: number): Promise<Result<User>> =>
      ipcRenderer.invoke('users:get', id),
    create: (dto: any): Promise<Result<User>> =>
      ipcRenderer.invoke('users:create', dto),
    update: (id: number, dto: any): Promise<Result<User>> =>
      ipcRenderer.invoke('users:update', { id, dto }),
    deactivate: (id: number): Promise<Result<boolean>> =>
      ipcRenderer.invoke('users:deactivate', id)
  },
  backup: {
    now: (): Promise<Result<string>> =>
      ipcRenderer.invoke('backup:now'),
    restore: (path: string): Promise<Result<boolean>> =>
      ipcRenderer.invoke('backup:restore', path),
    list: (): Promise<Result<any[]>> =>
      ipcRenderer.invoke('backup:list')
  }
});
