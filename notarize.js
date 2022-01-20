const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName !== 'darwin') return;

    console.log("Attempting to Notarize - this could take some time");

    const appName = context.packager.appInfo.productFilename;

    return await notarize({
        appBundleId: 'com.wbm.dnbridge',
        appPath: `${appOutDir}/${appName}.app`,
        appleId: process.env.APPLEID,
        appleIdPassword: process.env.DNBRIDGEAPPLEIDPASS,
    });
};