"use strict";
const electron = require("electron");
const path = require("path");
const electronUpdater = require("electron-updater");
const os = require("os");
const fs = require("fs");
const child_process = require("child_process");
const events = require("events");
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
const myEmitter = new events.EventEmitter();
let win;
let activeInterface = null;
const pathToConfigFile = path.join(electron.app.getPath("userData"), "config.json");
let config;
const defaultConfig = { venueIP: "", interface: { name: "", address: "" } };
const saveConfig = (data) => {
  fs.writeFileSync(pathToConfigFile, JSON.stringify(data, null, "	"));
  config = JSON.parse(fs.readFileSync(pathToConfigFile, "utf-8"));
};
if (!fs.existsSync(pathToConfigFile)) {
  saveConfig(defaultConfig);
  console.log("Created Config File");
} else {
  config = JSON.parse(fs.readFileSync(pathToConfigFile, "utf-8"));
}
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}
const artNetPath = electron.app.isPackaged ? path.join(process.resourcesPath, "artNet.js") : path.join(__dirname, "..", "..", "public", "artNet.js");
const artNet = child_process.fork(artNetPath, { stdio: ["pipe", "pipe", "pipe", "ipc"] });
artNet.stdout?.pipe(process.stdout);
artNet.stderr?.pipe(process.stdout);
const createWindow = () => {
  win = new electron.BrowserWindow({
    width: 950,
    height: 500,
    autoHideMenuBar: true,
    show: false,
    title: "DN bridge " + electron.app.getVersion(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      sandbox: false
    }
  });
  {
    win.loadURL("http://localhost:5173");
  }
  win.on("closed", () => electron.app.quit());
  win.on("ready-to-show", () => win.show());
};
electron.app.on("ready", async () => {
  artNet.on("message", (msg) => {
    switch (msg.cmd) {
      case "universes":
        try {
          win.webContents.send("universes", msg.universes);
        } catch (error) {
        }
        break;
      case "startResult":
        if (msg.error) {
          console.log("start error", msg.error);
          myEmitter.emit("startResult", msg);
        } else {
          myEmitter.emit("startResult", msg);
        }
        break;
      case "sendToVenueResult":
        if (msg.error) {
          console.log("start error", msg.error);
          myEmitter.emit("sendToVenueResult", msg);
        } else {
          myEmitter.emit("sendToVenueResult", msg);
        }
        break;
    }
  });
  artNet.on("error", (err) => {
    console.log(err);
  });
  artNet.on("close", (err, msg) => {
    console.log(err, msg);
  });
  const startUDP = async () => {
    console.log("IN START UDP");
    return new Promise(async (resolve, reject) => {
      const handleResult = (msg) => {
        myEmitter.removeListener("startResult", handleResult);
        if (msg.error) reject(msg.error);
        resolve(msg.result);
      };
      setTimeout(() => {
        myEmitter.removeListener("startResult", handleResult);
        reject("start UDP timed out");
      }, 5e3);
      myEmitter.on("startResult", handleResult);
      artNet.send?.({ cmd: "start", config });
    });
  };
  const runServer = async () => {
    try {
      const result = await startUDP();
      activeInterface = result;
      console.log("Run Server Result", result);
    } catch (error) {
      throw error;
    }
  };
  if (os.networkInterfaces()[config.interface.name] !== void 0) {
    const theIface = os.networkInterfaces()[config.interface.name]?.find(
      (ifa) => ifa.address === config.interface.address
    );
    if (theIface !== void 0) runServer();
  }
  electron.ipcMain.on("reactIsReady", () => {
    win.webContents.send("message", "React Is Ready");
    if (electron.app.isPackaged) {
      win.webContents.send("message", "App is packaged");
      electronUpdater.autoUpdater.on("error", (err) => win.webContents.send("updater", err));
      electronUpdater.autoUpdater.on("checking-for-update", () => win.webContents.send("updater", "checking-for-update"));
      electronUpdater.autoUpdater.on("update-available", (info) => win.webContents.send("updater", "update-available", info));
      electronUpdater.autoUpdater.on("update-not-available", (info) => win.webContents.send("updater", "update-not-available", info));
      electronUpdater.autoUpdater.on("download-progress", (info) => win.webContents.send("updater", "download-progress", info));
      electronUpdater.autoUpdater.on("update-downloaded", (info) => win.webContents.send("updater", "update-downloaded", info));
      electron.ipcMain.on("installUpdate", () => electronUpdater.autoUpdater.quitAndInstall());
      setTimeout(() => electronUpdater.autoUpdater.checkForUpdates(), 3e3);
      setInterval(() => electronUpdater.autoUpdater.checkForUpdates(), 1e3 * 60 * 60);
    }
  });
  createWindow();
  electron.ipcMain.handle("getInterface", () => activeInterface);
  electron.ipcMain.handle("getNetworkInterfaces", () => os.networkInterfaces());
  electron.ipcMain.handle("getVenueIP", () => config.venueIP);
  electron.ipcMain.handle("setInterface", async (_e, data) => {
    return new Promise(async (resolve, reject) => {
      let tempConfig = config;
      tempConfig.interface = data;
      saveConfig(tempConfig);
      try {
        const result = await startUDP();
        console.log("Result in setInterface", result);
        activeInterface = result;
        resolve(activeInterface);
      } catch (error) {
        reject(error);
      }
    });
  });
  electron.ipcMain.handle("setShowUniverses", (_e, state) => {
    if (state) {
      artNet.send?.({ cmd: "sendUniverses", value: true });
      return true;
    } else {
      artNet.send?.({ cmd: "sendUniverses", value: false });
      return false;
    }
  });
  const sendToVenue = async (yesNo, address) => {
    console.log("Send To Venue", yesNo, address);
    return new Promise(async (resolve, reject) => {
      if (yesNo && address) {
        let tempConfig = config;
        tempConfig.venueIP = address;
        saveConfig(tempConfig);
      }
      const handleSendToVenueResult = (msg) => {
        console.log("MESSAGE HERE", msg);
        myEmitter.removeListener("sendToVenueResult", handleSendToVenueResult);
        resolve(msg.data);
      };
      setTimeout(() => {
        myEmitter.removeListener("sendToVenueResult", handleSendToVenueResult);
        reject("sendToVenue Timed Out");
      }, 1e3);
      myEmitter.on("sendToVenueResult", handleSendToVenueResult);
      artNet.send?.({ cmd: "sendToVenue", value: yesNo, config });
    });
  };
  electron.ipcMain.handle("runSystem", async (_e, address) => await sendToVenue(true, address));
  electron.ipcMain.handle("stopSystem", async () => await sendToVenue(false));
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("will-quit", () => artNet.kill("SIGKILL"));
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
//# sourceMappingURL=main.js.map
