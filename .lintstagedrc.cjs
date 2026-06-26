/**
 * Monorepo lint-staged config. Each workspace is independent (own eslint flat
 * config + node_modules), so we cd into the workspace and run ITS eslint on the
 * staged files (paths made workspace-relative). eslint --fix; lint-staged
 * re-stages fixed files automatically.
 */
const path = require('path');

const eslintIn = (ws) => (files) => {
  const rel = files.map((f) => JSON.stringify(path.relative(path.resolve(ws), f)));
  return `bash -c 'cd ${ws} && npx eslint --fix ${rel.join(' ')}'`;
};

module.exports = {
  'be/**/*.ts': eslintIn('be'),
  'fe/web/**/*.{ts,tsx}': eslintIn('fe/web'),
  'fe/mobile/**/*.{ts,tsx}': eslintIn('fe/mobile'),
};
