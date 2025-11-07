const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({

  name: 'shell-app',

  exposes: {
    './Component': './src/app/app.ts',
    './Header': './src/app/components/header/header.ts',
  },

  remotes: {
    'remote-app': 'http://localhost:4201/remoteEntry.js',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

});
