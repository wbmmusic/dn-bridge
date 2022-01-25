const dgram = require('dgram');
console.log('TOP OF CHILD');

let server = null
let sender = null
let outputData = false
let timer
let venueAddress = ''
const numberOfUniverses = 10

let universes = []
for (let i = 0; i < numberOfUniverses; i++) universes.push([])
let updateUniverses = false

const decodeArtNet = (data) => {
    const id = data.slice(0, 8).toString()
        //console.log("ID =", id)

    const opCode = (data[9] << 8) | data[8]
        //console.log('opCode =', opCode)

    const protVer = (data[10] << 8) | data[11]
        //console.log('protVer =', protVer)

    const sequence = data[12]
        //console.log("Sequence =", sequence)

    const physical = data[13]
        //console.log("Physical =", physical)

    const netSubUni = (data[15] << 8) | data[14]
        //console.log('netSubUni =', netSubUni)

    const dataLength = (data[16] << 8) | data[17]
        //console.log("Payload Length =", dataLength, "Channels")

    const payload = data.slice(18, 18 + dataLength)
        //console.log(payload.length)

    return { id, opCode, protVer, sequence, physical, netSubUni, payload }
}

const closeServer = async() => {
    return new Promise((resolve, reject) => {
        if (server === null) resolve()
        else server.close(() => {
            server = null
            resolve()
        })
    })
}

const setServer = async(config) => {
    return new Promise(async(resolve, reject) => {
        try {
            await closeServer()
        } catch (error) {
            console.log(error);
        }

        server = dgram.createSocket('udp4');
        server.bind(6454, config.interface.address, () => resolve(config.interface))
        server.on('error', async(err) => {
            console.log(`server error:\n${err.stack}`);
            await closeServer()
            reject(err)
        });

        server.on('message', (msg, rinfo) => {
            if (outputData) sender.send(msg, 6454, venueAddress)

            if (updateUniverses) {
                const message = decodeArtNet(msg)
                if (message.netSubUni >= numberOfUniverses) return
                universes[message.netSubUni] = message.payload
            }

        });

        server.on('listening', () => {
            const address = server.address();
            console.log(`server listening ${address.address}:${address.port}`);
        });
    })
}

const closeSender = async() => {
    return new Promise(async(resolve, reject) => {
        if (sender === null) {
            resolve('sender already closed')
        } else {
            outputData = false
            sender.close((err) => {
                if (err) {
                    console.log(err);
                    reject('err')
                }
                console.log('Closed Sender');
                sender = null
                venueAddress = ''
                resolve(false)
            })
        }
    })
}

const setSender = async(config) => {
    console.log("setting Sender", config.venueIP);
    return new Promise(async(resolve, reject) => {
        try {
            await closeSender()
        } catch (error) {
            console.log(error);
        }
        sender = dgram.createSocket('udp4');
        sender.bind(6455, config.interface.address, () => {
            console.log("Sender Bound", config.interface.address)
            venueAddress = config.venueIP
            outputData = true
            resolve(true)
        })
        sender.on('error', (err) => console.log(err))
    })
}



const sendUniverses = () => {
    timer = setInterval(() => process.send({ cmd: 'universes', universes }), 100)
}

const stopSendingUniverses = () => clearInterval(timer)

process.on('message', async(msg) => {

    switch (msg.cmd) {
        case 'start':
            try {
                const result = await setServer(msg.config)
                process.send({ cmd: 'startResult', result })
            } catch (error) {
                process.send({ cmd: 'startResult', error })
            }
            break;

        case 'sendUniverses':
            if (msg.value) {
                sendUniverses()
                updateUniverses = true
            } else {
                stopSendingUniverses()
                updateUniverses = false
            }
            break;

        case 'sendToVenue':
            if (msg.value) {
                const res = await setSender(msg.config)
                process.send({ cmd: 'sendToVenueResult', data: res })
            } else {
                const res = await closeSender()
                process.send({ cmd: 'sendToVenueResult', data: res })
            }
            break;

        default:
            break;
    }

})