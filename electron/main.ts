import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import log from 'electron-log';
import { initDb, closeDb, getDb } from './db';
import { Result, SessionUser } from '../shared/types';
import { login } from './handlers/auth';

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
