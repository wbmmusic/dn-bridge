import React, { useEffect, useState } from 'react'
import Universe from './Universe'

export default function Universes() {
    const [universes, setUniverses] = useState([])

    useEffect(() => {
        window.electron.receive('universes', (data) => {
            setUniverses(data)
            console.log(data)
        })
        return () => {
            window.electron.removeListener('universes')
        }
    }, [])

    const makeUniverses = () => (
        universes.map((universe, i) => {
            if (universe.length > 0) {
                return (
                    <div style={{ marginBottom: '5px', display: 'flex' }}>
                        <div
                            style={{
                                fontSize: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px',
                                background: 'silver',
                                borderRight: '4px solid black'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column'}}>
                                <div style={{textAlign: 'center'}}>{i}</div>
                                <div style={{textAlign: 'center'}}>{"x" + i.toString(16)}</div>
                            </div>
                        </div>
                        <div style={{ backgroundColor: 'lightGrey', width: '100%' }}>
                            <Universe data={universe} />
                        </div>
                    </div>
                )
            }
        })
    )

    return (
        <div>
            {makeUniverses()}
        </div>
    )
}
