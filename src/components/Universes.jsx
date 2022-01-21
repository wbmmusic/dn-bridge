import React, { useEffect, useState } from 'react'
import Universe from './Universe'

export default function Universes() {
    const [universes, setUniverses] = useState([])

    useEffect(() => {
        window.electron.receive('universes', (data) => setUniverses(data))
        return () => window.electron.removeListener('universes')
    }, [])

    const makeHex = (num) => {
        let hex = num.toString(16)
        if (hex.length === 1) return `0:${hex}`
        if (hex.length === 2) return `${hex.charAt(0)}:${hex.charAt(1)}`
    }

    const makeUniverses = () => (
        universes.map((universe, i) => {
            if (universe.length > 0) {
                return (
                    <div key={'universe' + i} style={{ marginBottom: '10px', display: 'flex' }}>
                        <div style={{ backgroundColor: 'lightGrey', width: '100%' }}>
                            <Universe data={universe} />
                            <div>
                                <div
                                    style={{
                                        textAlign: 'center',
                                        borderTop: '1px solid black',
                                        borderBottom: '1px solid black',
                                        fontSize: '12px'
                                    }}
                                >{`U ${i} / ${makeHex(i)}`}</div>
                            </div>
                        </div>
                    </div>
                )
            } else return <div />
        })
    )

    return (
        <div>
            {makeUniverses()}
        </div>
    )
}
