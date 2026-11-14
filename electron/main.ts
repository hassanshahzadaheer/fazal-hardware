import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import log from 'electron-log/main';
import { initDb, closeDb, getDb } from './db';
import { Result, SessionUser, Category, Brand, Settings, ProductWithNames, Customer, Supplier, StockMovement, SaleInvoice, PurchaseOrder, Payment, Quotation, Expense, ReportSummary, SalesByDay, TopProduct, LowStockRow, BalanceRow, ExtractedInvoice, DashboardData, LicenseStatus, SetupStatus, UpdateState } from '../shared/types';
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
import * as setupHandler from './handlers/setup';
import { exportAllCsv } from './handlers/exportData';
import { getLicenseService } from './license/store';
import { clearGeminiKey, getGeminiKey, getGeminiStatus, GeminiStatus, saveGeminiKey, testGeminiKey } from './secrets/gemini';
import { checkForUpdates, getUpdateState, initUpdater, installUpdate, setBillingActive, stopUpdater } from './updater';

// Dev only: a repo-root .env may supply GEMINI_API_KEY / FAZAL_DEV_LICENSE_BYPASS for
// local development. Packaged builds NEVER read .env files: customers' secrets live
// in OS-backed secure storage (electron/secrets), entered in the setup wizard/Settings.
if (!app.isPackaged) {
  dotenv.config({ path: path.join(__dirname, '../.env') });
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

  // A renderer reload drops any open-bill state, so don't leave updates blocked.
  mainWindow.webContents.on('did-start-loading', () => setBillingActive(false));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  try {
    if (!app.isPackaged && process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(appIconPath);
    }
    initDb();
    categoriesHandler.ensureProductCategories(getDb());
    createWindow();
  } catch (err) {
    log.error('Database initialization failed:', err);
    app.quit();
    return;
  }

  // §25.5 / Settings → Updates: background check + download, user-initiated install only.
  initUpdater(() => mainWindow);
  startLicenseChecks();
});

app.on('window-all-closed', () => {
  stopUpdater();
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

// ---------------------------------------------------------------------------
// Licensing (§27). Status is evaluated LOCALLY from a signed lease, so the POS
// works offline; the server is only contacted to activate and to re-validate.
// ---------------------------------------------------------------------------
function currentLicense(): LicenseStatus {
  // Dev convenience only; impossible in a packaged build.
  if (!app.isPackaged && process.env.FAZAL_DEV_LICENSE_BYPASS === '1') {
    return { state: 'active', customerName: 'DEV BYPASS', expiresAt: null, lastCheckedAt: new Date().toISOString(), graceEndsAt: new Date(Date.now() + 864e5).toISOString(), graceDays: 1, recheckDue: false };
  }
  return getLicenseService().getStatus();
}

let lastBroadcast = '';
function broadcastLicense(): void {
  const status = currentLicense();
  const sig = JSON.stringify(status);
  if (sig !== lastBroadcast) {
    lastBroadcast = sig;
    mainWindow?.webContents.send('license:changed', status);
  }
}

function startLicenseChecks(): void {
  const tick = async () => {
    try {
      await getLicenseService().refreshIfDue();
    } catch (err) {
      log.warn('Licence recheck failed:', err);
    }
    broadcastLicense();
  };
  setTimeout(tick, 5_000).unref();
  setInterval(tick, 30 * 60_000).unref(); // cheap: only hits the network when the lease says a recheck is due
}

// Restricted / unactivated installs keep full READ access plus backup & export, but
// can't create or change business records. Nothing here ever deletes data.
const MUTATING_CHANNEL = /:(create|update|delete|adjust|return|restore)$/;
function handle(channel: string, listener: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (MUTATING_CHANNEL.test(channel) && currentLicense().state !== 'active') {
      return { ok: false, error: { code: 'LICENSE_RESTRICTED', message: 'Your licence is not active, so changes are disabled. You can still view, back up and export your data.' } };
    }
    return listener(event, ...args);
  });
}

handle('license:getStatus', async (): Promise<Result<LicenseStatus>> => ({ ok: true, data: currentLicense() }));

handle('license:activate', async (_event, key: string): Promise<Result<LicenseStatus>> => {
  const res = await getLicenseService().activate(String(key ?? ''));
  broadcastLicense();
  return res;
});

handle('license:refresh', async (): Promise<Result<LicenseStatus>> => {
  const res = await getLicenseService().refresh();
  broadcastLicense();
  return res.ok ? res : { ...res };
});

handle('license:deactivate', async (): Promise<Result<null>> => {
  const res = await getLicenseService().deactivate();
  broadcastLicense();
  return res;
});

