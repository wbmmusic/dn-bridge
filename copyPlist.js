const { cpSync } = require('fs')
const { join } = require('path')

cpSync(join(__dirname, 'entitlements.mac.plist'), join(__dirname, 'build', 'entitlements.mac.plist'), { recursive: true })