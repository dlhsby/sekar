import { RuleTester } from '@typescript-eslint/rule-tester';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rule = require('./no-inline-hex-colors');

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const tester = new RuleTester();

tester.run('no-inline-hex-colors', rule, {
  valid: [
    { code: `const c = 'var(--color-nb-primary)';` },
    { code: `const c = nbColors.primary;` },
    { code: `const s = "no hex here";` },
    { code: `const t = \`template string with no hex\`;` },
  ],
  invalid: [
    {
      code: `const bad = '#FF0000';`,
      errors: [{ messageId: 'inlineHex' }],
    },
    {
      code: `const bad = '#1C1917';`,
      errors: [{ messageId: 'inlineHex' }],
    },
    {
      code: `const bad = \`color: #FF6B6B; background: white;\`;`,
      errors: [{ messageId: 'inlineHex' }],
    },
    {
      code: `const bad = '#abc';`,
      errors: [{ messageId: 'inlineHex' }],
    },
  ],
});
