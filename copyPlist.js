const { copyFileSync } = require('fs')
const { join } = require('path')

copyFileSync(join(__dirname, 'entitlements.mac.plist'), join(__dirname, 'build', 'entitlements.mac.plist'))