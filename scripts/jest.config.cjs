/** Jest config for repo-root scripts (token generator + ESLint rule unit tests). */
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/scripts/**/*.test.ts',
    '<rootDir>/tools/eslint-plugin-sekar-design/**/*.test.ts',
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/scripts/tsconfig.json',
        diagnostics: false,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/apps/be/', '/apps/web/', '/apps/mobile/'],
};
