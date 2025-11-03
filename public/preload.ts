import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  on: (channel: string, func: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => func(...args));
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => func(...args));
  },
  removeListener: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Also expose specific APIs for type safety
contextBridge.exposeInMainWorld('electronAPI', {
  getInterface: () => ipcRenderer.invoke('getInterface'),
  getNetworkInterfaces: () => ipcRenderer.invoke('getNetworkInterfaces'),
  getVenueIP: () => ipcRenderer.invoke('getVenueIP'),
  setInterface: (data: { name: string; address: string }) => ipcRenderer.invoke('setInterface', data),
  setShowUniverses: (state: boolean) => ipcRenderer.invoke('setShowUniverses', state),
  runSystem: (address: string) => ipcRenderer.invoke('runSystem', address),
  stopSystem: () => ipcRenderer.invoke('stopSystem'),
  reactIsReady: () => ipcRenderer.send('reactIsReady'),
  installUpdate: () => ipcRenderer.send('installUpdate'),
  
  onMessage: (callback: (message: string) => void) => 
    ipcRenderer.on('message', (_event, message) => callback(message)),
  onUpdater: (callback: (event: string, data?: any) => void) => 
    ipcRenderer.on('updater', (_event, event, data) => callback(event, data)),
  onUniverses: (callback: (universes: any) => void) => 
    ipcRenderer.on('universes', (_event, universes) => callback(universes)),
});