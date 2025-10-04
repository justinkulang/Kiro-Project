import { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeTheme } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

// Security configuration
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'file://'
];

class MikroTikHotspotApp {
  private mainWindow: BrowserWindow | null = null;
  private apiServer: ChildProcess | null = null;
  private isQuitting = false;

  constructor() {
    this.setupApp();
    this.setupAutoUpdater();
    this.setupIpcHandlers();
  }

  private setupApp(): void {
    // Set app user model ID for Windows
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.mikrotik.hotspot.platform');
    }

    // Security: Prevent new window creation
    app.on('web-contents-created', (event, contents) => {
      contents.on('new-window', (navigationEvent, navigationUrl) => {
        navigationEvent.preventDefault();
        
        // Allow opening external links in default browser
        if (navigationUrl.startsWith('http://') || navigationUrl.startsWith('https://')) {
          shell.openExternal(navigationUrl);
        }
      });

      // Security: Prevent navigation to external URLs
      contents.on('will-navigate', (navigationEvent, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (!ALLOWED_ORIGINS.some(origin => navigationUrl.startsWith(origin))) {
          navigationEvent.preventDefault();
        }
      });
    });

    // App event handlers
    app.whenReady().then(() => {
      this.createMainWindow();
      this.createApplicationMenu();
      this.startApiServer();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.quit();
      }
    });

    app.on('before-quit', () => {
      this.isQuitting = true;
    });

    // Security: Prevent insecure content
    app.on('web-contents-created', (event, contents) => {
      contents.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
        if (isDev) {
          // In development, ignore certificate errors for localhost
          event.preventDefault();
          callback(true);
        } else {
          // In production, use default behavior
          callback(false);
        }
      });
    });
  }

  private createMainWindow(): void {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      show: false,
      icon: this.getAppIcon(),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: !isDev,
        allowRunningInsecureContent: false,
        experimentalFeatures: false
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      frame: true,
      backgroundColor: '#ffffff'
    });

    // Load the app
    const startUrl = isDev 
      ? 'http://localhost:5173' 
      : `file://${path.join(__dirname, '../renderer/index.html')}`;
    
    this.mainWindow.loadURL(startUrl);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        
        // Focus on window
        if (isDev) {
          this.mainWindow.webContents.openDevTools();
        }
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle window close event
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting && process.platform === 'darwin') {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    // Security: Prevent external navigation
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      if (url !== this.mainWindow?.webContents.getURL()) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });
  }

  private createApplicationMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New User',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.sendToRenderer('menu-action', 'new-user');
            }
          },
          {
            label: 'Import Users',
            click: () => {
              this.handleImportUsers();
            }
          },
          {
            label: 'Export Users',
            click: () => {
              this.handleExportUsers();
            }
          },
          { type: 'separator' },
          {
            label: 'Preferences',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.sendToRenderer('menu-action', 'preferences');
            }
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              this.quit();
            }
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Dashboard',
            accelerator: 'CmdOrCtrl+1',
            click: () => {
              this.sendToRenderer('menu-action', 'navigate-dashboard');
            }
          },
          {
            label: 'Users',
            accelerator: 'CmdOrCtrl+2',
            click: () => {
              this.sendToRenderer('menu-action', 'navigate-users');
            }
          },
          {
            label: 'Vouchers',
            accelerator: 'CmdOrCtrl+3',
            click: () => {
              this.sendToRenderer('menu-action', 'navigate-vouchers');
            }
          },
          {
            label: 'Reports',
            accelerator: 'CmdOrCtrl+4',
            click: () => {
              this.sendToRenderer('menu-action', 'navigate-reports');
            }
          },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Tools',
        submenu: [
          {
            label: 'Test MikroTik Connection',
            click: () => {
              this.sendToRenderer('menu-action', 'test-mikrotik');
            }
          },
          {
            label: 'Sync Users with MikroTik',
            click: () => {
              this.sendToRenderer('menu-action', 'sync-users');
            }
          },
          { type: 'separator' },
          {
            label: 'Database Backup',
            click: () => {
              this.handleDatabaseBackup();
            }
          },
          {
            label: 'Database Restore',
            click: () => {
              this.handleDatabaseRestore();
            }
          },
          { type: 'separator' },
          {
            label: 'Clear Cache',
            click: () => {
              this.sendToRenderer('menu-action', 'clear-cache');
            }
          }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
          ...(process.platform === 'darwin' ? [
            { type: 'separator' as const },
            { role: 'front' as const }
          ] : [])
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About',
            click: () => {
              this.showAboutDialog();
            }
          },
          {
            label: 'User Manual',
            click: () => {
              shell.openExternal('https://github.com/your-repo/mikrotik-hotspot-platform/wiki');
            }
          },
          {
            label: 'Report Issue',
            click: () => {
              shell.openExternal('https://github.com/your-repo/mikrotik-hotspot-platform/issues');
            }
          },
          { type: 'separator' },
          {
            label: 'Check for Updates',
            click: () => {
              this.checkForUpdates();
            }
          }
        ]
      }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIpcHandlers(): void {
    // Handle app info requests
    ipcMain.handle('get-app-info', () => {
      return {
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node
      };
    });

    // Handle file operations
    ipcMain.handle('show-save-dialog', async (event, options) => {
      if (!this.mainWindow) return { canceled: true };
      
      return await dialog.showSaveDialog(this.mainWindow, options);
    });

    ipcMain.handle('show-open-dialog', async (event, options) => {
      if (!this.mainWindow) return { canceled: true };
      
      return await dialog.showOpenDialog(this.mainWindow, options);
    });

    // Handle external links
    ipcMain.handle('open-external', async (event, url) => {
      await shell.openExternal(url);
    });

    // Handle app restart
    ipcMain.handle('restart-app', () => {
      app.relaunch();
      app.exit();
    });

    // Handle theme changes
    ipcMain.handle('set-theme', (event, theme: 'light' | 'dark' | 'system') => {
      nativeTheme.themeSource = theme;
    });

    ipcMain.handle('get-theme', () => {
      return {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
        themeSource: nativeTheme.themeSource
      };
    });

    // Handle notifications
    ipcMain.handle('show-notification', (event, options) => {
      const { Notification } = require('electron');
      
      if (Notification.isSupported()) {
        const notification = new Notification(options);
        notification.show();
      }
    });
  }

  private setupAutoUpdater(): void {
    if (isDev) {
      return; // Skip auto-updater in development
    }

    // Configure auto-updater
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available.');
      this.sendToRenderer('update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available.');
    });

    autoUpdater.on('error', (err) => {
      console.log('Error in auto-updater. ' + err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendToRenderer('update-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded');
      this.sendToRenderer('update-downloaded', info);
    });

    // Check for updates every hour
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 60 * 60 * 1000);
  }

  private startApiServer(): void {
    if (isDev) {
      return; // API server runs separately in development
    }

    try {
      const serverPath = path.join(__dirname, '../api/server.js');
      
      if (fs.existsSync(serverPath)) {
        this.apiServer = spawn('node', [serverPath], {
          stdio: 'pipe',
          env: { ...process.env, NODE_ENV: 'production' }
        });

        this.apiServer.stdout?.on('data', (data) => {
          console.log(`API Server: ${data}`);
        });

        this.apiServer.stderr?.on('data', (data) => {
          console.error(`API Server Error: ${data}`);
        });

        this.apiServer.on('close', (code) => {
          console.log(`API Server exited with code ${code}`);
        });
      }
    } catch (error) {
      console.error('Failed to start API server:', error);
    }
  }

  private getAppIcon(): string {
    const iconPath = path.join(__dirname, '../assets/icons');
    
    if (process.platform === 'win32') {
      return path.join(iconPath, 'icon.ico');
    } else if (process.platform === 'darwin') {
      return path.join(iconPath, 'icon.icns');
    } else {
      return path.join(iconPath, 'icon.png');
    }
  }

  private sendToRenderer(channel: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  private async handleImportUsers(): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showOpenDialog(this.mainWindow, {
      title: 'Import Users',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.sendToRenderer('import-users', result.filePaths[0]);
    }
  }

  private async handleExportUsers(): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showSaveDialog(this.mainWindow, {
      title: 'Export Users',
      defaultPath: `users-export-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'JSON Files', extensions: ['json'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      this.sendToRenderer('export-users', result.filePath);
    }
  }

  private async handleDatabaseBackup(): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showSaveDialog(this.mainWindow, {
      title: 'Backup Database',
      defaultPath: `hotspot-backup-${new Date().toISOString().split('T')[0]}.db`,
      filters: [
        { name: 'Database Files', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      this.sendToRenderer('backup-database', result.filePath);
    }
  }

  private async handleDatabaseRestore(): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showOpenDialog(this.mainWindow, {
      title: 'Restore Database',
      filters: [
        { name: 'Database Files', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const confirmResult = await dialog.showMessageBox(this.mainWindow, {
        type: 'warning',
        buttons: ['Cancel', 'Restore'],
        defaultId: 0,
        title: 'Confirm Database Restore',
        message: 'This will replace your current database with the selected backup.',
        detail: 'This action cannot be undone. Make sure you have a current backup before proceeding.'
      });

      if (confirmResult.response === 1) {
        this.sendToRenderer('restore-database', result.filePaths[0]);
      }
    }
  }

  private showAboutDialog(): void {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About MikroTik Hotspot Platform',
      message: 'MikroTik Hotspot Platform',
      detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}\nPlatform: ${process.platform} ${process.arch}\n\nA comprehensive hotspot management solution for MikroTik routers.`
    });
  }

  private checkForUpdates(): void {
    if (isDev) {
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Updates',
        message: 'Updates are not available in development mode.'
      });
      return;
    }

    autoUpdater.checkForUpdatesAndNotify();
  }

  private quit(): void {
    this.isQuitting = true;
    
    // Stop API server
    if (this.apiServer) {
      this.apiServer.kill();
    }

    app.quit();
  }
}

// Initialize the application
new MikroTikHotspotApp();