// ---- First-run setup --------------------------------------------------------
handle('setup:getStatus', async (): Promise<Result<SetupStatus>> => setupHandler.getStatus(getDb()));
handle('setup:complete', async (_event, payload): Promise<Result<SetupStatus>> => setupHandler.complete(getDb(), payload));

// ---- Gemini key (secure storage; never returned to the renderer) -----------
handle('gemini:getStatus', async (): Promise<Result<GeminiStatus>> => ({ ok: true, data: getGeminiStatus() }));
handle('gemini:save', async (_event, key: string): Promise<Result<GeminiStatus>> => saveGeminiKey(key));
handle('gemini:clear', async (): Promise<Result<GeminiStatus>> => clearGeminiKey());
handle('gemini:test', async (_event, candidate?: string): Promise<Result<null>> => testGeminiKey(candidate));

// ---- Updates ---------------------------------------------------------------
handle('updater:getState', async (): Promise<Result<UpdateState>> => ({ ok: true, data: getUpdateState() }));
handle('updater:check', async (): Promise<Result<UpdateState>> => checkForUpdates());
handle('updater:install', async (): Promise<Result<null>> => installUpdate());
// The renderer reports whether a bill is open so an update can never restart mid-sale.
handle('updater:setBillingActive', async (_event, active: boolean): Promise<Result<null>> => {
  setBillingActive(Boolean(active));
  return { ok: true, data: null };
});

handle('auth:login', async (_event, payload): Promise<Result<SessionUser>> => {
  const result = login(getDb(), payload);
  if (result.ok) {
    sessionUser = result.data;
    log.info(`User authenticated: ${result.data.email}`);
  } else {
    log.warn(`Login failed: ${result.error.message}`);
  }
  return result;
});

handle('auth:logout', async (): Promise<Result<null>> => {
  log.info(`User logged out: ${sessionUser?.email ?? 'unknown'}`);
  sessionUser = null;
  return { ok: true, data: null };
});

handle('auth:getCurrentUser', async (): Promise<Result<SessionUser | null>> => {
  return { ok: true, data: sessionUser };
});

handle('categories:list', async (): Promise<Result<Category[]>> => {
  return categoriesHandler.list(getDb());
});

handle('categories:create', async (_event, payload): Promise<Result<Category>> => {
  return categoriesHandler.create(getDb(), payload);
});

handle('categories:delete', async (_event, id): Promise<Result<null>> => {
  return categoriesHandler.remove(getDb(), id);
});

handle('brands:list', async (): Promise<Result<Brand[]>> => {
  return brandsHandler.list(getDb());
});

handle('brands:create', async (_event, payload): Promise<Result<Brand>> => {
  return brandsHandler.create(getDb(), payload);
});

handle('brands:delete', async (_event, id): Promise<Result<null>> => {
  return brandsHandler.remove(getDb(), id);
});

handle('settings:get', async (): Promise<Result<Settings>> => {
  return settingsHandler.get(getDb());
});

handle('settings:update', async (_event, payload): Promise<Result<Settings>> => {
  return settingsHandler.update(getDb(), payload);
});

handle('products:list', async (): Promise<Result<ProductWithNames[]>> => {
  return productsHandler.list(getDb());
});

handle('products:create', async (_event, payload): Promise<Result<ProductWithNames>> => {
  return productsHandler.create(getDb(), payload);
});

handle(
  'products:update',
  async (_event, { id, payload }): Promise<Result<ProductWithNames>> => {
    return productsHandler.update(getDb(), id, payload);
  }
);

handle('products:delete', async (_event, id): Promise<Result<null>> => {
  return productsHandler.remove(getDb(), id);
});

handle('customers:list', async (): Promise<Result<Customer[]>> => {
  return customersHandler.list(getDb());
});

handle('customers:create', async (_event, payload): Promise<Result<Customer>> => {
  return customersHandler.create(getDb(), payload);
});

handle('customers:update', async (_event, { id, payload }): Promise<Result<Customer>> => {
  return customersHandler.update(getDb(), id, payload);
});

handle('customers:delete', async (_event, id): Promise<Result<null>> => {
  return customersHandler.remove(getDb(), id);
});

handle('suppliers:list', async (): Promise<Result<Supplier[]>> => {
  return suppliersHandler.list(getDb());
});

handle('suppliers:create', async (_event, payload): Promise<Result<Supplier>> => {
  return suppliersHandler.create(getDb(), payload);
});

handle('suppliers:update', async (_event, { id, payload }): Promise<Result<Supplier>> => {
  return suppliersHandler.update(getDb(), id, payload);
});

handle('suppliers:delete', async (_event, id): Promise<Result<null>> => {
  return suppliersHandler.remove(getDb(), id);
});

