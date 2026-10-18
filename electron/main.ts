import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import log from 'electron-log';
import { initDb, closeDb, getDb } from './db';
import { Result, SessionUser, Category, Brand, Settings, ProductWithNames, Customer, Supplier, StockMovement, SaleInvoice, PurchaseOrder, Payment, Quotation, Expense } from '../shared/types';
import { login } from './handlers/auth';
import * as categoriesHandler from './handlers/categories';
import * as brandsHandler from './handlers/brands';
import * as settingsHandler from './handlers/settings';
import * as productsHandler from './handlers/products';
import * as customersHandler from './handlers/customers';
import * as suppliersHandler from './handlers/suppliers';
import * as stockHandler from './handlers/stock';
import * as salesHandler from './handlers/sales';
import * as purchasesHandler from './handlers/purchases';
import * as paymentsHandler from './handlers/payments';
import * as quotationsHandler from './handlers/quotations';
import * as expensesHandler from './handlers/expenses';

log.initialize();
log.info('Starting Fazal Hardware...');

let mainWindow: BrowserWindow | null = null;
// Session kept in-process (no disk-persisted token, per PRD §20.2 "no token
// expiry needed for desktop") — survives renderer reloads, resets on app restart.
let sessionUser: SessionUser | null = null;

const isPrimaryInstance = app.requestSingleInstanceLock();
if (!isPrimaryInstance) {
  log.warn('Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    log.info('Running in development mode. Loading Vite server.');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    log.info('Running in production mode. Loading index.html.');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  try {
    initDb();
    createWindow();
  } catch (err) {
    log.error('Database initialization failed:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  closeDb();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('app:getVersion', async (): Promise<Result<string>> => {
  return { ok: true, data: app.getVersion() };
});

ipcMain.handle('auth:login', async (_event, payload): Promise<Result<SessionUser>> => {
  const result = login(getDb(), payload);
  if (result.ok) {
    sessionUser = result.data;
    log.info(`User authenticated: ${result.data.email}`);
  } else {
    log.warn(`Login failed: ${result.error.message}`);
  }
  return result;
});

ipcMain.handle('auth:logout', async (): Promise<Result<null>> => {
  log.info(`User logged out: ${sessionUser?.email ?? 'unknown'}`);
  sessionUser = null;
  return { ok: true, data: null };
});

ipcMain.handle('auth:getCurrentUser', async (): Promise<Result<SessionUser | null>> => {
  return { ok: true, data: sessionUser };
});

ipcMain.handle('categories:list', async (): Promise<Result<Category[]>> => {
  return categoriesHandler.list(getDb());
});

ipcMain.handle('categories:create', async (_event, payload): Promise<Result<Category>> => {
  return categoriesHandler.create(getDb(), payload);
});

ipcMain.handle('categories:delete', async (_event, id): Promise<Result<null>> => {
  return categoriesHandler.remove(getDb(), id);
});

ipcMain.handle('brands:list', async (): Promise<Result<Brand[]>> => {
  return brandsHandler.list(getDb());
});

ipcMain.handle('brands:create', async (_event, payload): Promise<Result<Brand>> => {
  return brandsHandler.create(getDb(), payload);
});

ipcMain.handle('brands:delete', async (_event, id): Promise<Result<null>> => {
  return brandsHandler.remove(getDb(), id);
});

ipcMain.handle('settings:get', async (): Promise<Result<Settings>> => {
  return settingsHandler.get(getDb());
});

ipcMain.handle('settings:update', async (_event, payload): Promise<Result<Settings>> => {
  return settingsHandler.update(getDb(), payload);
});

ipcMain.handle('products:list', async (): Promise<Result<ProductWithNames[]>> => {
  return productsHandler.list(getDb());
});

ipcMain.handle('products:create', async (_event, payload): Promise<Result<ProductWithNames>> => {
  return productsHandler.create(getDb(), payload);
});

ipcMain.handle(
  'products:update',
  async (_event, { id, payload }): Promise<Result<ProductWithNames>> => {
    return productsHandler.update(getDb(), id, payload);
  }
);

ipcMain.handle('products:delete', async (_event, id): Promise<Result<null>> => {
  return productsHandler.remove(getDb(), id);
});

ipcMain.handle('customers:list', async (): Promise<Result<Customer[]>> => {
  return customersHandler.list(getDb());
});

ipcMain.handle('customers:create', async (_event, payload): Promise<Result<Customer>> => {
  return customersHandler.create(getDb(), payload);
});

ipcMain.handle('customers:update', async (_event, { id, payload }): Promise<Result<Customer>> => {
  return customersHandler.update(getDb(), id, payload);
});

ipcMain.handle('customers:delete', async (_event, id): Promise<Result<null>> => {
  return customersHandler.remove(getDb(), id);
});

ipcMain.handle('suppliers:list', async (): Promise<Result<Supplier[]>> => {
  return suppliersHandler.list(getDb());
});

ipcMain.handle('suppliers:create', async (_event, payload): Promise<Result<Supplier>> => {
  return suppliersHandler.create(getDb(), payload);
});

ipcMain.handle('suppliers:update', async (_event, { id, payload }): Promise<Result<Supplier>> => {
  return suppliersHandler.update(getDb(), id, payload);
});

ipcMain.handle('suppliers:delete', async (_event, id): Promise<Result<null>> => {
  return suppliersHandler.remove(getDb(), id);
});

ipcMain.handle('stock:adjust', async (_event, payload): Promise<Result<StockMovement>> => {
  return stockHandler.adjust(getDb(), payload);
});

ipcMain.handle('stock:history', async (_event, productId): Promise<Result<StockMovement[]>> => {
  return stockHandler.history(getDb(), productId);
});

ipcMain.handle('sales:list', async (): Promise<Result<SaleInvoice[]>> => {
  return salesHandler.list(getDb());
});

ipcMain.handle('sales:get', async (_event, id): Promise<Result<SaleInvoice>> => {
  return salesHandler.get(getDb(), id);
});

ipcMain.handle('sales:create', async (_event, payload): Promise<Result<SaleInvoice>> => {
  return salesHandler.create(getDb(), payload);
});

ipcMain.handle('sales:return', async (_event, { id, items, notes }): Promise<Result<SaleInvoice>> => {
  return salesHandler.returnSale(getDb(), id, items, notes);
});

ipcMain.handle('purchases:list', async (): Promise<Result<PurchaseOrder[]>> => {
  return purchasesHandler.list(getDb());
});

ipcMain.handle('purchases:get', async (_event, id): Promise<Result<PurchaseOrder>> => {
  return purchasesHandler.get(getDb(), id);
});

ipcMain.handle('purchases:create', async (_event, payload): Promise<Result<PurchaseOrder>> => {
  return purchasesHandler.create(getDb(), payload);
});

ipcMain.handle('payments:list', async (): Promise<Result<Payment[]>> => {
  return paymentsHandler.list(getDb());
});

ipcMain.handle('payments:create', async (_event, payload): Promise<Result<Payment>> => {
  return paymentsHandler.create(getDb(), payload);
});

ipcMain.handle('quotations:list', async (): Promise<Result<Quotation[]>> => {
  return quotationsHandler.list(getDb());
});

ipcMain.handle('quotations:get', async (_event, id): Promise<Result<Quotation>> => {
  return quotationsHandler.get(getDb(), id);
});

ipcMain.handle('quotations:create', async (_event, payload): Promise<Result<Quotation>> => {
  return quotationsHandler.create(getDb(), payload);
});

ipcMain.handle('expenses:list', async (): Promise<Result<Expense[]>> => {
  return expensesHandler.list(getDb());
});

ipcMain.handle('expenses:create', async (_event, payload): Promise<Result<Expense>> => {
  return expensesHandler.create(getDb(), payload);
});

ipcMain.handle('expenses:update', async (_event, { id, payload }): Promise<Result<Expense>> => {
  return expensesHandler.update(getDb(), id, payload);
});

ipcMain.handle('expenses:delete', async (_event, id): Promise<Result<null>> => {
  return expensesHandler.remove(getDb(), id);
});
