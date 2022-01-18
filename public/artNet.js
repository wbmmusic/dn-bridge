exports.decodeArtNet = (data) => {
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