handle('stock:adjust', async (_event, payload): Promise<Result<StockMovement>> => {
  return stockHandler.adjust(getDb(), payload);
});

handle('stock:history', async (_event, productId): Promise<Result<StockMovement[]>> => {
  return stockHandler.history(getDb(), productId);
});

handle('sales:list', async (): Promise<Result<SaleInvoice[]>> => {
  return salesHandler.list(getDb());
});

handle('sales:get', async (_event, id): Promise<Result<SaleInvoice>> => {
  return salesHandler.get(getDb(), id);
});

handle('sales:create', async (_event, payload): Promise<Result<SaleInvoice>> => {
  return salesHandler.create(getDb(), payload);
});

handle('sales:update', async (_event, { id, payload }): Promise<Result<SaleInvoice>> => {
  return salesHandler.update(getDb(), id, payload);
});

handle('sales:return', async (_event, { id, items, notes }): Promise<Result<SaleInvoice>> => {
  return salesHandler.returnSale(getDb(), id, items, notes);
});

handle('purchases:list', async (): Promise<Result<PurchaseOrder[]>> => {
  return purchasesHandler.list(getDb());
});

handle('purchases:get', async (_event, id): Promise<Result<PurchaseOrder>> => {
  return purchasesHandler.get(getDb(), id);
});

handle('purchases:create', async (_event, payload): Promise<Result<PurchaseOrder>> => {
  return purchasesHandler.create(getDb(), payload);
});

handle('payments:list', async (): Promise<Result<Payment[]>> => {
  return paymentsHandler.list(getDb());
});

handle('payments:create', async (_event, payload): Promise<Result<Payment>> => {
  return paymentsHandler.create(getDb(), payload);
});

handle('quotations:list', async (): Promise<Result<Quotation[]>> => {
  return quotationsHandler.list(getDb());
});

handle('quotations:get', async (_event, id): Promise<Result<Quotation>> => {
  return quotationsHandler.get(getDb(), id);
});

handle('quotations:create', async (_event, payload): Promise<Result<Quotation>> => {
  return quotationsHandler.create(getDb(), payload);
});

handle('expenses:list', async (): Promise<Result<Expense[]>> => {
  return expensesHandler.list(getDb());
});

handle('expenses:create', async (_event, payload): Promise<Result<Expense>> => {
  return expensesHandler.create(getDb(), payload);
});

handle('expenses:update', async (_event, { id, payload }): Promise<Result<Expense>> => {
  return expensesHandler.update(getDb(), id, payload);
});

handle('expenses:delete', async (_event, id): Promise<Result<null>> => {
  return expensesHandler.remove(getDb(), id);
});

handle('reports:summary', async (): Promise<Result<ReportSummary>> => {
  return reportsHandler.getSummary(getDb());
});

handle('reports:salesByDay', async (_event, days): Promise<Result<SalesByDay[]>> => {
  return reportsHandler.getSalesByDay(getDb(), days ?? 7);
});

handle('reports:topProducts', async (): Promise<Result<TopProduct[]>> => {
  return reportsHandler.getTopProducts(getDb());
});

handle('reports:lowStock', async (): Promise<Result<LowStockRow[]>> => {
  return reportsHandler.getLowStock(getDb());
});

handle('reports:receivables', async (): Promise<Result<BalanceRow[]>> => {
  return reportsHandler.getReceivables(getDb());
});

handle('reports:payables', async (): Promise<Result<BalanceRow[]>> => {
  return reportsHandler.getPayables(getDb());
});

handle('ai:selectFile', async (): Promise<Result<string | null>> => {
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

handle('ai:scan', async (_event, filePath): Promise<Result<ExtractedInvoice>> => {
  return scanInvoice(filePath, getGeminiKey(!app.isPackaged));
});

handle('dashboard:get', async (): Promise<Result<DashboardData>> => {
  return getDashboard(getDb());
});

handle('backup:now', async (): Promise<Result<string>> => {
  return backupNow();
});

handle('backup:exportCsv', async (): Promise<Result<string>> => {
  const picked = await dialog.showOpenDialog({ title: 'Choose a folder for the export', properties: ['openDirectory', 'createDirectory'] });
  if (picked.canceled || picked.filePaths.length === 0) {
    return { ok: false, error: { code: 'CANCELLED', message: 'Export cancelled' } };
  }
  try {
    const out = exportAllCsv(getDb(), picked.filePaths[0]);
    log.info(`Data exported to ${out.dir} (${out.tables} tables)`);
    return { ok: true, data: out.dir };
  } catch (err: any) {
    return { ok: false, error: { code: 'EXPORT_FAILED', message: err.message ?? 'Export failed' } };
  }
});

handle('backup:restore', async (): Promise<Result<null>> => {
  return restoreBackup();
});
