import { contextBridge, ipcRenderer } from 'electron';
import { Result, SessionUser, Category, Brand, Settings, ProductWithNames, Customer, Supplier } from '../shared/types';

// IPC surface will grow here module-by-module per docs/Fazal_Hardware_PRD.md.
contextBridge.exposeInMainWorld('api', {
  app: {
    getVersion: (): Promise<Result<string>> => ipcRenderer.invoke('app:getVersion'),
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
});
