import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import { join } from 'path';
import { autoUpdater } from 'electron-updater';
import { networkInterfaces } from 'os';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { fork, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// Vite defines these constants for Electron Forge
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Suppress CSP warnings in development
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

interface Config {
  venueIP: string;
  interface: {
    name: string;
    address: string;
  };
}

interface ArtNetMessage {
  cmd: string;
  universes?: any;
  error?: string;
  result?: any;
  data?: any;
}

const myEmitter = new EventEmitter();

let win: BrowserWindow;
let activeInterface: any = null;

const pathToConfigFile = join(app.getPath('userData'), 'config.json');
let config: Config;
const defaultConfig: Config = { venueIP: '', interface: { name: '', address: '' } };

const saveConfig = (data: Config): void => {
  writeFileSync(pathToConfigFile, JSON.stringify(data, null, '\t'));
  config = JSON.parse(readFileSync(pathToConfigFile, 'utf-8'));
};

if (!existsSync(pathToConfigFile)) {
  saveConfig(defaultConfig);
  console.log("Created Config File");
} else {
  config = JSON.parse(readFileSync(pathToConfigFile, 'utf-8'));
}

// SECOND INSTANCE
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

// In dev: __dirname is .vite/build, artNet.js is in public/
// In prod: artNet.js is in extraResources
const artNetPath = app.isPackaged
  ? join(process.resourcesPath, 'artNet.js')
  : join(__dirname, '..', '..', 'public', 'artNet.js');

const artNet: ChildProcess = fork(artNetPath, { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
artNet.stdout?.pipe(process.stdout);
artNet.stderr?.pipe(process.stdout);

const createWindow = (): void => {
  win = new BrowserWindow({
    width: 950,
    height: 500,
    autoHideMenuBar: true,
    show: false,
    title: 'DN bridge ' + app.getVersion(),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: false
    }
  });

  // Load the app using Vite constants
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  win.on('closed', () => app.quit());
  win.on('ready-to-show', () => win.show());
};

app.on('ready', async () => {
  artNet.on('message', (msg: ArtNetMessage) => {
    switch (msg.cmd) {
      case 'universes':
        try {
          win.webContents.send('universes', msg.universes);
        } catch (error) {
          // Window not ready
        }
        break;

      case 'startResult':
        if (msg.error) {
          console.log('start error', msg.error);
          myEmitter.emit('startResult', msg);
        } else {
          myEmitter.emit('startResult', msg);
        }
        break;

      case 'sendToVenueResult':
        if (msg.error) {
          console.log('start error', msg.error);
          myEmitter.emit('sendToVenueResult', msg);
        } else {
          myEmitter.emit('sendToVenueResult', msg);
        }
        break;

      default:
        break;
    }
  });

  artNet.on('error', (err) => { console.log(err); });
  artNet.on('close', (err, msg) => { console.log(err, msg); });

  const startUDP = async (): Promise<any> => {
    console.log("IN START UDP");
    return new Promise(async (resolve, reject) => {
      const handleResult = (msg: ArtNetMessage) => {
        myEmitter.removeListener('startResult', handleResult);
        if (msg.error) reject(msg.error);
        resolve(msg.result);
      };

      setTimeout(() => {
        myEmitter.removeListener('startResult', handleResult);
        reject('start UDP timed out');
      }, 5000);

      myEmitter.on('startResult', handleResult);

      artNet.send?.({ cmd: 'start', config });
    });
  };

  const runServer = async (): Promise<void> => {
    try {
      const result = await startUDP();
      activeInterface = result;
      console.log('Run Server Result', result);
    } catch (error) {
      throw error;
    }
  };

  if (networkInterfaces()[config.interface.name] !== undefined) {
    const theIface = networkInterfaces()[config.interface.name]?.find(
      (ifa) => ifa.address === config.interface.address
    );
    if (theIface !== undefined) runServer();
  }

  ipcMain.on('reactIsReady', () => {
    win.webContents.send('message', 'React Is Ready');

    if (app.isPackaged) {
      win.webContents.send('message', 'App is packaged');

      autoUpdater.on('error', (err) => win.webContents.send('updater', err));
      autoUpdater.on('checking-for-update', () => win.webContents.send('updater', "checking-for-update"));
      autoUpdater.on('update-available', (info) => win.webContents.send('updater', 'update-available', info));
      autoUpdater.on('update-not-available', (info) => win.webContents.send('updater', 'update-not-available', info));
      autoUpdater.on('download-progress', (info) => win.webContents.send('updater', 'download-progress', info));
      autoUpdater.on('update-downloaded', (info) => win.webContents.send('updater', 'update-downloaded', info));

      ipcMain.on('installUpdate', () => autoUpdater.quitAndInstall());

      setTimeout(() => autoUpdater.checkForUpdates(), 3000);
      setInterval(() => autoUpdater.checkForUpdates(), 1000 * 60 * 60);
    }
  });

  createWindow();

  ipcMain.handle('getInterface', () => activeInterface);
  ipcMain.handle('getNetworkInterfaces', () => networkInterfaces());
  ipcMain.handle('getVenueIP', () => config.venueIP);
  
  ipcMain.handle('setInterface', async (_e: IpcMainInvokeEvent, data: { name: string; address: string }) => {
    return new Promise(async (resolve, reject) => {
      let tempConfig = config;
      tempConfig.interface = data;
      saveConfig(tempConfig);
      try {
        const result = await startUDP();
        console.log('Result in setInterface', result);
        activeInterface = result;
        resolve(activeInterface);
      } catch (error) {
        reject(error);
      }
    });
  });

  ipcMain.handle('setShowUniverses', (_e: IpcMainInvokeEvent, state: boolean) => {
    if (state) {
      artNet.send?.({ cmd: 'sendUniverses', value: true });
      return true;
    } else {
      artNet.send?.({ cmd: 'sendUniverses', value: false });
      return false;
    }
  });

  const sendToVenue = async (yesNo: boolean, address?: string): Promise<any> => {
    console.log("Send To Venue", yesNo, address);
    return new Promise(async (resolve, reject) => {
      if (yesNo && address) {
        let tempConfig = config;
        tempConfig.venueIP = address;
        saveConfig(tempConfig);
      }

      const handleSendToVenueResult = (msg: ArtNetMessage) => {
        console.log("MESSAGE HERE", msg);
        myEmitter.removeListener('sendToVenueResult', handleSendToVenueResult);
        resolve(msg.data);
      };

      setTimeout(() => {
        myEmitter.removeListener('sendToVenueResult', handleSendToVenueResult);
        reject('sendToVenue Timed Out');
      }, 1000);

      myEmitter.on('sendToVenueResult', handleSendToVenueResult);

      artNet.send?.({ cmd: 'sendToVenue', value: yesNo, config });
    });
  };

  ipcMain.handle('runSystem', async (_e: IpcMainInvokeEvent, address: string) => await sendToVenue(true, address));
  ipcMain.handle('stopSystem', async () => await sendToVenue(false));

  app.on('activate', () => { 
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => artNet.kill('SIGKILL'));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});