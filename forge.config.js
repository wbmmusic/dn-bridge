const { MakerSquirrel } = require('@electron-forge/maker-squirrel');
const { MakerZIP } = require('@electron-forge/maker-zip');
const { MakerDeb } = require('@electron-forge/maker-deb');
const { MakerRpm } = require('@electron-forge/maker-rpm');
const { MakerDMG } = require('@electron-forge/maker-dmg');
const { PublisherGithub } = require('@electron-forge/publisher-github');
const { VitePlugin } = require('@electron-forge/plugin-vite');

module.exports = {
  packagerConfig: {
    name: 'DN bridge',
    executableName: 'dn-bridge',
    appBundleId: 'com.wbm.dnbridge',
    appCopyright: 'WBM Tek',
    icon: './public/icon',
    extraResource: [
      './public/artNet.js'
    ],
    asar: true,
    osxSign: {
      identity: 'Developer ID Application: WBM Tek'
    },
    osxNotarize: {
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.DNBRIDGEAPPLEIDPASS,
      teamId: process.env.APPLE_TEAM_ID
    },
    win32metadata: {
      CompanyName: 'WBM Tek',
      FileDescription: 'ArtNet Bridge',
      ProductName: 'DN bridge',
      InternalName: 'DN bridge',
      OriginalFilename: 'dn-bridge.exe'
    }
  },
  rebuildConfig: {
    force: true,
  },
  makers: [
    new MakerSquirrel({
      name: 'dn-bridge',
      setupExe: 'DN-Bridge-Setup.exe',
      setupIcon: './public/icon.ico',
      signWithParams: '/sha1 b281b2c2413406e54ac73f3f3b204121b4a66e64 /fd sha256 /tr http://timestamp.sectigo.com /td sha256'
    }),
    new MakerZIP({}, ['darwin']),
    new MakerDMG({
      name: 'DN bridge',
      icon: './public/icon.icns'
    }),
    new MakerDeb({
      options: {
        name: 'dn-bridge',
        productName: 'DN bridge',
        genericName: 'ArtNet Bridge',
        description: 'ArtNet Bridge',
        categories: ['AudioVideo'],
        maintainer: 'WBM Tek',
        homepage: 'https://www.wbmtek.com'
      }
    }),
    new MakerRpm({
      options: {
        name: 'dn-bridge',
        productName: 'DN bridge',
        genericName: 'ArtNet Bridge',
        description: 'ArtNet Bridge',
        categories: ['AudioVideo']
      }
    })
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'public/main.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'public/preload.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'wbmmusic',
        name: 'dn-bridge'
      },
      prerelease: false,
      draft: true
    })
  ]
};