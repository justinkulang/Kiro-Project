import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface
export interface ElectronAPI {
  // App info
  getAppInfo(): Promise<{
    name: string;
    version: string;
    platform: string;
    arch: string;
    electronVersion: string;
    nodeVersion: string;
  }>;

  // File operations
  showSaveDialog(options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue>;
  showOpenDialog(options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue>;

  // External operations
  openExternal(url: string): Promise<void>;
  restartApp(): Promise<void>;

  // Theme operations
  setTheme(theme: 'light' | 'dark' | 'system'): Promise<void>;
  getTheme(): Promise<{
    shouldUseDarkColors: boolean;
    themeSource: string;
  }>;

  // Notifications
  showNotification(options: {
    title: string;
    body: string;
    icon?: string;
  }): Promise<void>;

  // Event listeners
  onMenuAction(callback: (action: string) => void): () => void;
  onUpdateAvailable(callback: (info: any) => void): () => void;
  onUpdateProgress(callback: (progress: any) => void): () => void;
  onUpdateDownloaded(callback: (info: any) => void): () => void;
  onImportUsers(callback: (filePath: string) => void): () => void;
  onExportUsers(callback: (filePath: string) => void): () => void;
  onBackupDatabase(callback: (filePath: string) => void): () => void;
  onRestoreDatabase(callback: (filePath: string) => void): () => void;

  // Platform info
  platform: string;
  isElectron: boolean;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // External operations
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  restartApp: () => ipcRenderer.invoke('restart-app'),

  // Theme operations
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getTheme: () => ipcRenderer.invoke('get-theme'),

  // Notifications
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),

  // Event listeners
  onMenuAction: (callback) => {
    const subscription = (event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on('menu-action', subscription);
    
    return () => {
      ipcRenderer.removeListener('menu-action', subscription);
    };
  },

  onUpdateAvailable: (callback) => {
    const subscription = (event: Electron.IpcRendererEvent, info: any) => callback(info);
    ipcRenderer.on('update-available', subscription);
    
    return () => {
      ipcRenderer.removeListener('update-available', subscription);
    };
  },

  onUpdateProgress: (callback) => {
    const subscription = (event: Electron.IpcRendererEvent, progress: any) => callback(progress);
    ipcRenderer.on('update-progress', subscription);
    
    return () => {
      ipcRenderer.removeListener('update-progress', subscription);
    };
  },

  onUpdateDownloaded: (callback) => {
    const subscription = (event: Electron.IpcRendererEvent, info: any) => callback(info);
    ipcRenderer.on('update-downloaded', subscription);
    
    return () => {
      ipcRenderer.removeListener('update-downloaded', subscription);
    };
  },

  onImportUsers: (callback) => {
    const subscription = (event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('import-users', subscription);
    
    return () => {
      ipcRenderer.removeListener('import-users', subscription);
    };
  },

  onExportUsers: (callback) => {
    const subscription = (event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('export-users', subscription);
    
    return () => {
      ipcRenderer.removeListener('export-users', subscription);
    };
  },

  onBackupDatabase: (callback) => {
    const subscription = (event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('backup-database', subscription);
    
    return () => {
      ipcRenderer.removeListener('backup-database', subscription);
    };
  },

  onRestoreDatabase: (callback) => {
    const subscription = (event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('restore-database', subscription);
    
    return () => {
      ipcRenderer.removeListener('restore-database', subscription);
    };
  },

  // Platform info
  platform: process.platform,
  isElectron: true
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } catch (error) {
    console.error('Failed to expose electronAPI:', error);
  }
} else {
  // @ts-ignore (define in dts file)
  window.electronAPI = electronAPI;
}

export type { ElectronAPI };