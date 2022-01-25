const { app, BrowserWindow, ipcMain } = require('electron')
const { join } = require('path')
const URL = require('url')
const { autoUpdater } = require('electron-updater');
const { networkInterfaces } = require('os')
const { decodeArtNet } = require('./artNet')
const { existsSync, writeFileSync, readFileSync } = require('fs')
const dgram = require('dgram');

console.log("TOP OF MAIN")
const pathToConfigFile = (join(app.getPath('userData'), 'config.json'))
let config = {}
const defaultConfig = {
    venueIP: '',
    interface: { name: '', address: '' }
}

const saveConfig = (data) => {
    writeFileSync(pathToConfigFile, JSON.stringify(data, null, '\t'))
    config = JSON.parse(readFileSync(pathToConfigFile))
}

if (!existsSync(pathToConfigFile)) {
    saveConfig(defaultConfig)
    console.log("Created Config File")
} else config = JSON.parse(readFileSync(pathToConfigFile))


let server = null
let sender = null
let outputData = false

const numberOfUniverses = 10

let virtualVenueAddress = ''

let win

let universes = []
for (let i = 0; i < numberOfUniverses; i++) universes.push([])
let updateUniverses = false

// SECOND INSTANCE
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) app.quit()
else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        if (win) {
            if (win.isMinimized()) win.restore()
            win.focus()
        }
    })
}
// END SECOND INSTANCE

let activeInterface = null

const createWindow = () => {
    // Create the browser window.
    win = new BrowserWindow({
        width: 950,
        height: 500,
        autoHideMenuBar: true,
        show: false,
        title: 'DN bridge ' + app.getVersion(),
        webPreferences: {
            preload: join(__dirname, 'preload.js')
        }
    })

    const startUrl = process.env.ELECTRON_START_URL || URL.format({
        pathname: join(__dirname, '/../build/index.html'),
        protocol: 'file:',
        slashes: true
    });


    console.log("Start URL =", startUrl)

    win.loadURL(startUrl);

    // Emitted when the window is closed.
    win.on('closed', () => app.quit())
    win.on('ready-to-show', () => win.show())

}

const setServer = () => {
    return new Promise((resolve, reject) => {
        server = dgram.createSocket('udp4');
        server.bind(6454, config.interface.address, () => {
            activeInterface = config.interface
            resolve(activeInterface)
        })
        server.on('error', (err) => {
            console.log(`server error:\n${err.stack}`);
            server.close();
            activeInterface = null
            reject(err)
        });

        server.on('message', (msg, rinfo) => {
            //console.log(`server got: data from ${rinfo.address}:${rinfo.port}`);
            //console.log(JSON.stringify(decodeArtNet(msg).netSubUni, null, '   '))

            if (outputData) {
                //console.log("Send Msg To Venue")
                sender.send(msg, 6454, config.venueIP)
            }
            //console.log(message)

            if (updateUniverses) {
                const message = decodeArtNet(msg)
                if (message.netSubUni > numberOfUniverses - 1) {
                    //console.log(message.netSubUni);
                    return
                }

                universes[message.netSubUni] = message.payload
            }

        });

        server.on('listening', () => {
            const address = server.address();
            console.log(`server listening ${address.address}:${address.port}`);
        });
    })
}

const tryToStartServer = () => {
    console.log(networkInterfaces())
    if (networkInterfaces()[config.interface.name] !== undefined) {
        const theIface = networkInterfaces()[config.interface.name].find(ifa => ifa.address === config.interface.address)
        if (theIface !== undefined) {
            console.log('Starting Server')
            setServer()
        }
    }
}
tryToStartServer()

app.on('ready', () => {

    ipcMain.on('reactIsReady', () => {
        //console.log('React Is Ready')
        win.webContents.send('message', 'React Is Ready')

        if (app.isPackaged) {
            win.webContents.send('message', 'App is packaged')

            autoUpdater.on('error', (err) => win.webContents.send('updater', err))
            autoUpdater.on('checking-for-update', () => win.webContents.send('updater', "checking-for-update"))
            autoUpdater.on('update-available', (info) => win.webContents.send('updater', 'update-available', info))
            autoUpdater.on('update-not-available', (info) => win.webContents.send('updater', 'update-not-available', info))
            autoUpdater.on('download-progress', (info) => win.webContents.send('updater', 'download-progress', info))
            autoUpdater.on('update-downloaded', (info) => win.webContents.send('updater', 'update-downloaded', info))

            ipcMain.on('installUpdate', () => autoUpdater.quitAndInstall())

            setTimeout(() => autoUpdater.checkForUpdates(), 3000);
            setInterval(() => autoUpdater.checkForUpdates(), 1000 * 60 * 60);
        }

    })

    createWindow()

    ipcMain.handle('setInterface', async(e, data) => {
        return new Promise(async(resolve, reject) => {
            let tempConfig = config
            tempConfig.interface = data
            saveConfig(tempConfig)

            const initServer = async() => {
                try {
                    const res = await setServer()
                    resolve(res)
                } catch (error) {
                    reject(error)
                }
            }

            if (server !== null) {
                server.close(async() => initServer())
            } else initServer()

        })
    })

    ipcMain.handle('getInterface', () => activeInterface)

    ipcMain.handle('getNetworkInterfaces', () => networkInterfaces())
    ipcMain.handle('setVenueAddress', (e, address) => {
        virtualVenueAddress = address
        return virtualVenueAddress
    })
    ipcMain.handle('setShowUniverses', (e, state) => {
        if (state) {
            sendUniverses()
            updateUniverses = true

        } else {
            stopSendingUniverses()
            updateUniverses = false

        }
        return updateUniverses
    })

    ipcMain.handle('getVenueIP', () => config.venueIP)

    let timer

    const sendUniverses = () => {
        timer = setInterval(() => win.webContents.send('universes', universes), 100)
    }

    const stopSendingUniverses = () => {
        clearInterval(timer);
    }

    ipcMain.handle('runSystem', async(e, address) => {
        return new Promise((resolve, reject) => {
            let tempConfig = config
            if (address !== tempConfig.venueIP) {
                tempConfig.venueIP = address
                saveConfig(tempConfig)
                tempConfig = config
            }
            sender = dgram.createSocket('udp4');
            sender.bind(6455, tempConfig.interface.address, () => {
                console.log('Sender Bound')
                outputData = true
                resolve('Bound')
            })

            sender.on('error', (err) => console.log(err))
        })
    })

    ipcMain.handle('stopSystem', async() => {
        outputData = false
        return new Promise((resolve, reject) => {
            sender.close(() => {
                sender = null
                resolve()
            });
        })

    })

    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })



})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    stopSendingUniverses()
    if (process.platform !== 'darwin') app.quit()
})