import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import * as isDev from 'electron-is-dev';

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupAutoUpdater();
  }

  private setupAutoUpdater(): void {
    if (isDev) {
      console.log('Auto-updater disabled in development mode');
      return;
    }

    // Configure auto-updater
    autoUpdater.autoDownload = false; // Don't auto-download updates
    autoUpdater.autoInstallOnAppQuit = true;

    // Set update server URL (GitHub releases by default)
    if (process.env.UPDATE_SERVER_URL) {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: process.env.UPDATE_SERVER_URL
      });
    }

    this.setupEventHandlers();
    this.startPeriodicCheck();
  }

  private setupEventHandlers(): void {
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      this.sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        size: info.files?.[0]?.size
      });
      
      this.showUpdateAvailableDialog(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
      this.sendToRenderer('update-not-available');
    });

    autoUpdater.on('error', (err) => {
      console.error('Auto-updater error:', err);
      this.sendToRenderer('update-error', {
        message: err.message,
        stack: err.stack
      });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`Download progress: ${progressObj.percent}%`);
      this.sendToRenderer('update-download-progress', {
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
        total: progressObj.total,
        transferred: progressObj.transferred
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      });
      
      this.showUpdateDownloadedDialog(info);
    });
  }

  private async showUpdateAvailableDialog(info: any): Promise<void> {
    if (!this.mainWindow) return;

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      buttons: ['Download Now', 'Download Later', 'Skip This Version'],
      defaultId: 0,
      title: 'Update Available',
      message: `A new version (${info.version}) is available!`,
      detail: `Current version: ${autoUpdater.currentVersion}\nNew version: ${info.version}\n\nWould you like to download it now?`,
      checkboxLabel: 'Automatically download future updates',
      checkboxChecked: false
    });

    switch (response.response) {
      case 0: // Download Now
        this.downloadUpdate();
        if (response.checkboxChecked) {
          autoUpdater.autoDownload = true;
        }
        break;
      case 1: // Download Later
        // User will be prompted again on next check
        break;
      case 2: // Skip This Version
        // Store skipped version to avoid prompting again
        this.skipVersion(info.version);
        break;
    }
  }

  private async showUpdateDownloadedDialog(info: any): Promise<void> {
    if (!this.mainWindow) return;

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      buttons: ['Restart Now', 'Restart Later'],
      defaultId: 0,
      title: 'Update Ready',
      message: `Update downloaded successfully!`,
      detail: `Version ${info.version} has been downloaded and is ready to install.\n\nThe application will restart to apply the update.`
    });

    if (response.response === 0) {
      // Restart now
      autoUpdater.quitAndInstall();
    }
    // If "Restart Later", the update will be applied on next app restart
  }

  private downloadUpdate(): void {
    if (!this.mainWindow) return;

    // Show download progress dialog
    this.sendToRenderer('update-download-started');
    
    autoUpdater.downloadUpdate().catch((error) => {
      console.error('Failed to download update:', error);
      
      dialog.showErrorBox(
        'Update Download Failed',
        `Failed to download update: ${error.message}\n\nPlease try again later or download manually from our website.`
      );
    });
  }

  private skipVersion(version: string): void {
    // Store skipped version in user preferences
    // This would typically be stored in a config file or registry
    console.log(`Skipping version ${version}`);
  }

  private startPeriodicCheck(): void {
    // Check for updates every 4 hours
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates(false);
    }, 4 * 60 * 60 * 1000);

    // Initial check after 30 seconds
    setTimeout(() => {
      this.checkForUpdates(false);
    }, 30000);
  }

  public checkForUpdates(showNoUpdateDialog = true): void {
    if (isDev) {
      if (showNoUpdateDialog && this.mainWindow) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'Updates',
          message: 'Updates are not available in development mode.',
          detail: 'The auto-updater only works in production builds.'
        });
      }
      return;
    }

    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error('Failed to check for updates:', error);
      
      if (showNoUpdateDialog && this.mainWindow) {
        dialog.showErrorBox(
          'Update Check Failed',
          `Failed to check for updates: ${error.message}\n\nPlease check your internet connection and try again.`
        );
      }
    });
  }

  public downloadAndInstallUpdate(): void {
    if (isDev) return;

    autoUpdater.downloadUpdate().then(() => {
      // Download started successfully
    }).catch((error) => {
      console.error('Failed to start update download:', error);
    });
  }

  public quitAndInstall(): void {
    if (isDev) return;
    
    autoUpdater.quitAndInstall();
  }

  private sendToRenderer(channel: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  public destroy(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }
}

export default AutoUpdaterService;