const { FusesPlugin } = require( '@electron-forge/plugin-fuses' );
const { FuseV1Options, FuseVersion } = require( '@electron/fuses' );
const {
  APPLE_ID,
  APP_PASSWORD,
  APPLE_TEAM_ID,
  SIGN,
} = process.env;

const packagerConfig = {
  // We specifically don't want to use an ASAR archive because we need to use
  // one packaged executable (PHP) to run another packaged executable
  // (Composer), and although Electron will transparently extract the PHP
  // executable from the archive, it won't extract Composer, which causes any
  // Composer invocations to fail.
  asar: false,
  icon: 'icon',
  name: 'Launch Drupal CMS',
};

if ( APPLE_ID && APP_PASSWORD && APPLE_TEAM_ID && SIGN ) {
  packagerConfig.osxNotarize = {
    appleId: APPLE_ID,
    appleIdPassword: APP_PASSWORD,
    teamId: APPLE_TEAM_ID,
  };
  packagerConfig.osxSign = {};
} else if ( process.platform === 'darwin' ) {
  console.warn( 'Skipping macOS signing and notarization.' );
}

module.exports = {
  packagerConfig,
  rebuildConfig: {},
  makers: [
    {
      name: '@rabbitholesyndrome/electron-forge-maker-portable',
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        background: 'background.png',
        icon: 'icon.icns'
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    // {
    //   name: '@electron-forge/plugin-auto-unpack-natives',
    //   config: {},
    // },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};
