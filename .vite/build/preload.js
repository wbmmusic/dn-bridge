"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => electron.ipcRenderer.send(channel, ...args),
  on: (channel, func) => {
    electron.ipcRenderer.on(channel, (_event, ...args) => func(...args));
  },
  receive: (channel, func) => {
    electron.ipcRenderer.on(channel, (_event, ...args) => func(...args));
  },
  removeListener: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  }
});
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getInterface: () => electron.ipcRenderer.invoke("getInterface"),
  getNetworkInterfaces: () => electron.ipcRenderer.invoke("getNetworkInterfaces"),
  getVenueIP: () => electron.ipcRenderer.invoke("getVenueIP"),
  setInterface: (data) => electron.ipcRenderer.invoke("setInterface", data),
  setShowUniverses: (state) => electron.ipcRenderer.invoke("setShowUniverses", state),
  runSystem: (address) => electron.ipcRenderer.invoke("runSystem", address),
  stopSystem: () => electron.ipcRenderer.invoke("stopSystem"),
  reactIsReady: () => electron.ipcRenderer.send("reactIsReady"),
  installUpdate: () => electron.ipcRenderer.send("installUpdate"),
  onMessage: (callback) => electron.ipcRenderer.on("message", (_event, message) => callback(message)),
  onUpdater: (callback) => electron.ipcRenderer.on("updater", (_event, event, data) => callback(event, data)),
  onUniverses: (callback) => electron.ipcRenderer.on("universes", (_event, universes) => callback(universes))
});
