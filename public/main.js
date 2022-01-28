const { app, BrowserWindow, ipcMain } = require('electron')
const { join } = require('path')
const URL = require('url')
const { autoUpdater } = require('electron-updater');
const { networkInterfaces } = require('os')
const { existsSync, writeFileSync, readFileSync } = require('fs');
const { fork } = require('child_process');
const { EventEmitter } = require('events');
const myEmitter = new EventEmitter();

let win
let activeInterface = null

const pathToConfigFile = (join(app.getPath('userData'), 'config.json'))
let config = {}
const defaultConfig = { venueIP: '', interface: { name: '', address: '' } }

const saveConfig = (data) => {
    writeFileSync(pathToConfigFile, JSON.stringify(data, null, '\t'))
    config = JSON.parse(readFileSync(pathToConfigFile))
}

if (!existsSync(pathToConfigFile)) {
    saveConfig(defaultConfig)
    console.log("Created Config File")
} else config = JSON.parse(readFileSync(pathToConfigFile))


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


const artNet = fork(join(__dirname, 'artNet.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })
artNet.stdout.pipe(process.stdout)
artNet.stderr.pipe(process.stdout)

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

    win.loadURL(startUrl);

    // Emitted when the window is closed.
    win.on('closed', () => app.quit())
    win.on('ready-to-show', () => win.show())
}

app.on('ready', () => {

    artNet.on('message', (msg) => {
        switch (msg.cmd) {
            case 'universes':
                let out = []
                msg.universes.forEach(element => out.push(element.data || []));
                try {
                    win.webContents.send('universes', out)
                } catch (error) {

                }
                break;

            case 'startResult':
                if (msg.error) {
                    console.log('start error', msg.error);
                    myEmitter.emit('startResult', msg)
                } else myEmitter.emit('startResult', msg)
                break;

            case 'sendToVenueResult':
                if (msg.error) {
                    console.log('start error', msg.error);
                    myEmitter.emit('sendToVenueResult', msg)
                } else myEmitter.emit('sendToVenueResult', msg)
                break;

            default:
                break;
        }
    });
    artNet.on('error', (err) => { console.log(err); })
    artNet.on('close', (err, msg) => { console.log(err, msg); })

    const startUDP = async() => {
        console.log("IN START UDP");
        return new Promise(async(resolve, reject) => {
            const handleResult = (msg) => {
                myEmitter.removeListener('startResult', handleResult)
                if (msg.error) reject(msg.error)
                resolve(msg.result)
            }

            setTimeout(() => {
                myEmitter.removeListener('startResult', handleResult)
                reject('start UDP timed out')
            }, 5000);

            myEmitter.on('startResult', handleResult)

            artNet.send({ cmd: 'start', config })
        })
    }

    const runServer = async() => {
        try {
            const result = await startUDP()
            activeInterface = result
            console.log('Run Server Result', result);
        } catch (error) {
            throw error
        }
    }

    if (networkInterfaces()[config.interface.name] !== undefined) {
        const theIface = networkInterfaces()[config.interface.name].find(ifa => ifa.address === config.interface.address)
        if (theIface !== undefined) runServer()
    }

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

    ipcMain.handle('getInterface', () => activeInterface)
    ipcMain.handle('getNetworkInterfaces', () => networkInterfaces())
    ipcMain.handle('getVenueIP', () => config.venueIP)
    ipcMain.handle('setInterface', async(e, data) => {
        return new Promise(async(resolve, reject) => {
            let tempConfig = config
            tempConfig.interface = data
            saveConfig(tempConfig)
            try {
                const result = await startUDP()
                console.log('Result in setInterface', result);
                activeInterface = result
                resolve(activeInterface)
            } catch (error) {
                reject(error)
            }
        })

    })

    ipcMain.handle('setShowUniverses', (e, state) => {
        if (state) {
            artNet.send({ cmd: 'sendUniverses', value: true })
            return true
        } else {
            artNet.send({ cmd: 'sendUniverses', value: false })
            return false
        }
    })

    const sendToVenue = async(yesNo, address) => {
        console.log("Send To Venue", yesNo, address);
        return new Promise(async(resolve, reject) => {
            if (yesNo) {
                let tempConfig = config
                tempConfig.venueIP = address
                saveConfig(tempConfig)
            }

            const handleSendToVenueResult = (msg) => {
                console.log("MESSAGE HERE", msg);
                myEmitter.removeListener('sendToVenueResult', handleSendToVenueResult)
                resolve(msg.data)
            }

            setTimeout(() => {
                myEmitter.removeListener('sendToVenueResult', handleSendToVenueResult)
                reject('sendToVenue Timed Out')
            }, 1000);

            myEmitter.on('sendToVenueResult', handleSendToVenueResult)

            artNet.send({ cmd: 'sendToVenue', value: yesNo, config })
        })
    }

    ipcMain.handle('runSystem', async(e, address) => await sendToVenue(true, address))
    ipcMain.handle('stopSystem', async() => await sendToVenue(false))

    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

})

app.on('will-quit', () => artNet.kill('SIGKILL'))

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})