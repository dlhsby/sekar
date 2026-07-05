module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        // Local dev uses .env.local (standardised across all workspaces).
        // Per-build overrides point this at .env.staging / .env.production via the
        // ENVFILE var, e.g. `ENVFILE=.env.staging npm run android`. Values are
        // inlined at bundle time, so always pair a switch with `--reset-cache`.
        path: process.env.ENVFILE || '.env.local',
      },
    ],
    // Reanimated 4 moved its Babel plugin into react-native-worklets. It MUST be
    // the last plugin in the list. (The old 'react-native-reanimated/plugin'
    // path is deprecated under reanimated 4.)
    'react-native-worklets/plugin',
  ],
  env: {
    production: {
      // Strip console.* from release bundles. error/warn are kept — the app
      // logger and crash-reporting breadcrumbs still rely on them.
      plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]],
    },
  },
};
