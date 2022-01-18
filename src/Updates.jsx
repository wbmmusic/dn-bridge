import React, { Fragment, useEffect, useState } from 'react'
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import CloseIcon from '@mui/icons-material/Close';
import Button from "@mui/material/Button";

export default function Updates() {
    const defaultDownloadSnack = { show: false, progress: 0 }
    const defaultInstallSnack = { show: false, version: 'x.x.x' }
    const [downloadSnack, setDownloadSnack] = useState(defaultDownloadSnack)
    const [installSnack, setInstallSnack] = useState(defaultInstallSnack)

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') return
        setDownloadSnack({ show: false });
    };

    const install = () => window.electron.send('installUpdate')

    const closeInstallSnack = () => setInstallSnack(old => ({ ...old, show: false }))

    const action = (
        <Fragment>
            <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleClose}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </Fragment>
    );

    const installAction = (
        <Fragment>
            <Button size="sm" color='error' onClick={() => install()}>Relaunch App</Button>
            <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={closeInstallSnack}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </Fragment>
    );

    useEffect(() => {
        window.electron.send('reactIsReady')
        window.electron.receive('updater', (a, b) => {
            if (a === 'checking-for-update') console.log("Checking For Update")
            else if (a === 'update-not-available') console.log("Up to date: v" + b.version)
            else if (a === 'update-available') setDownloadSnack(old => ({ show: true, progress: 0 }))
            else if (a === 'download-progress') {
                console.log("Downloading", Math.round(b.percent) + "%")
                setDownloadSnack(old => ({ ...old, progress: Math.round(b.percent) }))
            }
            else if (a === 'update-downloaded') {
                console.log("Downloaded", b)
                setDownloadSnack(defaultDownloadSnack)
                setInstallSnack({ show: true, version: b.tag })
            }
            else if (a === 'error') console.log("Update Error", b)
            else console.log(a, b)
        })

        return () => window.electron.removeListener('updater')
    }, [])

    return (
        <div>
            <Snackbar
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                open={downloadSnack.show}
                autoHideDuration={30000}
                onClose={handleClose}
                message={`Downloading Update ${downloadSnack.progress}%`}
                action={action}
            />
            <Snackbar
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                open={installSnack.show}
                autoHideDuration={30000}
                onClose={handleClose}
                message={`Relaunch to install ${installSnack.version}`}
                action={installAction}
            />
        </div>
    )
}
