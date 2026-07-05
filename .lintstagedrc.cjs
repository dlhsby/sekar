/**
 * Monorepo lint-staged config. Each workspace is independent (own eslint flat
 * config + node_modules), so we cd into the workspace and run ITS eslint on the
 * staged files (paths made workspace-relative). eslint --fix; lint-staged
 * re-stages fixed files automatically.
 *
 * We invoke the workspace's OWN eslint binary directly (node_modules/.bin/eslint)
 * rather than `npx eslint`: `npx` can walk up and resolve the repo-root hoisted
 * eslint (a different major), which then fails to load a workspace's flat config
 * (e.g. apps/web pins eslint 9 whose `eslint/config` export the root's eslint 10
 * can't provide). The direct binary is deterministic and faster.
 */
const path = require('path');

const eslintIn = (ws) => (files) => {
  const rel = files.map((f) => JSON.stringify(path.relative(path.resolve(ws), f)));
  // Note: run from inside `ws` so the local flat config + plugins resolve; use
  // the local binary and fail loudly (with the fix) if the workspace isn't installed.
  return (
    `bash -c 'cd ${ws} && ` +
    `if [ ! -x node_modules/.bin/eslint ]; then ` +
    `echo "✖ eslint not installed in ${ws} — run: (cd ${ws} && npm ci)" >&2; exit 1; fi && ` +
    `node_modules/.bin/eslint --fix ${rel.join(' ')}'`
  );
};

module.exports = {
  'apps/be/**/*.ts': eslintIn('apps/be'),
  'apps/web/**/*.{ts,tsx}': eslintIn('apps/web'),
  'apps/mobile/**/*.{ts,tsx}': eslintIn('apps/mobile'),
};
