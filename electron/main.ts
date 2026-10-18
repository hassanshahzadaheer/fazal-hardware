import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import log from 'electron-log';
import { initDb, closeDb, getDb } from './db';
import { Result, SessionUser, Category, Brand, Settings, ProductWithNames, Customer, Supplier, StockMovement, SaleInvoice, PurchaseOrder, Payment, Quotation, Expense, ReportSummary, SalesByDay, TopProduct, LowStockRow, BalanceRow, ExtractedInvoice, DashboardData } from '../shared/types';
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
import * as reportsHandler from './handlers/reports';
import { scanInvoice } from './handlers/aiScanner';
import { getDashboard } from './handlers/dashboard';
import { backupNow, restoreBackup } from './handlers/backup';
import { autoUpdater } from 'electron-updater';

// Loads GEMINI_API_KEY (Task 10.x, AI Scanner) from a local .env file — never
// bundled or committed. In dev this picks up a .env at the repo root; in a
// packaged build there is no repo root, so it also checks the per-user data
// folder, letting an installed app pick up a key the user drops there
// themselves without rebuilding.
dotenv.config({ path: path.join(__dirname, '../.env') });
try {
  dotenv.config({ path: path.join(app.getPath('userData'), '.env'), override: false });
} catch {
  // app.getPath is unavailable outside a real Electron runtime; harmless here.
}

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

// Packaged builds get their icon from electron-builder's "build.icon" config
// (build/icon.png) baked into the app bundle/installer. In dev there's no
// bundle — the window/taskbar/dock icon otherwise falls back to Electron's
// own icon — so we point both the window and the macOS dock at the same
// source image explicitly.
const appIconPath = path.join(__dirname, '../build/icon.png');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    icon: appIconPath,
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
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(appIconPath);
    }
    initDb();
    createWindow();
  } catch (err) {
    log.error('Database initialization failed:', err);
    app.quit();
    return;
  }

  // §25.5: check for updates on launch, download in background, prompt to
  // install. Only in packaged builds — dev mode has no update server and
  // electron-updater logs noisy "update server not configured" errors otherwise.
  if (app.isPackaged) {
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.warn('Auto-update check failed:', err);
    });
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

ipcMain.handle('reports:summary', async (): Promise<Result<ReportSummary>> => {
  return reportsHandler.getSummary(getDb());
});

ipcMain.handle('reports:salesByDay', async (_event, days): Promise<Result<SalesByDay[]>> => {
  return reportsHandler.getSalesByDay(getDb(), days ?? 7);
});

ipcMain.handle('reports:topProducts', async (): Promise<Result<TopProduct[]>> => {
  return reportsHandler.getTopProducts(getDb());
});

ipcMain.handle('reports:lowStock', async (): Promise<Result<LowStockRow[]>> => {
  return reportsHandler.getLowStock(getDb());
});

ipcMain.handle('reports:receivables', async (): Promise<Result<BalanceRow[]>> => {
  return reportsHandler.getReceivables(getDb());
});

ipcMain.handle('reports:payables', async (): Promise<Result<BalanceRow[]>> => {
  return reportsHandler.getPayables(getDb());
});

ipcMain.handle('ai:selectFile', async (): Promise<Result<string | null>> => {
  if (!mainWindow) return { ok: true, data: null };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Invoice Image', extensions: ['jpg', 'jpeg', 'png', 'pdf'] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { ok: true, data: null };
  }
  return { ok: true, data: result.filePaths[0] };
});

ipcMain.handle('ai:scan', async (_event, filePath): Promise<Result<ExtractedInvoice>> => {
  return scanInvoice(filePath);
});

ipcMain.handle('dashboard:get', async (): Promise<Result<DashboardData>> => {
  return getDashboard(getDb());
});

ipcMain.handle('backup:now', async (): Promise<Result<string>> => {
  return backupNow();
});

ipcMain.handle('backup:restore', async (): Promise<Result<null>> => {
  return restoreBackup();
});
