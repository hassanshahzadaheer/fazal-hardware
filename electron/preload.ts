import { contextBridge, ipcRenderer } from 'electron';
import { Result } from '../shared/types';

// IPC surface will grow here module-by-module per docs/Fazal_Hardware_PRD.md.
contextBridge.exposeInMainWorld('api', {
  app: {
    getVersion: (): Promise<Result<string>> => ipcRenderer.invoke('app:getVersion'),
  },
});
