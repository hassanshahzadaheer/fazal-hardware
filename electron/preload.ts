import { contextBridge, ipcRenderer } from 'electron';
import { Result, SessionUser } from '../shared/types';

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
});
