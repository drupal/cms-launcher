const packagerConfig = {
  icon: 'icon',
};

module.exports = {
  packagerConfig,
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        background: 'dmg-background.png',
        icon: 'icon.icns'
      }
    },
  ],
};
