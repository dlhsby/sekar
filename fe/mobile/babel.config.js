module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        // Local dev uses .env.local (standardised across all workspaces).
        // Per-build overrides can point this at .env.staging / .env.production.
        path: '.env.local',
      },
    ],
    'react-native-reanimated/plugin',
  ],
  env: {
    production: {
      // Strip console.* from release bundles. error/warn are kept — the app
      // logger and crash-reporting breadcrumbs still rely on them.
      plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]],
    },
  },
};
