const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    // We specifically don't want to use an ASAR archive because we need to
    // use one packaged executable (PHP) to run another packaged executable
    // (Composer), and although Electron will transparently extract the PHP
    // executable from the archive, it won't extract Composer, which causes
    // any Composer invocations to fail.
    asar: false,
    icon: 'icon',
    name: 'Launch Drupal CMS',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@rabbitholesyndrome/electron-forge-maker-portable',
    },
    {
      name: '@electron-forge/maker-dmg',
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
