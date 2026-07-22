const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Never crawl/watch native build output. Gradle creates and deletes these
    // directories constantly, and with no watchman installed Metro falls back to
    // FallbackWatcher, which hard-crashes with
    //   ENOENT: no such file or directory, watch '.../android/.cxx/...'
    // when a directory disappears between enumeration and watch — i.e. any time a
    // native build runs while Metro is up. None of this is JS that Metro needs.
    // A plain RegExp on purpose: metro-config's `exclusionList` helper lives at a
    // private path that has moved between Metro versions, so importing it makes
    // this config break on upgrade. blockList accepts a RegExp directly.
    blockList:
      /.*\/(android\/(\.cxx|\.gradle|build|app\/build)|ios\/(build|Pods))\/.*/,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
