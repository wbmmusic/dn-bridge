import React from 'react'

export default function Universe({ data }) {
    return (
        <div style={{ display: 'flex', borderRight: '1px solid black', flexDirection: 'row' }}>
            {
                data.map((ch, i) => (
                    <div key={'uniCh' + i} style={{ height: '64px', flexGrow: '1', position: 'relative' }}>
                        <div style={{ height: `${ch * 100 / 255}%`, backgroundColor: 'blue', width: '100%', bottom: '0px', position: 'absolute' }} />
                    </div>
                ))
            }
        </div>
    )
}
