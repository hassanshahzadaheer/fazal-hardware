import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import log from 'electron-log';
import { initDb, closeDb, getDb } from './db';
import bcrypt from 'bcryptjs';
import { Result, SessionUser } from '../shared/types';
import { ProductsHandler } from './handlers/products';

// Configure logger
log.initialize();
log.info('Starting Fazal POS & Inventory System...');

let mainWindow: BrowserWindow | null = null;
let sessionUser: SessionUser | null = null;

// Single instance lock
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

  // Load app
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
    // Initialize DB
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

// Setup IPC handlers
ipcMain.handle('auth:login', async (_event, { username, password }): Promise<Result<SessionUser>> => {
  try {
    log.info(`Auth login attempt: ${username}`);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username) as any;
    
    if (!user) {
      log.warn(`User not found or inactive: ${username}`);
      return { ok: false, error: { code: 'AUTH_INVALID', message: 'Invalid username or password' } };
    }

    const matches = bcrypt.compareSync(password, user.password_hash);
    if (!matches) {
      log.warn(`Invalid password for user: ${username}`);
      return { ok: false, error: { code: 'AUTH_INVALID', message: 'Invalid username or password' } };
    }

    // Update last login
    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);

    sessionUser = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      lastLoginAt: new Date().toISOString()
    };

    log.info(`User authenticated: ${username} with role ${user.role}`);
    return { ok: true, data: sessionUser };
  } catch (err: any) {
    log.error('Login error:', err);
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: err.message } };
  }
});

ipcMain.handle('auth:logout', async (): Promise<Result<null>> => {
  log.info(`User logged out: ${sessionUser?.username || 'unknown'}`);
  sessionUser = null;
  return { ok: true, data: null };
});

ipcMain.handle('auth:getCurrentUser', async (): Promise<Result<SessionUser | null>> => {
  return { ok: true, data: sessionUser };
});

// Settings handlers
ipcMain.handle('settings:get', async (): Promise<Result<any>> => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    return { ok: true, data: row };
  } catch (err: any) {
    return { ok: false, error: { code: 'DB_ERROR', message: err.message } };
  }
});

ipcMain.handle('settings:update', async (_event, dto): Promise<Result<any>> => {
  try {
    const db = getDb();
    db.prepare(`
      UPDATE settings 
      SET company_name = ?, address = ?, phone1 = ?, phone2 = ?, email = ?, 
          currency_symbol = ?, invoice_footer = ?, quotation_note = ?, 
          idle_logout_minutes = ?, updated_at = datetime('now')
      WHERE id = 1
    `).run(
      dto.companyName, dto.address, dto.phone1, dto.phone2, dto.email, 
      dto.currencySymbol, dto.invoiceFooter, dto.quotationNote, dto.idleLogoutMinutes
    );
    const row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    return { ok: true, data: row };
  } catch (err: any) {
    return { ok: false, error: { code: 'DB_ERROR', message: err.message } };
  }
});

// General IPC placeholder logs for other unimplemented domain IPC calls
const registeredDomains = [
  'customers', 'suppliers', 'parties', 'sales', 
  'quotations', 'purchases', 'payments', 'expenses', 'reports', 'print', 'users', 'backup'
];

// Initialize handlers after database is ready
let productsHandler: ProductsHandler;

app.on('ready', () => {
  // This is called in the createWindow() function now
  // We'll initialize handlers there
});

// Products handlers
ipcMain.handle('products:list', async (_event, query) => {
  if (!productsHandler) {
    productsHandler = new ProductsHandler(getDb());
  }
  return productsHandler.list(query);
});

ipcMain.handle('products:get', async (_event, id) => {
  if (!productsHandler) {
    productsHandler = new ProductsHandler(getDb());
  }
  return productsHandler.get(id);
});

ipcMain.handle('products:create', async (_event, dto) => {
  if (!productsHandler) {
    productsHandler = new ProductsHandler(getDb());
  }
  return productsHandler.create(dto);
});

ipcMain.handle('products:update', async (_event, { id, dto }) => {
  if (!productsHandler) {
    productsHandler = new ProductsHandler(getDb());
  }
  return productsHandler.update(id, dto);
});

ipcMain.handle('products:deactivate', async (_event, id) => {
  if (!productsHandler) {
    productsHandler = new ProductsHandler(getDb());
  }
  return productsHandler.deactivate(id);
});

ipcMain.handle('products:ledger', async (_event, id) => {
  if (!productsHandler) {
    productsHandler = new ProductsHandler(getDb());
  }
  return productsHandler.ledger(id);
});

ipcMain.handle('products:categories', async () => {
  if (!productsHandler) {
    productsHandler = new ProductsHandler(getDb());
  }
  return productsHandler.categories();
});

ipcMain.handle('products:suppliers', async () => {
  if (!productsHandler) {
    productsHandler = new ProductsHandler(getDb());
  }
  return productsHandler.suppliers();
});

ipcMain.handle('products:colors', async () => {
  if (!productsHandler) {
    productsHandler = new ProductsHandler(getDb());
  }
  return productsHandler.colors();
});
