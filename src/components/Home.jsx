import React, { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import Select from 'react-select'
import Universes from './Universes'

export default function Home() {
    const [ifaces, setIfaces] = useState({})
    const [currentInterface, setcurrentInterface] = useState(null)
    const [state, setstate] = useState({
        running: false,
        address: '',
        showUniverses: false
    })

    useEffect(() => {
        window.electron.ipcRenderer.invoke('getNetworkInterfaces')
            .then(res => setIfaces(res))
            .catch(err => console.error(err))

        window.electron.ipcRenderer.invoke('getVenueIP')
            .then(res => setstate(old => ({ ...old, address: res })))
            .catch(err => console.error(err))

        window.electron.ipcRenderer.invoke('getInterface')
            .then(res => setcurrentInterface(res))
            .catch(err => console.error(err))

    }, [])

    const makeRunStop = () => {
        if (state.running) {
            return (
                <Button
                    style={{ whiteSpace: 'nowrap' }}
                    size="sm"
                    variant="danger"
                    onClick={() => {
                        window.electron.ipcRenderer.invoke('stopSystem')
                            .then(res => {
                                setstate(old => ({ ...old, running: false }))
                            })
                            .catch(err => console.error(err))
                    }}
                >Mute Output</Button>
            )
        } else {
            return (
                <Button
                    style={{ whiteSpace: 'nowrap' }}
                    disabled={!ipIsValid(state.address)}
                    size="sm"
                    variant="warning"
                    onClick={() => {
                        window.electron.ipcRenderer.invoke('runSystem', state.address)
                            .then(res => {
                                setstate(old => ({ ...old, running: true }))
                            })
                            .catch(err => console.error(err))
                    }}
                >Enable Output</Button>
            )
        }
    }

    const makeUniversesButton = () => {
        if (state.showUniverses) {
            return (
                <Button
                    size="sm"
                    style={{ marginLeft: '10px' }}
                    onClick={() => {
                        window.electron.ipcRenderer.invoke('setShowUniverses', false)
                            .then(res => setstate(old => ({ ...old, showUniverses: res })))
                            .catch(err => console.error(err))
                    }}
                >Hide Universes</Button>
            )
        } else {
            return (
                <Button
                    size="sm"
                    style={{ marginLeft: '10px' }}
                    onClick={() => {
                        window.electron.ipcRenderer.invoke('setShowUniverses', true)
                            .then(res => setstate(old => ({ ...old, showUniverses: res })))
                            .catch(err => console.error(err))
                    }}
                >Show Universes</Button>
            )
        }

    }

    const makeUniverses = () => {
        if (state.showUniverses) return <Universes />
    }

    const makeIfaceOptions = () => {
        let out = []
        const keys = Object.keys(ifaces)

        if (keys.length > 0) {
            keys.forEach(key => {
                let v4s = ifaces[key].filter(int => int.family === 'IPv4')
                v4s.forEach(v4 => out.push({ label: `${key} --- ${v4.address}`, value: { name: key, address: v4.address } }))
            })

        }
        return out
    }

    const setInterface = (data) => {
        window.electron.ipcRenderer.invoke('setInterface', data.value)
            .then(res => setcurrentInterface(res))
            .catch(err => console.error(err))
    }

    const handleVenueAddress = (e) => {
        let newName = e.target.value
        if (newName.length > 15) newName = newName.substring(0, 15)
        newName = newName.replaceAll(/[^0-9.]/g, '')
        let octets = newName.split('.')
        console.log(octets)
        for (let i = 0; i < octets.length; i++) {
            if (parseInt(octets[i]) > 255) octets[i] = '255'
        }
        console.log(octets)
        let out = ''

        switch (octets.length) {
            case 1:
                out = octets[0]
                break;

            case 2:
                out = octets[0] + '.' + octets[1]
                break;

            case 3:
                out = octets[0] + '.' + octets[1] + '.' + octets[2]
                break;

            case 4:
                out = octets[0] + '.' + octets[1] + '.' + octets[2] + '.' + octets[3]
                break;

            default:
                break;
        }

        setstate(old => ({ ...old, address: out }))
    }

    const ipIsValid = (address) => {
        const octets = address.split('.')
        if (octets.length !== 4) return false
        console.log(octets)
        for (let i = 0; i < octets.length; i++) {
            if (octets[i].length === 0) return false
            if (parseInt(octets[i]) > 255 || parseInt(octets[i]) < 0) return false
        }
        return true
    }

    const makeIfaceValue = () => {
        if (currentInterface === null) return null
        else {
            console.log("IN ELSE")
            return { label: `${currentInterface.name} --- ${currentInterface.address}`, value: { name: currentInterface.name, address: currentInterface.address } }
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid lightGrey', paddingTop: '8px' }}>
                <div style={{ marginLeft: '8px' }}><b>Interface:</b></div>
                <div style={{ width: '100%', marginLeft: '8px' }}>
                    <Select
                        styles={selectStyle}
                        options={makeIfaceOptions()}
                        onChange={setInterface}
                        value={makeIfaceValue()}
                    />
                </div>
                <div style={{ marginLeft: '16px', whiteSpace: 'nowrap' }}>
                    <b>Venue Address:</b>
                </div>
                <input
                    style={{ width: '130px', marginLeft: '8px' }}
                    placeholder="xxx.xxx.xxx.xxx"
                    maxLength={15}
                    type="text"
                    value={state.address}
                    onChange={handleVenueAddress}
                />
                <div style={{ padding: '0px 8px' }}>
                    {makeRunStop()}
                </div>
            </div>
            <div style={{ marginTop: '10px' }}>
                {makeUniversesButton()}
                <hr />
                {makeUniverses()}
            </div>
        </div>
    )
}

const selectStyle = {
    control: base => ({
        ...base,
        fontSize: '12px',
        minHeight: '15px'
    }),
    menu: base => ({
        ...base,
        fontSize: '12px'
    }),
    dropdownIndicator: base => ({
        ...base,
        padding: '0px 8px'
    }),
    valueContainer: base => ({
        ...base,
        padding: '0px 8px'
    })
}