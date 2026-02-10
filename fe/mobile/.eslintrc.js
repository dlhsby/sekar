module.exports = {
  root: true,
  extends: '@react-native',
  plugins: ['react-hooks'],
  env: {
    jest: true,
  },
  globals: {
    jest: true,
    beforeEach: true,
    afterEach: true,
    beforeAll: true,
    afterAll: true,
    describe: true,
    it: true,
    expect: true,
    test: true,
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
